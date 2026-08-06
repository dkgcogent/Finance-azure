import { Request, Response } from 'express';
import { db as pool } from '../../../config/database';
import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';
dotenv.config();

const getBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('Azure Storage Connection string not found');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
};
const generateVendorInvoiceNumber = async (): Promise<string> => {
  const fy = '26-27'; 
  const [rows]: any = await pool.query(
    `SELECT vendor_invoice_number FROM vendor_invoices 
     ORDER BY id DESC LIMIT 1`
  );

  let nextSequence = 1;
  if (rows.length > 0) {
    const lastInvoiceNum = rows[0].vendor_invoice_number;
    const parts = lastInvoiceNum.split('/');
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(3, '0');
  return `VN/${fy}/${paddedSequence}`;
};

export const getVendors = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT VendorID as id, VendorName as name, TypeOfCompany as type
      FROM vendor 
      WHERE Status = 'active' OR Status = 'Active' OR Status IS NULL
      ORDER BY VendorName ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const getVendorTrips = async (req: Request, res: Response) => {
  try {
    const { vendorName, startDate, endDate, tripType } = req.query;

    if (!vendorName || !startDate || !endDate) {
      return res.status(400).json({ error: 'vendorName, startDate, and endDate are required' });
    }

    // First get the vendor details
    const [vendorRows]: any = await pool.query(
      'SELECT VendorName, VendorAddress, AccountHolderName, AccountNumber, IFSCCode, BankName, BranchName FROM vendor WHERE VendorID = ?', 
      [vendorName]
    );
    if (vendorRows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    const vendorInfo = vendorRows[0];
    const actualVendorName = vendorInfo.VendorName;

    // Fetch commercial rates
    const placementType = tripType === 'adhoc' ? 'Adhoc' : 'Fixed';
    const [commercialRows]: any = await pool.query(
      'SELECT * FROM vendor_commercial WHERE vendor_name = ? AND type_of_vehicle_placement = ? LIMIT 1',
      [actualVendorName, placementType]
    );
    const commercialRates = commercialRows.length > 0 ? commercialRows[0] : null;

    if (tripType === 'adhoc') {
      // Fetch all trips for this vendor in the date range
      const [trips]: any = await pool.query(`
        SELECT 
          Location, CustomerSite, VendorName, VehicleNumber, VehicleType, VehicleOwnershipType, TripType, DriverType, 
          ArrivalTimeAtHub, OutTimeFromHub, OpeningKM, ClosingKM, ExtraKM, ExtraKMCost, VFreightFix, DCMCharges, TotalFreight 
        FROM adhoc_transactions 
        WHERE VendorName = ? 
        AND TransactionDate >= ? AND TransactionDate <= ?
      `, [actualVendorName, startDate, endDate]);

      // Calculate Annexure Data
      const annexureData = trips.map((t: any, index: number) => {
        return {
          id: index + 1,
          location: t.Location || t.CustomerSite || '',
          vendor: t.VendorName || '',
          vehicleNumber: t.VehicleNumber || '',
          vehicleType: t.VehicleType || '',
          vehicleOwnership: t.VehicleOwnershipType || 'Adhoc',
          tripType: t.TripType || 'Adhoc',
          driverType: t.DriverType || '',
          inTime: t.ArrivalTimeAtHub || '',
          outTime: t.OutTimeFromHub || '',
          startOdometer: t.OpeningKM || 0,
          endOdometer: t.ClosingKM || 0,
          distance: (t.ClosingKM || 0) - (t.OpeningKM || 0),
          extraKm: t.ExtraKM || 0,
          extraKmRate: t.ExtraKM && t.ExtraKMCost ? (t.ExtraKMCost / t.ExtraKM).toFixed(2) : 0,
          fixCost: t.VFreightFix || 0
        };
      });

      // Calculate MIS Data
      const misGroups: any = {};
      trips.forEach((t: any) => {
        const loc = t.Location || t.CustomerSite || 'Unknown';
        if (!misGroups[loc]) {
          misGroups[loc] = {
            location: loc,
            noOfTrips: 0,
            rates: t.VFreightFix || (commercialRates?.fixed_rate ? parseFloat(commercialRates.fixed_rate) : 0),
            extraKm: 0,
            extraKmRate: 0,
            extraHrsRate: commercialRates?.over_time_charges ? parseFloat(commercialRates.over_time_charges) : 63,
            fixedCost: 0,
            extraKmCost: 0,
            dcmCharges: 0,
            totalAmount: 0
          };
        }
        
        misGroups[loc].noOfTrips += 1;
        misGroups[loc].rates = Math.max(misGroups[loc].rates, t.VFreightFix || (commercialRates?.fixed_rate ? parseFloat(commercialRates.fixed_rate) : 0));
        misGroups[loc].extraKm += (t.ExtraKM || 0);
        misGroups[loc].extraKmRate = t.ExtraKM && t.ExtraKMCost ? Math.max(misGroups[loc].extraKmRate, (t.ExtraKMCost / t.ExtraKM)) : misGroups[loc].extraKmRate;
        misGroups[loc].dcmCharges += (t.DCMCharges || 0);
      });
      
      const misData = Object.values(misGroups).map((m: any, idx: number) => {
        const fixedCost = m.rates * m.noOfTrips;
        const extraKmCost = m.extraKmRate * m.extraKm;
        const totalAmount = m.dcmCharges + extraKmCost + fixedCost;

        return {
          id: idx + 1,
          ...m,
          fixedCost,
          extraKmCost,
          totalAmount,
          extraKmRate: Number(m.extraKmRate).toFixed(2)
        };
      });

      res.json({
        misData,
        annexureData
      });
    } else if (tripType === 'fixed') {
      // Fetch all trips for this vendor in the date range
      const [trips]: any = await pool.query(`
        SELECT 
          TransactionDate, Location, CustomerSite, VendorName, VehicleNumber, VehicleType, TripType, 
          'Driver' as DriverType,
          COALESCE(ArrivalTimeAtHub, InTimeByCust, VehicleEntryInHub, VehicleReportingAtHub) as ArrivalTimeAtHub, 
          COALESCE(OutTimeFromHub, VehicleReturnAtHub, ReturnReportingTime, OutTimeFrom) as OutTimeFromHub, 
          OpeningKM, ClosingKM, VFreightFix, TotalFreight, TollExpenses, ParkingCharges
        FROM fixed_transactions 
        WHERE VendorName = ? 
        AND TransactionDate >= ? AND TransactionDate <= ?
      `, [actualVendorName, startDate, endDate]);

      // Calculate Annexure Data (Detailed Logs)
      const annexureData = trips.map((t: any, index: number) => {
        return {
          id: index + 1,
          date: t.TransactionDate ? new Date(t.TransactionDate).toLocaleDateString('en-GB') : '',
          hub: t.CustomerSite || '',
          loc: t.Location || t.CustomerSite || '',
          vendor: t.VendorName || '',
          vehNo: t.VehicleNumber || '',
          vehType: t.VehicleType || '',
          parentVeh: t.VehicleNumber || '',
          ownType: 'Fixed',
          driverType: t.DriverType || '',
          inTime: t.ArrivalTimeAtHub || '',
          outTime: t.OutTimeFromHub || '',
          startOdo: t.OpeningKM || 0,
          endOdo: t.ClosingKM || 0,
          dist: (t.ClosingKM || 0) - (t.OpeningKM || 0)
        };
      });

      // Calculate MIS Data (Summary)
      // Grouping by Vehicle Number for Fixed MIS
      const misGroups: any = {};
      trips.forEach((t: any) => {
        const veh = t.VehicleNumber || 'Unknown';
        if (!misGroups[veh]) {
          const agRate = commercialRates?.fixed_rate ? parseFloat(commercialRates.fixed_rate) : 34650;
          const fixedKms = commercialRates?.km_include_in_fix_rate ? parseFloat(commercialRates.km_include_in_fix_rate) : 1000;
          const workDays = commercialRates?.no_of_days_per_month ? parseFloat(commercialRates.no_of_days_per_month) : 30;
          const extKmRate = commercialRates?.additional_rate_per_km ? parseFloat(commercialRates.additional_rate_per_km) : 7.25;
          const dynFuel = 0.50;

          misGroups[veh] = {
            vehNo: veh,
            vehType: t.VehicleType || '',
            mode: 'UP Large LM',
            loc: t.Location || t.CustomerSite || '',
            vertical: 'LM',
            hrs: commercialRates?.hours ? parseFloat(commercialRates.hours) : 12,
            fixedKms: fixedKms,
            agRate: agRate,
            dieselHike: 0,
            totWithHike: agRate,
            workDays: workDays,
            actualDays: 0,
            totKms: 0,
            extHrAmt: commercialRates?.over_time_charges ? parseFloat(commercialRates.over_time_charges) : 60,
            extHr: 0,
            extHrRate: 0,
            extKmRate: extKmRate,
            dynFuel: dynFuel,
            totExtKmRate: extKmRate + dynFuel,
            perDayCost: agRate / (workDays || 30),
            perDayKm: fixedKms / (workDays || 30),
            actualDeployed: 0,
            extKm: 0,
            extKmCharge: 0,
            totalAmt: 0,
            toll: 0,
            dcm: 0,
            finalAmt: 0
          };
        }
        
        misGroups[veh].actualDays += 1;
        misGroups[veh].actualDeployed += 1;
        misGroups[veh].totKms += ((Number(t.ClosingKM) || 0) - (Number(t.OpeningKM) || 0));
        misGroups[veh].extKm += (Number(t.ExtraKM) || 0);
        misGroups[veh].extKmCharge += (Number(t.ExtraKMCost) || 0);
        misGroups[veh].toll += ((Number(t.TollExpenses) || 0) + (Number(t.ParkingCharges) || 0));
        misGroups[veh].dcm += (Number(t.DCMCharges) || 0);
        
      });
      
      const misData = Object.values(misGroups).map((m: any, idx: number) => {
        const extKm = Math.max(0, m.totKms - (m.actualDays * m.perDayKm));
        const extKmCharge = extKm * m.totExtKmRate;
        const actualDeployed = m.perDayCost * m.actualDays;
        const totalAmt = extKmCharge + actualDeployed;
        const extHrCharges = m.extHr * m.extHrAmt;
        const finalAmt = extHrCharges + m.dcm + m.toll + totalAmt;

        return {
          id: idx + 1,
          ...m,
          extKm: Number(extKm).toFixed(2),
          extKmCharge: Number(extKmCharge).toFixed(2),
          actualDeployed: Number(actualDeployed).toFixed(2),
          totalAmt: Number(totalAmt).toFixed(2),
          finalAmt: Number(finalAmt).toFixed(2)
        };
      });

      res.json({
        misData,
        annexureData,
        vendorInfo
      });
    } else {
      res.json({ misData: [], annexureData: [], vendorInfo });
    }
  } catch (error) {
    console.error('Error fetching vendor trips:', error);
    res.status(500).json({ error: 'Failed to fetch vendor trips' });
  }
};

export const saveVendorInvoice = async (req: Request, res: Response) => {
  try {
    const { vendorName, amount, linkedCustomerInvoice, financialYear, html, invoiceDate, dueDate } = req.body;

    if (!vendorName || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fy = financialYear || '25-26';
    const invoiceNumber = await generateVendorInvoiceNumber();

    let finalAzureUrl = null;

    if (html) {
      try {
        let browser;
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          const chromium = (await import('@sparticuz/chromium')).default;
          const puppeteerCore = (await import('puppeteer-core')).default;
          browser = await puppeteerCore.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          });
        } else {
          const puppeteerModule = await import('puppeteer');
          const puppeteer = puppeteerModule.default || puppeteerModule;
          browser = await puppeteer.launch({ headless: true });
        }
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' as any });
        await page.emulateMediaType('print');
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' }
        });
        await browser.close();

        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME || 'tmsfiles');
        await containerClient.createIfNotExists();

        const blobName = `vendor-invoices/${invoiceNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(Buffer.from(pdfBuffer), {
          blobHTTPHeaders: { blobContentType: 'application/pdf' }
        });

        finalAzureUrl = blockBlobClient.url;
      } catch (error) {
        console.error('Failed to generate PDF or upload to Azure:', error);
        throw error;
      }
    } else if (req.body.azureUrl) {
      finalAzureUrl = req.body.azureUrl;
    }

    let customerInvoiceId = null;
    if (linkedCustomerInvoice) {
      const [invRows]: any = await pool.query(
        'SELECT id FROM customer_invoices WHERE invoice_number = ? LIMIT 1',
        [linkedCustomerInvoice]
      );
      if (invRows.length > 0) {
        customerInvoiceId = invRows[0].id;
      }
    }

    const insertQuery = `
      INSERT INTO vendor_invoices (
        vendor_invoice_number, vendor_name, date, due_date, amount, 
        azure_blob_url, customer_invoice_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const iDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const dDate = dueDate ? new Date(dueDate) : new Date(iDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(insertQuery, [
      invoiceNumber,
      vendorName,
      iDate,
      dDate,
      amount,
      finalAzureUrl,
      customerInvoiceId
    ]);

    res.json({ 
      success: true, 
      invoiceNumber,
      azureBlobUrl: finalAzureUrl
    });
  } catch (error) {
    console.error('Error saving vendor invoice:', error);
    res.status(500).json({ error: 'Failed to save vendor invoice' });
  }
};

export const getVendorInvoicesList = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        vi.id, 
        vi.vendor_invoice_number AS invoice_number, 
        vi.vendor_name, 
        vi.customer_invoice_id, 
        ci.invoice_number AS linked_customer_invoice,
        vi.date, 
        vi.due_date, 
        vi.amount, 
        vi.status, 
        vi.azure_blob_url,
        v.VendorAddress AS vendor_address,
        v.AccountHolderName AS account_holder_name,
        v.AccountNumber AS account_number,
        v.IFSCCode AS ifsc_code,
        v.BankName AS bank_name,
        v.BranchName AS branch_name
      FROM vendor_invoices vi
      LEFT JOIN customer_invoices ci ON vi.customer_invoice_id = ci.id
      LEFT JOIN vendor v ON vi.vendor_name = v.VendorName
      ORDER BY vi.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vendor invoices:', error);
    res.status(500).json({ error: 'Failed to fetch vendor invoices' });
  }
};
export const saveVendorCNDN = async (req: Request, res: Response) => {
  try {
    const { noteNumber, type, vendorInvoiceRef, amount, date, reason, remarks, html } = req.body;

    if (!noteNumber || !type || !vendorInvoiceRef || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let finalAzureUrl = null;

    if (html) {
      try {
        let browser;
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          const chromium = (await import('@sparticuz/chromium')).default;
          const puppeteerCore = (await import('puppeteer-core')).default;
          browser = await puppeteerCore.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          });
        } else {
          const puppeteerModule = await import('puppeteer');
          const puppeteer = puppeteerModule.default || puppeteerModule;
          browser = await puppeteer.launch({ headless: true });
        }
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' as any });
        await page.emulateMediaType('print');
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' }
        });
        await browser.close();

        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME || 'tmsfiles');
        await containerClient.createIfNotExists();

        const blobName = `vendor-cndn/${noteNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(Buffer.from(pdfBuffer), {
          blobHTTPHeaders: { blobContentType: 'application/pdf' }
        });

        finalAzureUrl = blockBlobClient.url;
      } catch (error) {
        console.error('Failed to generate PDF or upload to Azure:', error);
        throw error;
      }
    }

    const insertQuery = `
      INSERT INTO vendor_cndn_notes (
        note_number, type, vendor_invoice_ref, amount, date, reason, remarks, azure_blob_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const cndnDate = date ? new Date(date) : new Date();

    await pool.query(insertQuery, [
      noteNumber,
      type,
      vendorInvoiceRef,
      amount,
      cndnDate,
      reason,
      remarks,
      finalAzureUrl
    ]);

    res.json({ 
      success: true, 
      noteNumber,
      azureBlobUrl: finalAzureUrl
    });
  } catch (error) {
    console.error('Error saving vendor CN/DN:', error);
    res.status(500).json({ error: 'Failed to save vendor CN/DN' });
  }
};

export const getVendorCNDNList = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        cndn.id, 
        cndn.note_number AS noteNumber, 
        cndn.type, 
        cndn.vendor_invoice_ref AS invoiceRef, 
        cndn.amount, 
        cndn.date, 
        cndn.reason, 
        cndn.remarks, 
        cndn.azure_blob_url, 
        cndn.status,
        vi.vendor_name AS customerOrVendor
      FROM vendor_cndn_notes cndn
      LEFT JOIN vendor_invoices vi ON cndn.vendor_invoice_ref = vi.vendor_invoice_number
      ORDER BY cndn.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vendor CN/DN notes:', error);
    res.status(500).json({ error: 'Failed to fetch vendor CN/DN notes' });
  }
};
