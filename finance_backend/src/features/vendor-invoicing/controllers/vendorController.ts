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
    const { vendorName, startDate, endDate, tripType, customerId, projectId, locationId } = req.query;

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
      `SELECT * FROM vendor_commercial 
       WHERE (vendor_name = ? OR vendor_id = ?) 
       ORDER BY (CASE WHEN LOWER(type_of_vehicle_placement) = LOWER(?) THEN 0 ELSE 1 END), id DESC 
       LIMIT 1`,
      [actualVendorName, vendorName, placementType]
    );
    const commercialRates = commercialRows.length > 0 ? commercialRows[0] : null;

    const custIdVal = customerId ? String(customerId) : null;
    const projIdVal = projectId ? String(projectId) : null;

    if (tripType === 'adhoc') {
      // Fetch all trips for this vendor in the date range
      const [trips]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(COALESCE(ServiceDate, TransactionDate), '%d/%m/%Y') as date,
          Location, CustomerSite, CustSite, VendorName, VehicleNumber, VehicleType, VehicleOwnershipType, TripType, DriverType, 
          COALESCE(ArrivalTimeAtHub, InTimeByCust, VehicleReportingAtHub, VehicleEntryInHub) as ArrivalTimeAtHub, 
          COALESCE(OutTimeFromHub, VehicleOutFromHubFinal, ReturnReportingTime, OutTimeFrom, VehicleReturnAtHub, VehicleOutFromHubForDelivery) as OutTimeFromHub, 
          OpeningKM, ClosingKM, ExtraKM, ExtraKMCost, VFreightFix, DCMCharges, TotalFreight 
        FROM adhoc_transactions 
        WHERE (VendorName = ? OR VendorID = ?) 
        AND COALESCE(ServiceDate, TransactionDate) BETWEEN ? AND ?
        AND (? IS NULL OR ? = '' OR CustomerID = ?)
        AND (? IS NULL OR ? = '' OR ProjectID = ?)
      `, [actualVendorName, vendorName, startDate, endDate, custIdVal, custIdVal, custIdVal, projIdVal, projIdVal, projIdVal]);

      // Calculate Annexure Data
      const annexureData = trips.map((t: any, index: number) => {
        const rawHub = t.CustomerSite || t.CustSite || t.Location || '';
        const cleanHub = rawHub.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();
        const locMatch = rawHub.match(/^([A-Z]{2})\s*-\s*/i);
        const cleanLoc = locMatch ? locMatch[1].toUpperCase() : (t.Location || 'UP');

        return {
          id: index + 1,
          date: t.date || '',
          hub: cleanHub,
          loc: cleanLoc,
          vendor: 'COGENT LOGISTICS PRIVATE LIMITED',
          vehNo: t.VehicleNumber || '',
          vehType: t.VehicleType || '',
          parentVeh: t.VehicleNumber || '',
          ownType: 'Adhoc',
          driverType: t.DriverType || 'Driver',
          inTime: t.ArrivalTimeAtHub || '',
          outTime: t.OutTimeFromHub || '',
          startOdo: t.OpeningKM || 0,
          endOdo: t.ClosingKM || 0,
          dist: (t.ClosingKM || 0) - (t.OpeningKM || 0),
          location: cleanLoc,
          vehicleNumber: t.VehicleNumber || '',
          vehicleType: t.VehicleType || '',
          vehicleOwnership: 'Adhoc',
          tripType: t.TripType || 'Adhoc',
          startOdometer: t.OpeningKM || 0,
          endOdometer: t.ClosingKM || 0,
          distance: (t.ClosingKM || 0) - (t.OpeningKM || 0),
          extraKm: Math.max(0, ((t.ClosingKM || 0) - (t.OpeningKM || 0)) - 100),
          extraKmRate: t.ExtraKM && t.ExtraKMCost ? (t.ExtraKMCost / t.ExtraKM).toFixed(2) : 0,
          fixCost: t.VFreightFix || 0
        };
      });

      // Calculate MIS Data
      const misGroups: any = {};
      trips.forEach((t: any) => {
        const rawHub = t.CustomerSite || t.CustSite || t.Location || 'Unknown';
        const cleanHub = rawHub.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();
        const loc = cleanHub || 'Unknown';

        const dist = (parseFloat(t.ClosingKM) || 0) - (parseFloat(t.OpeningKM) || 0);
        const tripExtraKm = Math.max(0, dist - 100);

        if (!misGroups[loc]) {
          const rawFixed = commercialRates?.fixed_rate ? parseFloat(commercialRates.fixed_rate) : (t.VFreightFix ? parseFloat(t.VFreightFix) : 0);
          const fixedRateVal = isNaN(rawFixed) ? 0 : rawFixed;

          const rawAddRate = commercialRates?.additional_rate_per_km ? parseFloat(commercialRates.additional_rate_per_km) : (t.ExtraKMCost && t.ExtraKM && parseFloat(t.ExtraKM) > 0 ? parseFloat(t.ExtraKMCost) / parseFloat(t.ExtraKM) : 0);
          const addKmRateVal = isNaN(rawAddRate) ? 0 : rawAddRate;

          misGroups[loc] = {
            location: loc,
            noOfTrips: 0,
            rates: fixedRateVal,
            extraKm: 0,
            extraKmRate: addKmRateVal,
            extraHrsRate: commercialRates?.over_time_charges ? parseFloat(commercialRates.over_time_charges) : 63,
            fixedCost: 0,
            extraKmCost: 0,
            dcmCharges: 0,
            totalAmount: 0
          };
        }
        
        misGroups[loc].noOfTrips += 1;
        misGroups[loc].extraKm += tripExtraKm;
        misGroups[loc].dcmCharges += (parseFloat(t.DCMCharges) || 0);
      });
      
      const misData = Object.values(misGroups).map((m: any, idx: number) => {
        const safeRates = isNaN(m.rates) ? 0 : m.rates;
        const safeExtraKmRate = isNaN(m.extraKmRate) ? 0 : m.extraKmRate;
        const fixedCost = safeRates * (m.noOfTrips || 0);
        const extraKmCost = safeExtraKmRate * (m.extraKm || 0);
        const dcmCharges = isNaN(m.dcmCharges) ? 0 : m.dcmCharges;
        const totalAmount = fixedCost + extraKmCost + dcmCharges;

        return {
          id: idx + 1,
          ...m,
          rates: safeRates,
          fixedCost: Number(fixedCost.toFixed(2)),
          extraKmCost: Number(extraKmCost.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          extraKmRate: Number(safeExtraKmRate).toFixed(2)
        };
      });

      res.json({
        misData,
        annexureData,
        vendorInfo
      });
    } else if (tripType === 'fixed') {
      // Fetch all trips for this vendor in the date range
      const [trips]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(COALESCE(ServiceDate, TransactionDate), '%d/%m/%Y') as date,
          Location, CustomerSite, VendorName, VehicleNumber, VehicleType, TripType, 
          'Driver' as DriverType,
          COALESCE(ArrivalTimeAtHub, InTimeByCust, VehicleEntryInHub, VehicleReportingAtHub) as ArrivalTimeAtHub, 
          COALESCE(OutTimeFromHub, VehicleReturnAtHub, ReturnReportingTime, OutTimeFrom) as OutTimeFromHub, 
          TotalDutyHours,
          OpeningKM, ClosingKM, VFreightFix, TotalFreight, TollExpenses, ParkingCharges
        FROM fixed_transactions 
        WHERE (VendorName = ? OR VendorID = ?) 
        AND COALESCE(ServiceDate, TransactionDate) BETWEEN ? AND ?
        AND (? IS NULL OR ? = '' OR CustomerID = ?)
        AND (? IS NULL OR ? = '' OR ProjectID = ?)
      `, [actualVendorName, vendorName, startDate, endDate, custIdVal, custIdVal, custIdVal, projIdVal, projIdVal, projIdVal]);

      // Calculate Annexure Data (Detailed Logs)
      const annexureData = trips.map((t: any, index: number) => {
        const rawHub = t.CustomerSite || t.Location || '';
        const cleanHub = rawHub.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();
        const locMatch = rawHub.match(/^([A-Z]{2})\s*-\s*/i);
        const cleanLoc = locMatch ? locMatch[1].toUpperCase() : (t.Location || 'UP');

        return {
          id: index + 1,
          date: t.date || '',
          hub: cleanHub,
          loc: cleanLoc,
          vendor: 'COGENT LOGISTICS PRIVATE LIMITED',
          vehNo: t.VehicleNumber || '',
          vehType: t.VehicleType || '',
          parentVeh: t.VehicleNumber || '',
          ownType: 'Fixed',
          driverType: t.DriverType || 'Driver',
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

          const rawHubFixed = t.CustomerSite || t.Location || '';
          const cleanHubFixed = rawHubFixed.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();

          misGroups[veh] = {
            vehNo: veh,
            vehType: t.VehicleType || '',
            mode: 'UP Large LM',
            loc: cleanHubFixed || t.Location || '',
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

        // Calculate actual duty hours for this trip
        let tripDutyHours = 0;
        if (t.TotalDutyHours && !isNaN(Number(t.TotalDutyHours)) && Number(t.TotalDutyHours) > 0) {
          tripDutyHours = Number(t.TotalDutyHours);
        } else if (t.ArrivalTimeAtHub && t.OutTimeFromHub) {
          const inStr = String(t.ArrivalTimeAtHub).trim();
          const outStr = String(t.OutTimeFromHub).trim();
          const inParts = inStr.split(':').map(Number);
          const outParts = outStr.split(':').map(Number);
          if (inParts.length >= 2 && outParts.length >= 2 && !isNaN(inParts[0]) && !isNaN(outParts[0])) {
            const inMins = inParts[0] * 60 + (inParts[1] || 0);
            const outMins = outParts[0] * 60 + (outParts[1] || 0);
            let diffMins = outMins - inMins;
            if (diffMins < 0) diffMins += 24 * 60; // handle overnight duty
            tripDutyHours = diffMins / 60;
          }
        }

        const agreedHrs = misGroups[veh].hrs || 12;
        if (tripDutyHours > agreedHrs) {
          misGroups[veh].extHr += Math.floor(tripDutyHours - agreedHrs);
        }
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
          extHrRate: Number(extHrCharges).toFixed(2),
          perDayCost: Number(m.perDayCost).toFixed(2),
          perDayKm: Number(m.perDayKm).toFixed(2),
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

export const getNextInvoiceNumber = async (req: Request, res: Response) => {
  try {
    const invoiceNumber = await generateVendorInvoiceNumber();
    res.json({ invoiceNumber });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    res.status(500).json({ error: 'Failed to generate invoice number' });
  }
};

export const saveVendorInvoice = async (req: Request, res: Response) => {
  try {
    const { vendorName, amount, linkedCustomerInvoice, financialYear, html, invoiceDate, dueDate } = req.body;

    if (!vendorName || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fy = financialYear || '26-27';
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
        const processedHtml = html.replace(/VN\/26-27\/\d+/gi, invoiceNumber);
        await page.setContent(processedHtml, { waitUntil: 'networkidle0' as any });
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
