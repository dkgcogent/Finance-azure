import { db } from '../../../config/database';
import puppeteer from 'puppeteer';
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

export const invoiceService = {
  getInvoices: async () => {
    const [rows] = await db.query(`
      SELECT 
        ci.id, 
        ci.invoice_number as invoiceNumber, 
        ci.customer_name as customerName, 
        ci.date, 
        ci.due_date as dueDate, 
        ci.amount, 
        ci.status, 
        ci.format, 
        ci.financial_year as financialYear, 
        ci.azure_blob_url as azureBlobUrl,
        c.GSTNo as gstin,
        c.CustomerRegisteredOfficeAddress as billing_address
      FROM customer_invoices ci
      LEFT JOIN customer c ON ci.customer_name = c.Name
      ORDER BY ci.created_at DESC
    `);
    return rows;
  },

  getCustomers: async () => {
    const [rows] = await db.query("SELECT CustomerID as id, CONCAT(COALESCE(MasterCustomerName, Name), ' (', COALESCE(CustomerCode, ''), ')') as name FROM customer");
    return rows;
  },

  getProjects: async () => {
    const [rows] = await db.query("SELECT ProjectID as id, CONCAT(ProjectName, CASE WHEN Location IS NOT NULL AND Location != '' THEN CONCAT(' (', Location, ')') ELSE '' END) as name, CustomerID as customerId FROM project");
    return rows;
  },

  getLocations: async () => {
    const [rows] = await db.query("SELECT DISTINCT Location as id, Location as name, CustomerID as customerId FROM project WHERE Location IS NOT NULL AND Location != ''");
    return rows;
  },

  saveInvoice: async (data: any) => {
    const {
      html,
      invoiceNumber,
      customerName,
      date,
      dueDate,
      amount,
      status,
      format,
      financialYear
    } = data;

    let azureBlobUrl = null;

    if (html) {
      try {
        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        
        // Emulate print CSS media
        await page.emulateMediaType('print');

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' }
        });

        await browser.close();

        // Upload to Azure
        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME || 'tmsfiles');
        
        // Create container if it doesn't exist
        await containerClient.createIfNotExists();

        const blobName = `invoices/${invoiceNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Upload buffer
        await blockBlobClient.uploadData(Buffer.from(pdfBuffer), {
          blobHTTPHeaders: { blobContentType: 'application/pdf' }
        });

        azureBlobUrl = blockBlobClient.url;
      } catch (error) {
        console.error('Failed to generate PDF or upload to Azure:', error);
        throw error;
      }
    }

    // Insert into DB
    const [result]: any = await db.query(
      `INSERT INTO customer_invoices 
       (invoice_number, customer_name, date, due_date, amount, status, format, financial_year, azure_blob_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceNumber, customerName, date, dueDate, amount, status || 'Pending', format, financialYear, azureBlobUrl]
    );

    return {
      id: result.insertId,
      invoiceNumber,
      azureBlobUrl
    };
  },

  generateReports: async (filters: {
    customerId: number;
    projectId: number;
    locationId: string;
    tripType: string;
    startDate: string;
    endDate: string;
  }) => {
    const { customerId, projectId, locationId, tripType, startDate, endDate } = filters;
    
    // Fetch MIS data
    let query = '';
    let params: any[] = [];
    
    if (tripType === 'Fixed') {
      query = `
        SELECT 
          TransactionDate as date,
          p.ProjectName as consignorName,
          COALESCE(vend.VendorName, 'Unknown') as vendor,
          v.VehicleRegistrationNo as vehicle,
          TripType as vehicleOwnership,
          COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub) as actualStart,
          COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub) as actualEnd,
          COALESCE(ft.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub), COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub)), 0) as transit,
          COALESCE(ft.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub), COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub)), 0) as total,
          0 as extra,
          COALESCE(ft.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub), COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub)), 0) as working,
          OpeningKM as startKm,
          ClosingKM as endKm,
          (ClosingKM - OpeningKM) as distance,
          FixKm as extraKm,
          TransactionID as orderNumber,
          TransactionID as tripLogNumber,
          VFreightFix as FreightFix,
          LoadingCharges,
          UnloadingCharges,
          ParkingCharges,
          ft.GSTNo,
          ft.CompanyName,
          ft.Location as ourState,
          ft.CustomerSite as ourBranch
        FROM fixed_transactions ft
        LEFT JOIN vehicle v ON v.VehicleID = JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))
        LEFT JOIN vendor vend ON vend.VendorID = ft.VendorID
        LEFT JOIN project p ON p.ProjectID = ft.ProjectID
        WHERE ft.CustomerID = ? 
          AND ft.ProjectID = ? 
          AND (ft.LocationID = ? OR ft.LocationID IS NULL)
          AND ft.TransactionDate BETWEEN ? AND ?
      `;
      params = [customerId, projectId, locationId, startDate, endDate];
    } else {
      // Adhoc: match by CustomerID + date range only
      query = `
        SELECT 
          TransactionDate as date,
          COALESCE(ProjectName, Location, CustomerSite) as consignorName,
          VendorName as vendor,
          VehicleNumber as vehicle,
          COALESCE(VehicleOwnershipType, TripType) as vehicleOwnership,
          COALESCE(InTimeByCust, VehicleEntryInHub, VehicleReportingAtHub) as actualStart,
          COALESCE(OutTimeFrom, OutTimeFromHub, VehicleReturnAtHub) as actualEnd,
          COALESCE(TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(InTimeByCust, VehicleEntryInHub, VehicleReportingAtHub), COALESCE(OutTimeFrom, OutTimeFromHub, VehicleReturnAtHub)), 0) as transit,
          COALESCE(TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(InTimeByCust, VehicleEntryInHub, VehicleReportingAtHub), COALESCE(OutTimeFrom, OutTimeFromHub, VehicleReturnAtHub)), 0) as total,
          ExtraKM as extra,
          COALESCE(TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(InTimeByCust, VehicleEntryInHub, VehicleReportingAtHub), COALESCE(OutTimeFrom, OutTimeFromHub, VehicleReturnAtHub)), 0) as working,
          OpeningKM as startKm,
          ClosingKM as endKm,
          (ClosingKM - OpeningKM) as distance,
          ExtraKM as extraKm,
          TripNo as orderNumber,
          TripNo as tripLogNumber,
          TotalFreight as FreightFix,
          LoadingCharges,
          UnloadingCharges,
          ParkingCharges,
          ExtraKMCost,
          DCMCharges,
          GSTNo,
          CompanyName,
          Location as ourState,
          COALESCE(CustSite, CustomerSite) as ourBranch
        FROM adhoc_transactions
        WHERE CustomerID = ?
          AND TransactionDate BETWEEN ? AND ?
      `;
      params = [customerId, startDate, endDate];
    }
    
    const [misRows]: any = await db.query(query, params);

    // Generate Annexure from MIS
    const annexureMap = new Map();
    
    misRows.forEach((row: any) => {
      const loc = row.consignorName || 'Unknown Location';
      if (!annexureMap.has(loc)) {
        annexureMap.set(loc, {
          location: loc,
          noOfTrips: 0,
          rates: row.FreightFix || 0,
          extraKm: 0,
          extraKmRates: 0,
          extraHrs: 0,
          extraHrsRates: 60,
          extraKmCost: 0,
          extraHrsCost: 0,
          totalFixCost: 0,
          handlingCharges: 0,
          parking: 0,
          totalAmount: 0
        });
      }
      
      const summary = annexureMap.get(loc);
      summary.noOfTrips += 1;
      summary.totalFixCost += Number(row.FreightFix || 0);
      
      summary.extraKm += Number(row.extraKm || 0);
      summary.extraKmCost += Number(row.ExtraKMCost || 0);
      
      // Attempt to calculate extra hours if transit is > 10 hours
      const transitHours = Number(row.transit || 0);
      if (transitHours > 10) {
        summary.extraHrs += (transitHours - 10);
      }
      summary.extraHrsCost = summary.extraHrs * summary.extraHrsRates;

      summary.handlingCharges += Number(row.LoadingCharges || 0) + Number(row.UnloadingCharges || 0);
      summary.parking += Number(row.ParkingCharges || 0);
      
      summary.totalAmount = summary.totalFixCost + summary.extraKmCost + summary.extraHrsCost + summary.handlingCharges + summary.parking;
    });

    const annexureData = Array.from(annexureMap.values());

    // Flipkart specific Annexure logic
    let flipkartAnnexureData: any[] = [];
    let flipkartAdhocAnnexureData: any[] = [];
    
    if (misRows.length > 0 && misRows.some((r: any) => r.consignorName && r.consignorName.toLowerCase().includes('flipkart'))) {
      if (tripType === 'Fixed') {
        const flipkartMap = new Map();
      const workingDaysInMonth = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).getDate();
      
      // Fetch commercial for Flipkart
      const [commercialRows]: any = await db.query(
        "SELECT * FROM customer_commercial WHERE project LIKE '%Flipkart%' AND state = ? LIMIT 1",
        [misRows[0].ourState || 'Uttar Pradesh'] // Fallback to UP
      );
      
      const comm = commercialRows[0] || {};
      const extraKmRate = Number(comm.additional_rate_per_km || 7);
      const extraHourRate = Number(comm.over_time_charges || 60);
      const fixedKms = Number(comm.km_include_in_fix_rate || 5500);
      const fixedRate = Number(comm.fixed_rate || 64500);
      const dieselHike = 0; 
      const totalChargesWithDieselHike = fixedRate + dieselHike;
      const vehicleType = comm.type_of_vehicle || 'Tata Ace';
      const mode = comm.type_of_vehicle_placement || 'UP Large';
      const vertical = comm.description_only_sbs || 'LM'; // dynamically mapped or fallback LM
      
      misRows.forEach((row: any) => {
        const veh = row.vehicle || 'Unknown Vehicle';
        if (!flipkartMap.has(veh)) {
          flipkartMap.set(veh, {
            sNo: flipkartMap.size + 1,
            vehicleNo: veh,
            typeOfVehicle: vehicleType,
            mode: mode,
            location: row.ourBranch || row.ourState || row.consignorName,
            vertical: vertical,
            noOfHours: comm.hours || 12,
            fixedKms: fixedKms,
            agreementRate: fixedRate,
            dieselHike: dieselHike,
            totalChargesWithDieselHike: totalChargesWithDieselHike,
            workingDaysToBeDone: workingDaysInMonth,
            daysActualDone: new Set(),
            totalKMs: 0,
            extraHour: 0,
            extraHourCharges: 0,
            extraKmRate: extraKmRate,
            extraKm: 0,
            extraKmCharge: 0,
            totalAmount: 0,
            perDayCost: 0,
            tWorkingDaysAmount: 0,
            tollCharges: 0,
            amount: 0
          });
        }
        
        const summary = flipkartMap.get(veh);
        summary.daysActualDone.add(new Date(row.date).toISOString().split('T')[0]);
        summary.totalKMs += Number(row.distance || 0);
        summary.tollCharges += Number(row.ParkingCharges || 0);
        
        // Calculate extra hours for this trip
        const transitHours = Number(row.transit || 0);
        if (transitHours > summary.noOfHours) {
          summary.extraHour += Math.floor(transitHours - summary.noOfHours);
        }
      });
      
      flipkartAnnexureData = Array.from(flipkartMap.values()).map((summary: any) => {
        const actualDays = summary.daysActualDone.size;
        summary.daysActualDone = actualDays;
        
        summary.extraKm = Math.max(summary.totalKMs - summary.fixedKms, 0);
        summary.extraKmCharge = summary.extraKm * summary.extraKmRate;
        summary.extraHourCharges = summary.extraHour * extraHourRate;
        
        // Formula: Total Amount = Extra Km Charge + Total Charges with Diesel Hike
        summary.totalAmount = summary.extraKmCharge + summary.totalChargesWithDieselHike;
        
        // Formula: Per Day Cost = Total Amount / No. of Working Days
        summary.perDayCost = Math.round(summary.totalAmount / summary.workingDaysToBeDone);
        
        // Formula: T.Working days Amount = Nos. of days actual done * Per Day Cost
        summary.tWorkingDaysAmount = actualDays * summary.perDayCost;
        
        // Formula: Amount = T. Working days Amount + Extra Hour Charges + Toll charges
        summary.amount = summary.tWorkingDaysAmount + summary.extraHourCharges + summary.tollCharges;
        
        return summary;
      });
      } else if (tripType === 'Adhoc') {
        const adhocMap = new Map();
        
        const [commercialRows]: any = await db.query(
          "SELECT * FROM customer_commercial WHERE project LIKE '%Flipkart%' AND state = ? LIMIT 1",
          [misRows[0].ourState || 'Uttar Pradesh'] 
        );
        const comm = commercialRows[0] || {};
        const extraKmRate = Number(comm.additional_rate_per_km || 7);
        const fixRate = Number(comm.fixed_rate || 2200);
        
        misRows.forEach((row: any) => {
          const loc = row.ourBranch || row.ourState || row.consignorName || 'Unknown';
          if (!adhocMap.has(loc)) {
            adhocMap.set(loc, {
              sNo: adhocMap.size + 1,
              location: loc,
              noOfTrips: 0,
              fixRate: fixRate,
              extraKm: 0,
              extraKmRate: extraKmRate,
              totalFixCost: 0,
              extraKmCharge: 0,
              handlingCharges: 0,
              amount: 0
            });
          }
          
          const summary = adhocMap.get(loc);
          summary.noOfTrips += 1;
          summary.extraKm += Number(row.extraKm || 0);
        });
        
        flipkartAdhocAnnexureData = Array.from(adhocMap.values()).map((summary: any) => {
          summary.totalFixCost = summary.fixRate * summary.noOfTrips;
          summary.extraKmCharge = summary.extraKmRate * summary.extraKm;
          summary.handlingCharges = 100 * summary.noOfTrips;
          summary.amount = summary.totalFixCost + summary.extraKmCharge + summary.handlingCharges;
          return summary;
        });
      }
    }

    return {
      misData: misRows,
      annexureData,
      flipkartAnnexureData,
      flipkartAdhocAnnexureData
    };
  },

  getGlobalInvoiceMaster: async () => {
    // We fetch customer invoices and join with TMS billing and customer CNDN notes
    // We also fetch payment collections for these billings.
    const query = `
      SELECT 
        ci.id as finance_id,
        ci.invoice_number as invNo,
        ci.customer_name as custName,
        ci.date as invDate,
        ci.due_date as dueDate,
        ci.amount as invAmt,
        ci.financial_year as finYear,
        
        b.BillingID as billingId,
        b.ProjectID as projectId,
        b.PaymentStatus as payStatus,
        b.GSTRate as gstRate,
        
        cndn.amount as cnAmt,
        cndn.type as cnType,
        cndn.note_number as cnNo,

        p.ProjectName as linkedProjectName,
        p.Location as linkedLocation,

        m.jmsStatus as m_jmsStatus, m.jmsNum as m_jmsNum, m.jmsDate as m_jmsDate, m.subDate as m_subDate,
        m.custName as m_custName, m.proj as m_proj, m.projWork as m_projWork, m.loc as m_loc,
        m.revHead as m_revHead, m.hsn as m_hsn, m.invTo as m_invTo, m.rcm as m_rcm,
        m.pay1Amt as m_pay1Amt, m.pay1Date as m_pay1Date, m.pay1Adv as m_pay1Adv,
        m.pay2Amt as m_pay2Amt, m.pay2Date as m_pay2Date, m.pay2Adv as m_pay2Adv,
        m.pay3Amt as m_pay3Amt, m.pay3Date as m_pay3Date, m.pay3Adv as m_pay3Adv,
        m.gstPayAmt as m_gstPayAmt, m.gstPayDate as m_gstPayDate, m.totPay as m_totPay, m.payStatus as m_payStatus
        
      FROM customer_invoices ci
      LEFT JOIN billing b ON ci.invoice_number = b.InvoiceNo
      LEFT JOIN project p ON ci.customer_name = p.ProjectName
      LEFT JOIN customer_cndn_notes cndn ON ci.invoice_number = cndn.customer_invoice_ref AND cndn.status = 'Approved'
      LEFT JOIN global_invoice_manual_data m ON ci.id = m.invoice_id
      ORDER BY ci.created_at DESC
    `;

    const [rows]: any = await db.query(query);

    // Fetch payments for the associated billings
    const billingIds = rows.map((r: any) => r.billingId).filter(Boolean);
    let paymentsMap: Record<number, any[]> = {};
    
    if (billingIds.length > 0) {
      const [payments]: any = await db.query(
        `SELECT BillingID, PaymentDate, PaymentAmount, PaymentReference 
         FROM paymentcollection 
         WHERE BillingID IN (?)
         ORDER BY PaymentDate ASC`,
        [billingIds]
      );

      payments.forEach((p: any) => {
        if (!paymentsMap[p.BillingID]) paymentsMap[p.BillingID] = [];
        paymentsMap[p.BillingID].push(p);
      });
    }

    return rows.map((row: any) => {
      const invAmt = Number(row.invAmt) || 0;
      
      // User requested calculations
      const IGST = Math.round(invAmt * 0.18);
      const SGST = 0; // Assuming IGST covers full 18%, or logic could split it. Let's just use IGST.
      const CGST = 0;
      const totGst = IGST + SGST + CGST;
      const totInvAmt = totGst + invAmt;
      const tds = Math.round(invAmt * 0.02);
      const payable = totInvAmt - tds;
      
      // CN Amount calculation
      const cnAmtBase = Number(row.cnAmt) || 0;
      const cnIgst = Math.round(cnAmtBase * 0.18);
      const cnCgst = 0;
      const cnSgst = 0;
      const cnTotGst = cnIgst + cnCgst + cnSgst;
      const cnTotAmt = cnAmtBase + cnTotGst;
      
      // Payments
      const billPayments = paymentsMap[row.billingId] || [];
      const totPay = billPayments.reduce((sum, p) => sum + Number(p.PaymentAmount), 0);
      
      // Outstanding
      const outstanding = payable - totPay - cnTotAmt;

      // Extract Month/Year from invoice date
      const dateObj = row.invDate ? new Date(row.invDate) : new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const invMonth = `${monthNames[dateObj.getMonth()]}-${dateObj.getFullYear().toString().slice(2)}`;

      return {
        id: String(row.finance_id),
        type: "Customer",
        gst: "DL", // Static defaults for missing UI mapped fields
        gstNo: "07AAFCC4715N1ZG",
        invNo: row.invNo,
        poNo: "",
        invDate: dateObj.toISOString().split('T')[0],
        invMonth: invMonth,
        finYear: row.finYear,
        svcMonth: invMonth,
        jmsStatus: row.m_jmsStatus || row.payStatus || "Pending",
        jmsNum: row.m_jmsNum || "",
        jmsDate: row.m_jmsDate || "",
        subDate: row.m_subDate || dateObj.toISOString().split('T')[0],
        custName: row.m_custName || row.custName || "",
        proj: row.m_proj || row.linkedProjectName || "",
        creditDays: "30",
        projWork: row.m_projWork || "",
        loc: row.m_loc || row.linkedLocation || "",
        revHead: row.m_revHead || "",
        hsn: row.m_hsn || "",
        invTo: row.m_invTo || row.custName || "",
        rcm: row.m_rcm || "",
        custGst: "",
        
        // Formatted amounts
        invAmt: invAmt,
        igst: IGST,
        sgst: SGST,
        cgst: CGST,
        totGst: totGst,
        totInvAmt: totInvAmt,
        tds: tds,
        payable: payable,
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : "",
        
        // Payments
        pay1Amt: row.m_pay1Amt || billPayments[0]?.PaymentAmount || 0,
        pay1Date: row.m_pay1Date || billPayments[0]?.PaymentDate || "",
        pay1Adv: row.m_pay1Adv || billPayments[0]?.PaymentReference || "",
        
        pay2Amt: row.m_pay2Amt || billPayments[1]?.PaymentAmount || 0,
        pay2Date: row.m_pay2Date || billPayments[1]?.PaymentDate || "",
        pay2Adv: row.m_pay2Adv || billPayments[1]?.PaymentReference || "",
        
        pay3Amt: row.m_pay3Amt || billPayments[2]?.PaymentAmount || 0,
        pay3Date: row.m_pay3Date || billPayments[2]?.PaymentDate || "",
        pay3Adv: row.m_pay3Adv || billPayments[2]?.PaymentReference || "",
        
        gstPayAmt: row.m_gstPayAmt || 0,
        gstPayDate: row.m_gstPayDate || "",
        totPay: row.m_totPay || totPay,
        
        // CN/DN
        cnNo: row.cnNo || "",
        cnAmt: cnAmtBase,
        cnIgst: cnIgst,
        cnCgst: cnCgst,
        cnSgst: cnSgst,
        cnTotGst: cnTotGst,
        cnTotAmt: cnTotAmt,
        
        outstanding: outstanding,
        payStatus: row.m_payStatus || (outstanding <= 0 ? "Fully Paid" : totPay > 0 ? "Partially Paid" : "Pending"),
        payDays: "",
        payDelay: "",
        netCredit: "30"
      };
    });
  },

  saveGlobalInvoiceMaster: async (rows: any[]) => {
    // Bulk upsert into global_invoice_manual_data
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const row of rows) {
        if (!row.id) continue;
        
        const q = `
          INSERT INTO global_invoice_manual_data (
            invoice_id, jmsStatus, jmsNum, jmsDate, subDate, custName, proj, projWork, loc,
            revHead, hsn, invTo, rcm, pay1Amt, pay1Date, pay1Adv, pay2Amt, pay2Date, pay2Adv,
            pay3Amt, pay3Date, pay3Adv, gstPayAmt, gstPayDate, totPay, payStatus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            jmsStatus=VALUES(jmsStatus), jmsNum=VALUES(jmsNum), jmsDate=VALUES(jmsDate), subDate=VALUES(subDate),
            custName=VALUES(custName), proj=VALUES(proj), projWork=VALUES(projWork), loc=VALUES(loc),
            revHead=VALUES(revHead), hsn=VALUES(hsn), invTo=VALUES(invTo), rcm=VALUES(rcm),
            pay1Amt=VALUES(pay1Amt), pay1Date=VALUES(pay1Date), pay1Adv=VALUES(pay1Adv),
            pay2Amt=VALUES(pay2Amt), pay2Date=VALUES(pay2Date), pay2Adv=VALUES(pay2Adv),
            pay3Amt=VALUES(pay3Amt), pay3Date=VALUES(pay3Date), pay3Adv=VALUES(pay3Adv),
            gstPayAmt=VALUES(gstPayAmt), gstPayDate=VALUES(gstPayDate), totPay=VALUES(totPay), payStatus=VALUES(payStatus)
        `;
        
        const values = [
          row.id,
          row.jmsStatus || null, row.jmsNum || null, row.jmsDate || null, row.subDate || null,
          row.custName || null, row.proj || null, row.projWork || null, row.loc || null,
          row.revHead || null, row.hsn || null, row.invTo || null, row.rcm || null,
          row.pay1Amt || null, row.pay1Date || null, row.pay1Adv || null,
          row.pay2Amt || null, row.pay2Date || null, row.pay2Adv || null,
          row.pay3Amt || null, row.pay3Date || null, row.pay3Adv || null,
          row.gstPayAmt || null, row.gstPayDate || null, row.totPay || null, row.payStatus || null
        ];
        
        await connection.query(q, values);
      }
      
      await connection.commit();
      return { success: true };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
};
