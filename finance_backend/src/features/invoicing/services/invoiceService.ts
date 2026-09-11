import { db } from '../../../config/database';
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

async function ensureGlobalInvoiceManualDataSchema() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS global_invoice_manual_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NULL UNIQUE,
        is_standalone TINYINT(1) DEFAULT 0,
        standalone_id VARCHAR(100) NULL UNIQUE,
        gst VARCHAR(50) NULL,
        gstNo VARCHAR(100) NULL,
        invNo VARCHAR(100) NULL,
        poNo VARCHAR(100) NULL,
        invDate VARCHAR(50) NULL,
        invMonth VARCHAR(50) NULL,
        finYear VARCHAR(50) NULL,
        svcMonth VARCHAR(50) NULL,
        jmsStatus VARCHAR(50) NULL,
        jmsNum VARCHAR(100) NULL,
        jmsDate VARCHAR(50) NULL,
        subDate VARCHAR(50) NULL,
        custName VARCHAR(255) NULL,
        proj VARCHAR(255) NULL,
        creditDays VARCHAR(50) NULL,
        projWork VARCHAR(255) NULL,
        loc VARCHAR(255) NULL,
        revHead VARCHAR(255) NULL,
        hsn VARCHAR(100) NULL,
        invTo VARCHAR(255) NULL,
        rcm VARCHAR(50) NULL,
        custGst VARCHAR(100) NULL,
        invAmt DECIMAL(15,2) NULL,
        igst DECIMAL(15,2) NULL,
        sgst DECIMAL(15,2) NULL,
        cgst DECIMAL(15,2) NULL,
        totGst DECIMAL(15,2) NULL,
        totInvAmt DECIMAL(15,2) NULL,
        tds DECIMAL(15,2) NULL,
        payable DECIMAL(15,2) NULL,
        dueDate VARCHAR(50) NULL,
        pay1Amt DECIMAL(15,2) NULL,
        pay1Date VARCHAR(50) NULL,
        pay1Adv VARCHAR(100) NULL,
        pay2Amt DECIMAL(15,2) NULL,
        pay2Date VARCHAR(50) NULL,
        pay2Adv VARCHAR(100) NULL,
        pay3Amt DECIMAL(15,2) NULL,
        pay3Date VARCHAR(50) NULL,
        pay3Adv VARCHAR(100) NULL,
        gstPayAmt DECIMAL(15,2) NULL,
        gstPayDate VARCHAR(50) NULL,
        totPay DECIMAL(15,2) NULL,
        cnNo VARCHAR(100) NULL,
        cnAmt DECIMAL(15,2) NULL,
        cnIgst DECIMAL(15,2) NULL,
        cnCgst DECIMAL(15,2) NULL,
        cnSgst DECIMAL(15,2) NULL,
        cnTotGst DECIMAL(15,2) NULL,
        cnTotAmt DECIMAL(15,2) NULL,
        outstanding DECIMAL(15,2) NULL,
        payStatus VARCHAR(50) NULL,
        payDays VARCHAR(50) NULL,
        payDelay VARCHAR(50) NULL,
        netCredit VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure invoice_id is NULLABLE for standalone rows (migrate PRIMARY KEY if invoice_id is PRI)
    try {
      const [cols]: any = await db.query("SHOW COLUMNS FROM global_invoice_manual_data WHERE Field = 'invoice_id'");
      if (cols[0] && cols[0].Key === 'PRI') {
        await db.query("ALTER TABLE global_invoice_manual_data ADD COLUMN id INT AUTO_INCREMENT FIRST, DROP PRIMARY KEY, ADD PRIMARY KEY (id)");
      }
    } catch (e) {
      // ignore
    }

    try {
      await db.query("ALTER TABLE global_invoice_manual_data MODIFY COLUMN invoice_id INT NULL DEFAULT NULL");
    } catch (e) {
      // ignore if already nullable
    }

    const [cols]: any = await db.query("SHOW COLUMNS FROM global_invoice_manual_data");
    const existing = cols.map((c: any) => c.Field);
    
    const newCols = [
      { name: 'is_standalone', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'standalone_id', type: 'VARCHAR(100) NULL' },
      { name: 'gst', type: 'VARCHAR(50) NULL' },
      { name: 'gstNo', type: 'VARCHAR(100) NULL' },
      { name: 'invNo', type: 'VARCHAR(100) NULL' },
      { name: 'poNo', type: 'VARCHAR(100) NULL' },
      { name: 'invDate', type: 'VARCHAR(50) NULL' },
      { name: 'invMonth', type: 'VARCHAR(50) NULL' },
      { name: 'finYear', type: 'VARCHAR(50) NULL' },
      { name: 'svcMonth', type: 'VARCHAR(50) NULL' },
      { name: 'creditDays', type: 'VARCHAR(50) NULL' },
      { name: 'custGst', type: 'VARCHAR(100) NULL' },
      { name: 'invAmt', type: 'DECIMAL(15,2) NULL' },
      { name: 'igst', type: 'DECIMAL(15,2) NULL' },
      { name: 'sgst', type: 'DECIMAL(15,2) NULL' },
      { name: 'cgst', type: 'DECIMAL(15,2) NULL' },
      { name: 'totGst', type: 'DECIMAL(15,2) NULL' },
      { name: 'totInvAmt', type: 'DECIMAL(15,2) NULL' },
      { name: 'tds', type: 'DECIMAL(15,2) NULL' },
      { name: 'payable', type: 'DECIMAL(15,2) NULL' },
      { name: 'dueDate', type: 'VARCHAR(50) NULL' },
      { name: 'cnNo', type: 'VARCHAR(100) NULL' },
      { name: 'cnAmt', type: 'DECIMAL(15,2) NULL' },
      { name: 'cnIgst', type: 'DECIMAL(15,2) NULL' },
      { name: 'cnCgst', type: 'DECIMAL(15,2) NULL' },
      { name: 'cnSgst', type: 'DECIMAL(15,2) NULL' },
      { name: 'cnTotGst', type: 'DECIMAL(15,2) NULL' },
      { name: 'cnTotAmt', type: 'DECIMAL(15,2) NULL' },
      { name: 'outstanding', type: 'DECIMAL(15,2) NULL' },
      { name: 'payDays', type: 'VARCHAR(50) NULL' },
      { name: 'payDelay', type: 'VARCHAR(50) NULL' },
      { name: 'netCredit', type: 'VARCHAR(50) NULL' }
    ];

    for (const col of newCols) {
      if (!existing.includes(col.name)) {
        await db.query(`ALTER TABLE global_invoice_manual_data ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // Ensure UNIQUE index on standalone_id
    try {
      const [indexes]: any = await db.query("SHOW INDEX FROM global_invoice_manual_data WHERE Key_name = 'idx_standalone_id'");
      if (!indexes || indexes.length === 0) {
        await db.query("ALTER TABLE global_invoice_manual_data ADD UNIQUE INDEX idx_standalone_id (standalone_id)");
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    console.error("Error ensuring global_invoice_manual_data schema:", e);
  }
}

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
    const [rows]: any = await db.query(`
      SELECT 
        CustomerID as id, 
        COALESCE(MasterCustomerName, Name) as name, 
        Name as companyName,
        CustomerCode as code,
        TypeOfServices as typeOfServices,
        ServiceCode as serviceCode,
        GSTNo as gstNo, 
        HouseFlatNo as houseFlatNo,
        StreetLocality as streetLocality,
        CustomerCity as city,
        CustomerState as state,
        CustomerPinCode as pinCode,
        CustomerCountry as country,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(', ', 
            NULLIF(TRIM(HouseFlatNo), ''), 
            NULLIF(TRIM(StreetLocality), ''), 
            NULLIF(TRIM(CustomerCity), ''), 
            NULLIF(TRIM(CONCAT_WS(' - ', NULLIF(TRIM(CustomerState), ''), NULLIF(TRIM(CustomerPinCode), ''))), '')
          )), ''),
          CustomerRegisteredOfficeAddress, 
          CustomerCorporateOfficeAddress
        ) as address 
      FROM customer
    `);
    return rows;
  },

  getProjects: async () => {
    const [rows] = await db.query(`
      SELECT 
        ProjectID as id, 
        ProjectName as name, 
        CustomerID as customerId, 
        ProjectCode as code, 
        GSTNo as gstNo, 
        TypeOfBilling as typeOfBilling, 
        GSTRate as gstRate, 
        BillingTenure as billingTenure,
        Location as location,
        State as state
      FROM project
    `);
    return rows;
  },

  getLocations: async () => {
    const [ccRows]: any = await db.query(
      "SELECT DISTINCT state as name, customer_id, company_name FROM customer_commercial WHERE state IS NOT NULL AND state != ''"
    );
    const [projRows]: any = await db.query(
      "SELECT DISTINCT State as name, CustomerID as customerId FROM project WHERE State IS NOT NULL AND State != ''"
    );

    const locationList: any[] = [];
    const seen = new Set<string>();

    const extractCustomerId = (companyName: string) => {
      if (!companyName) return null;
      const match = companyName.match(/\/ (\d+)$/);
      return match ? parseInt(match[1]) : null;
    };

    ccRows.forEach((r: any) => {
      const custId = r.customer_id || extractCustomerId(r.company_name);
      const stateParts = (r.name || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      stateParts.forEach((st: string) => {
        const key = `${custId || 'all'}___${st}`;
        if (!seen.has(key)) {
          seen.add(key);
          locationList.push({ id: st, name: st, customerId: custId });
        }
      });
    });

    projRows.forEach((r: any) => {
      const stateParts = (r.name || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      stateParts.forEach((st: string) => {
        const key = `${r.customerId}___${st}`;
        if (!seen.has(key)) {
          seen.add(key);
          locationList.push({ id: st, name: st, customerId: r.customerId });
        }
      });
    });

    return locationList;
  },

  saveInvoice: async (data: any) => {
    // Ensure columns exist on customer_invoices table
    try {
      const [existingCols]: any = await db.query("SHOW COLUMNS FROM customer_invoices");
      const colNames = existingCols.map((c: any) => c.Field);
      if (!colNames.includes('project')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN project VARCHAR(255) NULL");
      }
      if (!colNames.includes('project_work')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN project_work VARCHAR(255) NULL");
      }
      if (!colNames.includes('location')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN location VARCHAR(255) NULL");
      }
      if (!colNames.includes('hsn')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN hsn VARCHAR(100) NULL");
      }
      if (!colNames.includes('subtotal')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN subtotal DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('igst')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN igst DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('grand_total')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN grand_total DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('cust_gst')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN cust_gst VARCHAR(100) NULL");
      }
    } catch (e) {
      console.error("Error ensuring customer_invoices columns:", e);
    }

    const {
      html,
      invoiceNumber,
      customerName,
      date,
      dueDate,
      amount,
      subtotal,
      igst,
      grandTotal,
      custGst,
      status,
      format,
      financialYear,
      project,
      projectWork,
      location,
      hsn
    } = data;

    let azureBlobUrl = null;

    if (html) {
      try {
        // Generate PDF using Puppeteer
        let browser;
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          const chromium = (await import('@sparticuz/chromium')).default;
          const puppeteerCore = (await import('puppeteer-core')).default;
          browser = await puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: (chromium as any).defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: (chromium as any).headless ?? true,
          });
        } else {
          const puppeteerModule = await import('puppeteer');
          const puppeteer = puppeteerModule.default || puppeteerModule;
          browser = await puppeteer.launch({ headless: true });
        }
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' as any });
        
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

    const subtotalVal = subtotal !== undefined ? Number(subtotal) : Number(amount || 0);
    const igstVal = igst !== undefined ? Number(igst) : Math.round(subtotalVal * 0.18 * 100) / 100;
    const grandTotalVal = grandTotal !== undefined ? Number(grandTotal) : (subtotalVal + igstVal);
    const custGstVal = custGst || null;

    // Insert into DB
    const [result]: any = await db.query(
      `INSERT INTO customer_invoices 
       (invoice_number, customer_name, date, due_date, amount, subtotal, igst, grand_total, cust_gst, status, format, financial_year, azure_blob_url, project, project_work, location, hsn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        customerName,
        date,
        dueDate,
        subtotalVal,
        subtotalVal,
        igstVal,
        grandTotalVal,
        custGstVal,
        status || 'Pending',
        format,
        financialYear,
        azureBlobUrl,
        project || null,
        projectWork || null,
        location || null,
        hsn || '996511'
      ]
    );

    const invoiceId = result.insertId;

    // Auto-populate global_invoice_manual_data for Global Invoice Master
    try {
      await db.query(
        `INSERT INTO global_invoice_manual_data (
          invoice_id, custName, proj, projWork, loc, hsn, subDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          custName = VALUES(custName),
          proj = VALUES(proj),
          projWork = VALUES(projWork),
          loc = VALUES(loc),
          hsn = VALUES(hsn),
          subDate = VALUES(subDate)`,
        [
          invoiceId,
          customerName || null,
          project || null,
          projectWork || null,
          location || null,
          hsn || '996511',
          date || null
        ]
      );
    } catch (e) {
      console.error("Error auto-populating global_invoice_manual_data:", e);
    }

    return {
      id: invoiceId,
      invoiceNumber,
      azureBlobUrl
    };
  },

  generateReports: async (filters: any) => {
    const { customerId, projectId, locationId, tripType, startDate, endDate } = filters;

    // Fetch customer details from customer table
    let fallbackCustomerGSTIN: string | null = null;
    let fallbackCustomerAddress: string | null = null;
    let fallbackCustomerName: string | null = null;
    let fallbackCustomerCompanyName: string | null = null;
    let fallbackCustomerTypeOfServices: string | null = null;
    let fallbackCustomerServiceCode: string | null = null;
    let fallbackCustomerDetails: any = null;
    let coreCustomerName = '';

    try {
      if (customerId) {
        const [customerRows]: any = await db.query(`
          SELECT 
            CustomerID,
            Name,
            MasterCustomerName,
            CustomerCode,
            TypeOfServices,
            ServiceCode,
            GSTNo,
            HouseFlatNo,
            StreetLocality,
            CustomerCity,
            CustomerState,
            CustomerPinCode,
            CustomerCountry,
            CustomerRegisteredOfficeAddress,
            CustomerCorporateOfficeAddress
          FROM customer 
          WHERE CustomerID = ?
        `, [customerId]);

        if (customerRows.length > 0) {
          const c = customerRows[0];
          fallbackCustomerGSTIN = c.GSTNo || null;
          fallbackCustomerName = c.MasterCustomerName || c.Name || null;
          fallbackCustomerCompanyName = c.Name || c.MasterCustomerName || null;
          fallbackCustomerTypeOfServices = c.TypeOfServices || 'Transportation';
          fallbackCustomerServiceCode = c.ServiceCode || 'TRANS';

          const addrParts = [
            c.HouseFlatNo,
            c.StreetLocality,
            c.CustomerCity,
            c.CustomerState ? (c.CustomerPinCode ? `${c.CustomerState} ${c.CustomerPinCode}` : c.CustomerState) : c.CustomerPinCode,
            c.CustomerCountry && c.CustomerCountry !== 'India' ? c.CustomerCountry : null
          ].filter((p: any) => p && String(p).trim().length > 0);

          fallbackCustomerAddress = addrParts.length > 0
            ? addrParts.join(', ')
            : (c.CustomerRegisteredOfficeAddress || c.CustomerCorporateOfficeAddress || null);

          fallbackCustomerDetails = {
            id: c.CustomerID,
            name: c.MasterCustomerName,
            companyName: c.Name,
            code: c.CustomerCode,
            typeOfServices: c.TypeOfServices || 'Transportation',
            serviceCode: c.ServiceCode || 'TRANS',
            gstNo: c.GSTNo,
            houseFlatNo: c.HouseFlatNo,
            streetLocality: c.StreetLocality,
            city: c.CustomerCity,
            state: c.CustomerState,
            pinCode: c.CustomerPinCode,
            country: c.CustomerCountry,
            address: fallbackCustomerAddress
          };

          const rawName = c.Name || c.MasterCustomerName || '';
          coreCustomerName = rawName.replace(/Pvt\.?\s*Ltd\.?/i, '').replace(/Private\s*Limited/i, '').trim();
        }
      }
    } catch (e) {
      console.error("Error fetching fallback customer info:", e);
    }

    let fallbackProjectGSTIN: string | null = null;
    let fallbackProjectTypeOfBilling: string | null = null;
    let fallbackProjectGSTRate: string | null = null;
    let fallbackProjectBillingTenure: string | null = null;
    let fallbackProjectDetails: any = null;

    try {
      if (projectId) {
        const [projectRows]: any = await db.query(`
          SELECT 
            ProjectID,
            ProjectName,
            ProjectCode,
            CustomerID,
            GSTNo,
            TypeOfBilling,
            GSTRate,
            BillingTenure,
            Location,
            State
          FROM project
          WHERE ProjectID = ? OR ProjectName = ?
        `, [projectId, projectId]);

        if (projectRows.length > 0) {
          const p = projectRows[0];
          fallbackProjectGSTIN = p.GSTNo || null;
          fallbackProjectTypeOfBilling = p.TypeOfBilling || null;
          fallbackProjectGSTRate = p.GSTRate || null;
          fallbackProjectBillingTenure = p.BillingTenure || null;
          fallbackProjectDetails = {
            id: p.ProjectID,
            name: p.ProjectName,
            code: p.ProjectCode,
            customerId: p.CustomerID,
            gstNo: p.GSTNo,
            typeOfBilling: p.TypeOfBilling,
            gstRate: p.GSTRate,
            billingTenure: p.BillingTenure,
            location: p.Location,
            state: p.State
          };
        }
      }
    } catch (e) {
      console.error("Error fetching fallback project info:", e);
    }

    // Fetch MIS data
    let query = '';
    let params: any[] = [];
    
    if (tripType === 'Fixed') {
      query = `
        SELECT 
          COALESCE(ft.ServiceDate, ft.TransactionDate) as date,
          TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(ft.CustomerSite, ft.Location, p.ProjectName), ' (', 1), ' - ', -1)) as consignorName,
          p.ProjectName as projectName,
          'COGENT LOGISTICS' as vendor,
          COALESCE(v.VehicleRegistrationNo, ft.VehicleNumber) as vehicle,
          COALESCE(v.VehicleType, ft.VehicleType) as vehicleType,
          'Fixed' as vehicleOwnership,
          CASE 
            WHEN COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub) IS NOT NULL 
            THEN CONCAT(DATE_FORMAT(COALESCE(ft.ServiceDate, ft.TransactionDate), '%d/%m/%Y'), ' ', COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub))
            ELSE NULL 
          END as actualStart,
          CASE 
            WHEN COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub) IS NOT NULL 
            THEN CONCAT(DATE_FORMAT(COALESCE(ft.ServiceDate, ft.TransactionDate), '%d/%m/%Y'), ' ', COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub))
            ELSE NULL 
          END as actualEnd,
          ROUND(COALESCE(ft.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub), COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub)), 0)) as transit,
          12 as total,
          CASE 
            WHEN COALESCE(ft.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub), COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub)), 0) > 12 
            THEN ROUND(COALESCE(ft.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub), COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub)), 0) - 12)
            ELSE 0 
          END as extra,
          COALESCE(ft.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub), COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub)), 0) as working,
          ft.OpeningKM as startKm,
          ft.ClosingKM as endKm,
          (ft.ClosingKM - ft.OpeningKM) as distance,
          ft.FixKm as extraKm,
          ft.TransactionID as orderNumber,
          ft.TransactionID as tripLogNumber,
          COALESCE(ft.VFreightFix, cc.fixed_rate, 0) as FreightFix,
          COALESCE(ft.LoadingCharges, 0) as LoadingCharges,
          COALESCE(ft.UnloadingCharges, 0) as UnloadingCharges,
          COALESCE(ft.ParkingCharges, 0) as ParkingCharges,
          COALESCE(ft.TollExpenses, 0) as TollExpenses,
          ft.GSTNo,
          ft.CompanyName,
          ft.Location as ourState,
          ft.CustomerSite as ourBranch,
          cc.fixed_rate as cc_fixed_rate,
          cc.km_include_in_fix_rate as cc_km_include,
          cc.additional_rate_per_km as cc_additional_rate_per_km,
          cc.over_time_charges as cc_over_time_charges,
          cc.no_of_days_per_month as cc_no_of_days_per_month,
          cc.hours as cc_hours,
          cc.description_only_sbs as cc_vertical,
          cc.toll as cc_toll,
          cc.parking as cc_parking,
          cc.state as cc_state,
          vc.fixed_rate as vc_fixed_rate
        FROM fixed_transactions ft
        LEFT JOIN vehicle v ON v.VehicleID = JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))
        LEFT JOIN vendor vend ON vend.VendorID = ft.VendorID
        LEFT JOIN project p ON p.ProjectID = ft.ProjectID
        LEFT JOIN customer_commercial cc ON ft.customer_commercial_id = cc.id
        LEFT JOIN vendor_commercial vc ON ft.vendor_commercial_id = vc.id
        WHERE (? IS NULL OR ft.CustomerID = ? OR (ft.CompanyName IS NOT NULL AND ft.CompanyName LIKE CONCAT('%', ?, '%')) OR ft.CustomerID IN (
            SELECT c2.CustomerID FROM customer c1 JOIN customer c2 ON COALESCE(NULLIF(c1.MasterCustomerName,''), c1.Name) = COALESCE(NULLIF(c2.MasterCustomerName,''), c2.Name) WHERE c1.CustomerID = ?
          ))
          AND (? IS NULL OR ft.ProjectID = ? OR p.ProjectName IN (
            SELECT ProjectName FROM project WHERE ProjectID = ?
          ))
          AND DATE_FORMAT(COALESCE(ft.ServiceDate, ft.TransactionDate), '%Y-%m-%d') BETWEEN ? AND ?
      `;
      params = [
        customerId || null, customerId || null, coreCustomerName || 'NON_MATCHING_DUMMY', customerId || null,
        projectId || null, projectId || null, projectId || null,
        startDate, endDate
      ];
    } else {
      // Adhoc: match by CustomerID + ProjectID + date range
      query = `
        SELECT 
          COALESCE(at.ServiceDate, at.TransactionDate) as date,
          TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(at.CustSite, at.CustomerSite, at.Location, p.ProjectName), ' (', 1), ' - ', -1)) as consignorName,
          p.ProjectName as projectName,
          'COGENT LOGISTICS' as vendor,
          at.VehicleNumber as vehicle,
          at.VehicleType as vehicleType,
          'Adhoc' as vehicleOwnership,
          CASE 
            WHEN COALESCE(at.InTimeByCust, at.VehicleEntryInHub, at.VehicleReportingAtHub) IS NOT NULL 
            THEN CONCAT(DATE_FORMAT(COALESCE(at.ServiceDate, at.TransactionDate), '%d/%m/%Y'), ' ', COALESCE(at.InTimeByCust, at.VehicleEntryInHub, at.VehicleReportingAtHub))
            ELSE NULL 
          END as actualStart,
          CASE 
            WHEN COALESCE(at.OutTimeFrom, at.OutTimeFromHub, at.VehicleReturnAtHub) IS NOT NULL 
            THEN CONCAT(DATE_FORMAT(COALESCE(at.ServiceDate, at.TransactionDate), '%d/%m/%Y'), ' ', COALESCE(at.OutTimeFrom, at.OutTimeFromHub, at.VehicleReturnAtHub))
            ELSE NULL 
          END as actualEnd,
          ROUND(COALESCE(at.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(at.InTimeByCust, at.VehicleEntryInHub, at.VehicleReportingAtHub), COALESCE(at.OutTimeFrom, at.OutTimeFromHub, at.VehicleReturnAtHub)), 0)) as transit,
          12 as total,
          CASE 
            WHEN COALESCE(at.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(at.InTimeByCust, at.VehicleEntryInHub, at.VehicleReportingAtHub), COALESCE(at.OutTimeFrom, at.OutTimeFromHub, at.VehicleReturnAtHub)), 0) > 12 
            THEN ROUND(COALESCE(at.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(at.InTimeByCust, at.VehicleEntryInHub, at.VehicleReportingAtHub), COALESCE(at.OutTimeFrom, at.OutTimeFromHub, at.VehicleReturnAtHub)), 0) - 12)
            ELSE 0 
          END as extra,
          COALESCE(at.TotalDutyHours, TIMESTAMPDIFF(HOUR, COALESCE(at.InTimeByCust, at.VehicleEntryInHub, at.VehicleReportingAtHub), COALESCE(at.OutTimeFrom, at.OutTimeFromHub, at.VehicleReturnAtHub)), 0) as working,
          at.OpeningKM as startKm,
          at.ClosingKM as endKm,
          (at.ClosingKM - at.OpeningKM) as distance,
          at.ExtraKM as extraKm,
          at.TripNo as orderNumber,
          at.TripNo as tripLogNumber,
          COALESCE(at.VFreightFix, at.TotalFreight, cc.fixed_rate, 0) as FreightFix,
          COALESCE(at.VFreightVariable, cc.additional_rate_per_km, 0) as FreightVariable,
          COALESCE(at.LoadingCharges, 0) as LoadingCharges,
          COALESCE(at.UnloadingCharges, 0) as UnloadingCharges,
          COALESCE(at.ParkingCharges, 0) as ParkingCharges,
          at.ExtraKMCost,
          at.DCMCharges,
          at.GSTNo,
          at.CompanyName,
          at.Location as ourState,
          COALESCE(at.CustSite, at.CustomerSite) as ourBranch,
          cc.fixed_rate as cc_fixed_rate,
          cc.additional_rate_per_km as cc_additional_rate_per_km,
          cc.state as cc_state,
          vc.fixed_rate as vc_fixed_rate
        FROM adhoc_transactions at
        LEFT JOIN project p ON p.ProjectID = at.ProjectID
        LEFT JOIN vendor vend ON vend.VendorID = at.VendorID
        LEFT JOIN customer_commercial cc ON at.customer_commercial_id = cc.id
        LEFT JOIN vendor_commercial vc ON at.vendor_commercial_id = vc.id
        WHERE (? IS NULL OR at.CustomerID = ? OR (at.CompanyName IS NOT NULL AND at.CompanyName LIKE CONCAT('%', ?, '%')) OR at.CustomerID IN (
            SELECT c2.CustomerID FROM customer c1 JOIN customer c2 ON COALESCE(NULLIF(c1.MasterCustomerName,''), c1.Name) = COALESCE(NULLIF(c2.MasterCustomerName,''), c2.Name) WHERE c1.CustomerID = ?
          ))
          AND (? IS NULL OR at.ProjectID = ? OR p.ProjectName IN (
            SELECT ProjectName FROM project WHERE ProjectID = ?
          ))
          AND DATE_FORMAT(COALESCE(at.ServiceDate, at.TransactionDate), '%Y-%m-%d') BETWEEN ? AND ?
      `;
      params = [
        customerId || null, customerId || null, coreCustomerName || 'NON_MATCHING_DUMMY', customerId || null,
        projectId || null, projectId || null, projectId || null,
        startDate, endDate
      ];
    }
    
    console.log('[generateReports] tripType:', tripType);
    console.log('[generateReports] params:', params);
    const [rawMisRows]: any = await db.query(query, params);
    console.log('[generateReports] rawMisRows count:', rawMisRows.length);

    const stateFilter = (locationId && String(locationId).trim() && String(locationId) !== 'Select a state...' && String(locationId) !== 'undefined' && String(locationId) !== 'null')
      ? String(locationId).trim()
      : null;

    // Filter misRows strictly by selected state & city mapping
    const misRows = rawMisRows.filter((row: any) => {
      if (!stateFilter) return true;
      const filterLower = stateFilter.toLowerCase();

      const siteRaw = (row.ourBranch || row.consignorName || row.CustomerSite || row.CustSite || '').toLowerCase();
      const upCities = ['noida', 'lucknow', 'ghaziabad', 'kanpur', 'agra', 'varanasi', 'meerut', 'greater noida'];
      const dlCities = ['dwarka', 'delhi', 'janakpuri', 'okhla', 'rohini', 'mayapuri', 'azadpur', 'kapashera', 'narela'];
      const hrCities = ['gurgaon', 'gurugram', 'faridabad', 'manesar', 'sonipat', 'panipat', 'karnal'];

      if (filterLower.includes('delhi') || filterLower === 'dl') {
        if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up')) return false;
        if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr')) return false;
        if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl')) return true;
      }
      
      if (filterLower.includes('uttar pradesh') || filterLower === 'up') {
        if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl')) return false;
        if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr')) return false;
        if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up')) return true;
      }

      if (filterLower.includes('haryana') || filterLower === 'hr') {
        if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl')) return false;
        if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up')) return false;
        if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr')) return true;
      }

      if (row.cc_state) {
        return row.cc_state.toLowerCase().includes(filterLower);
      }

      return siteRaw.includes(filterLower) || (row.ourState && row.ourState.toLowerCase().includes(filterLower));
    });

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

    // Detect if this customer is Flipkart by looking up their name from customer table
    const [customerRows]: any = await db.query(
      "SELECT COALESCE(MasterCustomerName, Name) as customerName FROM customer WHERE CustomerID = ? LIMIT 1",
      [customerId]
    );
    const customerName = (customerRows[0]?.customerName || '').toLowerCase();
    const isFlipkart = customerName.includes('flipkart') || customerName.includes('instakart') || customerName.includes('instra');

    console.log('[generateReports] customerName:', customerName, '| isFlipkart:', isFlipkart);

    // Flipkart specific Annexure logic
    let flipkartAnnexureData: any[] = [];
    let flipkartAdhocAnnexureData: any[] = [];
    
    if (misRows.length > 0) {
      const stateFilter = (locationId && String(locationId).trim() && String(locationId) !== 'Select a state...' && String(locationId) !== 'undefined' && String(locationId) !== 'null')
        ? String(locationId).trim()
        : null;

      if (tripType === 'Fixed') {
        const flipkartMap = new Map();
        const workingDaysInMonth = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).getDate();
      
        // Fetch commercial for exact customer and project, ordered so matching state comes first
        const [commercialRows]: any = await db.query(
          `SELECT * FROM customer_commercial 
           WHERE (customer_id = ? OR ? IS NULL) 
             AND (project_id = ? OR ? IS NULL) 
             AND type_of_vehicle_placement = 'Fixed'
           ORDER BY 
             (CASE WHEN ? IS NOT NULL AND (LOWER(state) = LOWER(?) OR LOWER(state) LIKE CONCAT('%', LOWER(?), '%')) THEN 0 ELSE 1 END),
             id DESC`,
          [customerId, customerId, projectId, projectId, stateFilter, stateFilter, stateFilter]
        );
      
        misRows.forEach((row: any) => {
          const veh = row.vehicle || 'Unknown Vehicle';
        
          // Find specific commercial matching both state and vehicle type, or matching state, or matching vehicle type, or first available
          const comm = commercialRows.find((c: any) => {
            const stateMatches = !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
            const vehMatches = !row.vehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === row.vehicleType.toLowerCase();
            return stateMatches && vehMatches;
          }) || commercialRows.find((c: any) => {
            return !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
          }) || commercialRows.find((c: any) => {
            return !row.vehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === row.vehicleType.toLowerCase();
          }) || commercialRows[0] || {};
        
          const extraKmRate = comm.additional_rate_per_km !== undefined && comm.additional_rate_per_km !== null
            ? Number(comm.additional_rate_per_km)
            : Number(row.cc_additional_rate_per_km || 0);
          const extraHourRate = comm.over_time_charges !== undefined && comm.over_time_charges !== null
            ? Number(comm.over_time_charges)
            : Number(row.cc_over_time_charges || 0);
          const fixedKms = comm.km_include_in_fix_rate !== undefined && comm.km_include_in_fix_rate !== null
            ? Number(comm.km_include_in_fix_rate)
            : Number(row.cc_km_include || 0);
          const fixedRate = comm.fixed_rate !== undefined && comm.fixed_rate !== null
            ? Number(comm.fixed_rate)
            : Number(row.cc_fixed_rate || 0);
          const workingDaysToBeDone = comm.no_of_days_per_month !== undefined && comm.no_of_days_per_month !== null
            ? Number(comm.no_of_days_per_month)
            : Number(row.cc_no_of_days_per_month || workingDaysInMonth);
          const hours = comm.hours !== undefined && comm.hours !== null
            ? Number(comm.hours)
            : Number(row.cc_hours || 0);
          const dieselHike = 0; 
          const totalChargesWithDieselHike = fixedRate + dieselHike;
          const vehicleTypeStr = comm.type_of_vehicle || row.vehicleType || '';
          const mode = row.projectName || (comm.project ? comm.project.split(' / ')[0] : '') || comm.type_of_vehicle_placement || '';
          const vertical = comm.description_only_sbs || row.cc_vertical || 'LM'; 
        
          if (!flipkartMap.has(veh)) {
            flipkartMap.set(veh, {
              sNo: flipkartMap.size + 1,
              vehicleNo: veh,
              typeOfVehicle: vehicleTypeStr,
              mode: mode,
              location: row.ourBranch || row.ourState || row.consignorName,
              vertical: vertical,
              noOfHours: hours,
              fixedKms: fixedKms,
              agreementRate: fixedRate,
              dieselHike: dieselHike,
              totalChargesWithDieselHike: totalChargesWithDieselHike,
              workingDaysToBeDone: workingDaysToBeDone,
              daysActualDone: new Set(),
              dailyOdoMap: new Map(),
              totalKMs: 0,
              extraHour: 0,
              extraHourCharges: 0,
              extraHourRate: extraHourRate,
              extraKmRate: extraKmRate,
              extraKm: 0,
              extraKmCharge: 0,
              totalAmount: 0,
              perDayCost: 0,
              tWorkingDaysAmount: 0,
              tollCharges: 0,
              commTollParking: Number(comm.toll || row.cc_toll || 0) + Number(comm.parking || row.cc_parking || 0),
              amount: 0
            });
          }
        
          const summary = flipkartMap.get(veh);
          const dateKey = new Date(row.date).toISOString().split('T')[0];
          summary.daysActualDone.add(dateKey);

          const startKm = Number(row.startKm || row.OpeningKM || 0);
          const endKm = Number(row.endKm || row.ClosingKM || 0);
          const dist = Number(row.distance || (endKm > startKm ? endKm - startKm : 0) || 0);

          if (!summary.dailyOdoMap.has(dateKey)) {
            summary.dailyOdoMap.set(dateKey, {
              minStart: startKm,
              maxEnd: endKm,
              totalDist: dist,
              hasOdo: (startKm > 0 || endKm > 0)
            });
          } else {
            const dayData = summary.dailyOdoMap.get(dateKey);
            if (startKm > 0 || endKm > 0) {
              dayData.minStart = dayData.minStart === 0 ? startKm : Math.min(dayData.minStart, startKm);
              dayData.maxEnd = Math.max(dayData.maxEnd, endKm);
              dayData.hasOdo = true;
            } else {
              dayData.totalDist += dist;
            }
          }

          summary.tollCharges += Number(row.ParkingCharges || 0) + Number(row.TollExpenses || 0);
        
          // Calculate extra hours for this trip
          const transitHours = Number(row.transit || 0);
          if (transitHours > summary.noOfHours) {
            summary.extraHour += Math.floor(transitHours - summary.noOfHours);
          }
        });
      
        flipkartAnnexureData = Array.from(flipkartMap.values()).map((summary: any) => {
          const actualDays = summary.daysActualDone.size;
          summary.daysActualDone = actualDays;

          let computedTotalKMs = 0;
          if (summary.dailyOdoMap) {
            summary.dailyOdoMap.forEach((dayData: any) => {
              if (dayData.hasOdo && dayData.maxEnd >= dayData.minStart && dayData.maxEnd > 0) {
                computedTotalKMs += (dayData.maxEnd - dayData.minStart);
              } else {
                computedTotalKMs += (dayData.totalDist || 0);
              }
            });
          } else {
            computedTotalKMs = summary.totalKMs;
          }
          summary.totalKMs = computedTotalKMs;
          delete summary.dailyOdoMap;

          if (summary.tollCharges === 0 && summary.commTollParking > 0) {
            summary.tollCharges = summary.commTollParking;
          }
          delete summary.commTollParking;
        
          summary.extraKm = Math.max(summary.totalKMs - summary.fixedKms, 0);
          summary.extraKmCharge = summary.extraKm * summary.extraKmRate;
          summary.extraHourCharges = summary.extraHour * summary.extraHourRate;
        
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
          `SELECT * FROM customer_commercial 
           WHERE (customer_id = ? OR customer_id IS NULL OR ? IS NULL) 
             AND (project_id = ? OR project_id IS NULL OR ? IS NULL)
           ORDER BY 
             (CASE WHEN ? IS NOT NULL AND (LOWER(state) = LOWER(?) OR LOWER(state) LIKE CONCAT('%', LOWER(?), '%')) THEN 0 ELSE 1 END),
             (CASE WHEN LOWER(type_of_vehicle_placement) = 'adhoc' THEN 0 ELSE 1 END),
             id DESC`,
          [customerId, customerId, projectId, projectId, stateFilter, stateFilter, stateFilter]
        );
        
        misRows.forEach((row: any) => {
          const comm = commercialRows.find((c: any) => {
            const stateMatches = !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
            const vehMatches = !row.vehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === row.vehicleType.toLowerCase();
            return stateMatches && vehMatches;
          }) || commercialRows.find((c: any) => {
            return !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
          }) || commercialRows.find((c: any) => {
            return !row.vehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === row.vehicleType.toLowerCase();
          }) || commercialRows[0] || {};

          const extraKmRate = comm.additional_rate_per_km !== undefined && comm.additional_rate_per_km !== null
            ? Number(comm.additional_rate_per_km)
            : Number(row.cc_additional_rate_per_km || row.FreightVariable || 0);
          const fixRate = comm.fixed_rate !== undefined && comm.fixed_rate !== null
            ? Number(comm.fixed_rate)
            : Number(row.cc_fixed_rate || row.FreightFix || 0);
          const handlingRate = (comm.handling_charges_applicable === 1 || comm.handling_charges_applicable === 'Yes' || comm.handling_charges_applicable === true || comm.handling_charges_applicable === '1')
            ? Number(comm.handling_charges || 0)
            : (comm.handling_charges !== undefined && comm.handling_charges !== null ? Number(comm.handling_charges) : Number(row.HandlingCharges || 0));

          const loc = row.consignorName || 'Unknown';
          if (!adhocMap.has(loc)) {
            adhocMap.set(loc, {
              sNo: adhocMap.size + 1,
              location: loc,
              noOfTrips: 0,
              fixRate: fixRate,
              extraKm: 0,
              extraKmRate: extraKmRate,
              handlingRate: handlingRate,
              totalFixCost: 0,
              extraKmCharge: 0,
              handlingCharges: 0,
              amount: 0
            });
          }
          
          const summary = adhocMap.get(loc);
          summary.noOfTrips += 1;
          summary.extraKm += Number(row.extraKm || 0);
          if (handlingRate > 0) {
            summary.handlingRate = handlingRate;
          }
        });
        
        flipkartAdhocAnnexureData = Array.from(adhocMap.values()).map((summary: any) => {
          summary.totalFixCost = summary.fixRate * summary.noOfTrips;
          summary.extraKmCharge = summary.extraKmRate * summary.extraKm;
          summary.handlingCharges = (summary.handlingRate !== undefined ? summary.handlingRate : 0) * summary.noOfTrips;
          summary.amount = summary.totalFixCost + summary.extraKmCharge + summary.handlingCharges;
          return summary;
        });
      }
    }

    return {
      misData: misRows,
      annexureData,
      flipkartAnnexureData,
      flipkartAdhocAnnexureData,
      fallbackCustomerGSTIN: fallbackCustomerGSTIN || fallbackProjectGSTIN || null,
      fallbackProjectGSTIN,
      fallbackProjectTypeOfBilling,
      fallbackProjectGSTRate,
      fallbackProjectBillingTenure,
      fallbackProjectDetails,
      fallbackCustomerAddress,
      fallbackCustomerName,
      fallbackCustomerCompanyName,
      fallbackCustomerTypeOfServices,
      fallbackCustomerServiceCode,
      fallbackCustomerDetails
    };
  },

  calculateDaysDiff: (dueDateVal: any, pay3DateVal: any): string => {
    if (!dueDateVal || !pay3DateVal) return "";
    const parseDateHelper = (val: any): Date | null => {
      if (!val) return null;
      if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
      const s = String(val).trim();
      if (!s) return null;

      const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }

      const ymdMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1;
        const day = parseInt(ymdMatch[3], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }

      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const d1 = parseDateHelper(dueDateVal);
    const d2 = parseDateHelper(pay3DateVal);
    if (!d1 || !d2) return "";
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    const diffDays = Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
    return String(diffDays);
  },

  getPayDelayStatus: (payDaysVal: any): string => {
    if (payDaysVal === null || payDaysVal === undefined || String(payDaysVal).trim() === '') return "";
    const num = Number(payDaysVal);
    if (isNaN(num)) return "";
    return num < 0 ? "Delay" : "Ontime";
  },

  getGlobalInvoiceMaster: async () => {
    // Ensure customer_cndn_notes columns exist on database
    try {
      const [existingCols]: any = await db.query("SHOW COLUMNS FROM customer_cndn_notes");
      const colNames = existingCols.map((c: any) => c.Field);
      if (!colNames.includes('subtotal')) {
        await db.query("ALTER TABLE customer_cndn_notes ADD COLUMN subtotal DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('igst')) {
        await db.query("ALTER TABLE customer_cndn_notes ADD COLUMN igst DECIMAL(15,2) DEFAULT 0.00");
      }
      if (!colNames.includes('cgst')) {
        await db.query("ALTER TABLE customer_cndn_notes ADD COLUMN cgst DECIMAL(15,2) DEFAULT 0.00");
      }
      if (!colNames.includes('sgst')) {
        await db.query("ALTER TABLE customer_cndn_notes ADD COLUMN sgst DECIMAL(15,2) DEFAULT 0.00");
      }
      if (!colNames.includes('grand_total')) {
        await db.query("ALTER TABLE customer_cndn_notes ADD COLUMN grand_total DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('gst_type')) {
        await db.query("ALTER TABLE customer_cndn_notes ADD COLUMN gst_type VARCHAR(50) NULL");
      }
    } catch (e) {
      console.error("Error ensuring customer_cndn_notes columns in getGlobalInvoiceMaster:", e);
    }

    // Ensure customer_invoices columns exist on database
    try {
      const [existingCols]: any = await db.query("SHOW COLUMNS FROM customer_invoices");
      const colNames = existingCols.map((c: any) => c.Field);
      if (!colNames.includes('project')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN project VARCHAR(255) NULL");
      }
      if (!colNames.includes('project_work')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN project_work VARCHAR(255) NULL");
      }
      if (!colNames.includes('location')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN location VARCHAR(255) NULL");
      }
      if (!colNames.includes('hsn')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN hsn VARCHAR(100) NULL");
      }
      if (!colNames.includes('subtotal')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN subtotal DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('igst')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN igst DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('grand_total')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN grand_total DECIMAL(15,2) NULL");
      }
      if (!colNames.includes('cust_gst')) {
        await db.query("ALTER TABLE customer_invoices ADD COLUMN cust_gst VARCHAR(100) NULL");
      }
    } catch (e) {
      console.error("Error ensuring customer_invoices columns in getGlobalInvoiceMaster:", e);
    }

    await ensureGlobalInvoiceManualDataSchema();

    // We fetch customer invoices and join with TMS billing, customer details and customer CNDN notes
    // We also fetch payment collections for these billings.
    const query = `
      SELECT 
        ci.id as finance_id,
        ci.invoice_number as invNo,
        ci.customer_name as custName,
        ci.date as invDate,
        ci.due_date as dueDate,
        ci.amount as invAmt,
        ci.subtotal as ci_subtotal,
        ci.igst as ci_igst,
        ci.grand_total as ci_grand_total,
        ci.cust_gst as ci_cust_gst,
        ci.financial_year as finYear,
        ci.project as ci_project,
        ci.project_work as ci_project_work,
        ci.location as ci_location,
        ci.hsn as ci_hsn,
        
        b.BillingID as billingId,
        b.ProjectID as projectId,
        b.PaymentStatus as payStatus,
        b.GSTRate as gstRate,
        
        cndn.amount as cnAmt,
        cndn.type as cnType,
        cndn.note_number as cnNo,
        cndn.subtotal as cn_subtotal,
        cndn.igst as cn_igst,
        cndn.cgst as cn_cgst,
        cndn.sgst as cn_sgst,
        cndn.grand_total as cn_grand_total,
        cndn.gst_type as cn_gst_type,

        c.GSTNo as customer_table_gst,
        c.PO as customer_table_po,
        c.CreditPeriod as customer_table_credit_days,
        c.TypeOfBilling as customer_table_rcm,
        c.Name as customer_company_name,
        c.MasterCustomerName as customer_master_name,

        m.poNo as m_poNo,
        m.jmsStatus as m_jmsStatus, m.jmsNum as m_jmsNum, m.jmsDate as m_jmsDate, m.subDate as m_subDate,
        m.custName as m_custName, m.proj as m_proj, m.creditDays as m_creditDays, m.projWork as m_projWork, m.loc as m_loc,
        m.revHead as m_revHead, m.hsn as m_hsn, m.invTo as m_invTo, m.rcm as m_rcm,
        m.pay1Amt as m_pay1Amt, m.pay1Date as m_pay1Date, m.pay1Adv as m_pay1Adv,
        m.pay2Amt as m_pay2Amt, m.pay2Date as m_pay2Date, m.pay2Adv as m_pay2Adv,
        m.pay3Amt as m_pay3Amt, m.pay3Date as m_pay3Date, m.pay3Adv as m_pay3Adv,
        m.gstPayAmt as m_gstPayAmt, m.gstPayDate as m_gstPayDate, m.totPay as m_totPay, m.payStatus as m_payStatus
        
      FROM customer_invoices ci
      LEFT JOIN (
        SELECT InvoiceNo, MAX(BillingID) as BillingID, MAX(ProjectID) as ProjectID, MAX(CustomerID) as CustomerID, MAX(PaymentStatus) as PaymentStatus, MAX(GSTRate) as GSTRate
        FROM billing
        WHERE InvoiceNo IS NOT NULL AND InvoiceNo != ''
        GROUP BY InvoiceNo
      ) b ON ci.invoice_number = b.InvoiceNo
      LEFT JOIN customer c ON c.CustomerID = COALESCE(
        b.CustomerID,
        (SELECT CustomerID FROM customer WHERE Name = ci.customer_name LIMIT 1),
        (SELECT CustomerID FROM customer WHERE MasterCustomerName = ci.customer_name LIMIT 1),
        (SELECT CustomerID FROM customer WHERE Name LIKE CONCAT('%', ci.customer_name, '%') LIMIT 1)
      )
      LEFT JOIN (
        SELECT 
          customer_invoice_ref, 
          MAX(amount) as amount, 
          MAX(type) as type, 
          MAX(note_number) as note_number, 
          MAX(subtotal) as subtotal, 
          SUM(COALESCE(igst, 0)) as igst, 
          SUM(COALESCE(cgst, 0)) as cgst, 
          SUM(COALESCE(sgst, 0)) as sgst, 
          SUM(COALESCE(grand_total, 0)) as grand_total, 
          MAX(gst_type) as gst_type 
        FROM customer_cndn_notes 
        WHERE status IS NULL OR status != 'Rejected'
        GROUP BY customer_invoice_ref
      ) cndn ON ci.invoice_number = cndn.customer_invoice_ref
      LEFT JOIN global_invoice_manual_data m ON ci.id = m.invoice_id
      ORDER BY ci.created_at DESC
    `;

    const [rows]: any = await db.query(query);

    // Fetch payment collections for associated billings
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

    const regularRows = rows.map((row: any) => {
      // Subtotal / Taxable Amount (e.g. 9002)
      const invAmt = Number((row.ci_subtotal !== null && row.ci_subtotal !== undefined ? Number(row.ci_subtotal) : (Number(row.invAmt) || 0)).toFixed(2));
      
      // IGST (e.g. 1620.36)
      const IGST = Number((row.ci_igst !== null && row.ci_igst !== undefined ? Number(row.ci_igst) : (invAmt * 0.18)).toFixed(2));
      const SGST = 0;
      const CGST = 0;
      const totGst = Number((IGST + SGST + CGST).toFixed(2));

      // Grand Total after tax (e.g. 10622.36)
      const totInvAmt = Number((row.ci_grand_total !== null && row.ci_grand_total !== undefined ? Number(row.ci_grand_total) : (invAmt + totGst)).toFixed(2));

      const tds = Number((invAmt * 0.02).toFixed(2));
      const payable = Number((totInvAmt - tds).toFixed(2));

      // Customer GST No
      const custGst = (row.ci_cust_gst && String(row.ci_cust_gst).trim() !== '') ? row.ci_cust_gst :
                      (row.customer_table_gst && String(row.customer_table_gst).trim() !== '') ? row.customer_table_gst :
                      "";
      
      // CN Amount calculation
      const cnNo = row.cnNo || "";
      const cnAmtBase = Number(Number(row.cn_subtotal !== null && row.cn_subtotal !== undefined ? row.cn_subtotal : (row.cnAmt || 0)).toFixed(2));
      
      let cnIgst = 0;
      if (row.cn_igst !== null && row.cn_igst !== undefined && Number(row.cn_igst) > 0) {
        cnIgst = Number(Number(row.cn_igst).toFixed(2));
      } else if (row.cn_gst_type === 'with_gst' && (row.cn_igst === null || row.cn_igst === undefined)) {
        cnIgst = Number((cnAmtBase * 0.18).toFixed(2));
      } else {
        cnIgst = 0;
      }

      const cnCgst = Number(Number(row.cn_cgst || 0).toFixed(2));
      const cnSgst = Number(Number(row.cn_sgst || 0).toFixed(2));
      const cnTotGst = Number((cnIgst + cnCgst + cnSgst).toFixed(2));
      const cnTotAmt = Number((cnAmtBase + cnTotGst).toFixed(2));
      
      // Payments
      const billPayments = paymentsMap[row.billingId] || [];

      // Helper to parse numeric values safely
      const parseNum = (val: any) => {
        if (val === null || val === undefined || val === '') return 0;
        const num = Number(String(val).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };

      const p1 = row.m_pay1Amt !== null && row.m_pay1Amt !== undefined ? parseNum(row.m_pay1Amt) : parseNum(billPayments[0]?.PaymentAmount);
      const p2 = row.m_pay2Amt !== null && row.m_pay2Amt !== undefined ? parseNum(row.m_pay2Amt) : parseNum(billPayments[1]?.PaymentAmount);
      const p3 = row.m_pay3Amt !== null && row.m_pay3Amt !== undefined ? parseNum(row.m_pay3Amt) : parseNum(billPayments[2]?.PaymentAmount);
      const gstP = parseNum(row.m_gstPayAmt);

      const calculatedTotPay = Number((p1 + p2 + p3 + gstP).toFixed(2));
      const calculatedOutstanding = Number((payable - calculatedTotPay - cnTotAmt).toFixed(2));

      // Extract Month/Year from invoice date
      const dateObj = row.invDate ? new Date(row.invDate) : new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const invMonth = `${monthNames[dateObj.getMonth()]}-${dateObj.getFullYear().toString().slice(2)}`;

      const resolvedPoNo = (row.m_poNo && String(row.m_poNo).trim() !== '') ? row.m_poNo : (row.customer_table_po || "");
      const resolvedCustName = (row.m_custName && String(row.m_custName).trim() !== '') ? row.m_custName : (row.customer_master_name || row.custName || row.customer_company_name || "");
      const resolvedCreditDays = (row.m_creditDays && String(row.m_creditDays).trim() !== '') ? row.m_creditDays : (row.customer_table_credit_days ? String(row.customer_table_credit_days) : "30");
      const resolvedRcm = (row.m_rcm && String(row.m_rcm).trim() !== '') ? row.m_rcm : (row.customer_table_rcm || "No");

      return {
        id: String(row.finance_id),
        type: "Customer",
        gst: "DL", // Static defaults for missing UI mapped fields
        generationType: "System",
        gstNo: "07AAFCC4715N1ZG",
        invNo: row.invNo,
        poNo: resolvedPoNo,
        invDate: dateObj.toISOString().split('T')[0],
        invMonth: invMonth,
        finYear: row.finYear,
        svcMonth: invMonth,
        jmsStatus: row.m_jmsStatus || row.payStatus || "Pending",
        jmsNum: row.m_jmsNum || "",
        jmsDate: row.m_jmsDate || "",
        subDate: row.m_subDate || dateObj.toISOString().split('T')[0],
        custName: resolvedCustName,
        proj: (row.m_proj && String(row.m_proj).trim() !== '') ? row.m_proj : (row.ci_project || ""),
        creditDays: resolvedCreditDays,
        projWork: (row.m_projWork && String(row.m_projWork).trim() !== '') ? row.m_projWork : (row.ci_project_work || (row.ci_project ? `${row.ci_project} ${row.ci_location || ''}`.trim() : "")),
        loc: (row.m_loc && String(row.m_loc).trim() !== '') ? row.m_loc : (row.ci_location || ""),
        revHead: (row.m_revHead && String(row.m_revHead).trim() !== '') ? row.m_revHead : "Transportation Of Goods by Road",
        hsn: (row.m_hsn && String(row.m_hsn).trim() !== '') ? row.m_hsn : (row.ci_hsn || "996511"),
        invTo: row.m_invTo || row.customer_company_name || row.custName || "",
        rcm: resolvedRcm,
        custGst: custGst,
        
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
        pay1Amt: row.m_pay1Amt !== null && row.m_pay1Amt !== undefined ? row.m_pay1Amt : (billPayments[0]?.PaymentAmount || 0),
        pay1Date: row.m_pay1Date || billPayments[0]?.PaymentDate || "",
        pay1Adv: row.m_pay1Adv || billPayments[0]?.PaymentReference || "",
        
        pay2Amt: row.m_pay2Amt !== null && row.m_pay2Amt !== undefined ? row.m_pay2Amt : (billPayments[1]?.PaymentAmount || 0),
        pay2Date: row.m_pay2Date || billPayments[1]?.PaymentDate || "",
        pay2Adv: row.m_pay2Adv || billPayments[1]?.PaymentReference || "",
        
        pay3Amt: row.m_pay3Amt !== null && row.m_pay3Amt !== undefined ? row.m_pay3Amt : (billPayments[2]?.PaymentAmount || 0),
        pay3Date: row.m_pay3Date || billPayments[2]?.PaymentDate || "",
        pay3Adv: row.m_pay3Adv || billPayments[2]?.PaymentReference || "",
        
        gstPayAmt: row.m_gstPayAmt || 0,
        gstPayDate: row.m_gstPayDate || "",
        totPay: calculatedTotPay,
        
        // CN/DN
        cnNo: cnNo,
        cnAmt: cnAmtBase,
        cnIgst: cnIgst,
        cnCgst: cnCgst,
        cnSgst: cnSgst,
        cnTotGst: cnTotGst,
        cnTotAmt: cnTotAmt,
        
        outstanding: calculatedOutstanding,
        payStatus: row.m_payStatus || (calculatedOutstanding <= 0 ? "Fully Paid" : calculatedTotPay > 0 ? "Partially Paid" : "Pending"),
        payDays: (() => {
          const days = invoiceService.calculateDaysDiff(row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : "", row.m_pay3Date || billPayments[2]?.PaymentDate || "");
          return days;
        })(),
        payDelay: (() => {
          const days = invoiceService.calculateDaysDiff(row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : "", row.m_pay3Date || billPayments[2]?.PaymentDate || "");
          return invoiceService.getPayDelayStatus(days);
        })(),
        netCredit: "30"
      };
    });

    // Also fetch standalone manual rows
    let standaloneRows: any[] = [];
    try {
      const [sRows]: any = await db.query(`
        SELECT * FROM global_invoice_manual_data 
        WHERE is_standalone = 1 OR invoice_id IS NULL 
        ORDER BY id DESC
      `);
      
      standaloneRows = sRows.map((r: any) => {
        const parseNum = (val: any) => {
          if (val === null || val === undefined || val === '') return 0;
          const num = Number(String(val).replace(/,/g, ''));
          return isNaN(num) ? 0 : num;
        };

        const invAmt = parseNum(r.invAmt);
        const igst = parseNum(r.igst);
        const sgst = parseNum(r.sgst);
        const cgst = parseNum(r.cgst);
        const totGst = r.totGst !== null && r.totGst !== undefined ? parseNum(r.totGst) : (igst + sgst + cgst);
        const totInvAmt = r.totInvAmt !== null && r.totInvAmt !== undefined ? parseNum(r.totInvAmt) : (invAmt + totGst);
        const tds = r.tds !== null && r.tds !== undefined ? parseNum(r.tds) : Number((invAmt * 0.02).toFixed(2));
        const payable = r.payable !== null && r.payable !== undefined ? parseNum(r.payable) : (totInvAmt - tds);

        const p1 = parseNum(r.pay1Amt);
        const p2 = parseNum(r.pay2Amt);
        const p3 = parseNum(r.pay3Amt);
        const gstP = parseNum(r.gstPayAmt);
        const totPay = r.totPay !== null && r.totPay !== undefined ? parseNum(r.totPay) : (p1 + p2 + p3 + gstP);

        const cnAmt = parseNum(r.cnAmt);
        const cnIgst = parseNum(r.cnIgst);
        const cnCgst = parseNum(r.cnCgst);
        const cnSgst = parseNum(r.cnSgst);
        const cnTotGst = r.cnTotGst !== null && r.cnTotGst !== undefined ? parseNum(r.cnTotGst) : (cnIgst + cnCgst + cnSgst);
        const cnTotAmt = r.cnTotAmt !== null && r.cnTotAmt !== undefined ? parseNum(r.cnTotAmt) : (cnAmt + cnTotGst);

        const outstanding = r.outstanding !== null && r.outstanding !== undefined ? parseNum(r.outstanding) : (payable - totPay - cnTotAmt);

        return {
          id: r.standalone_id || `manual_${r.id}`,
          isStandalone: true,
          type: "Customer",
          gst: r.gst || "DL",
          generationType: "Manual",
          gstNo: r.gstNo || "07AAFCC4715N1ZG",
          invNo: r.invNo || "",
          poNo: r.poNo || "",
          invDate: r.invDate || "",
          invMonth: r.invMonth || "",
          finYear: r.finYear || "",
          svcMonth: r.svcMonth || "",
          jmsStatus: r.jmsStatus || "Pending",
          jmsNum: r.jmsNum || "",
          jmsDate: r.jmsDate || "",
          subDate: r.subDate || "",
          custName: r.custName || "",
          proj: r.proj || "",
          creditDays: r.creditDays || "30",
          projWork: r.projWork || "",
          loc: r.loc || "",
          revHead: r.revHead || "Transportation Of Goods by Road",
          hsn: r.hsn || "996511",
          invTo: r.invTo || "",
          rcm: r.rcm || "",
          custGst: r.custGst || "",
          invAmt: invAmt,
          igst: igst,
          sgst: sgst,
          cgst: cgst,
          totGst: totGst,
          totInvAmt: totInvAmt,
          tds: tds,
          payable: payable,
          dueDate: r.dueDate || "",
          pay1Amt: r.pay1Amt || 0,
          pay1Date: r.pay1Date || "",
          pay1Adv: r.pay1Adv || "",
          pay2Amt: r.pay2Amt || 0,
          pay2Date: r.pay2Date || "",
          pay2Adv: r.pay2Adv || "",
          pay3Amt: r.pay3Amt || 0,
          pay3Date: r.pay3Date || "",
          pay3Adv: r.pay3Adv || "",
          gstPayAmt: r.gstPayAmt || 0,
          gstPayDate: r.gstPayDate || "",
          totPay: totPay,
          cnNo: r.cnNo || "",
          cnAmt: cnAmt,
          cnIgst: cnIgst,
          cnCgst: cnCgst,
          cnSgst: cnSgst,
          cnTotGst: cnTotGst,
          cnTotAmt: cnTotAmt,
          outstanding: outstanding,
          payStatus: r.payStatus || (outstanding <= 0 ? "Fully Paid" : totPay > 0 ? "Partially Paid" : "Pending"),
          payDays: invoiceService.calculateDaysDiff(r.dueDate, r.pay3Date) || r.payDays || "",
          payDelay: invoiceService.getPayDelayStatus(invoiceService.calculateDaysDiff(r.dueDate, r.pay3Date) || r.payDays) || r.payDelay || "",
          netCredit: r.netCredit || "30"
        };
      });
    } catch (err) {
      console.error("Error fetching standalone manual rows:", err);
    }

    return [...standaloneRows, ...regularRows];
  },

  saveGlobalInvoiceMaster: async (rows: any[]) => {
    await ensureGlobalInvoiceManualDataSchema();

    // Bulk upsert into global_invoice_manual_data
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const parseNum = (v: any) => {
        if (v === null || v === undefined || v === '') return 0;
        const n = Number(String(v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
      };
      
      for (const row of rows) {
        if (!row.id) continue;

        const isStandalone = row.isStandalone || String(row.id).startsWith('manual_');

        const p1 = parseNum(row.pay1Amt);
        const p2 = parseNum(row.pay2Amt);
        const p3 = parseNum(row.pay3Amt);
        const gstP = parseNum(row.gstPayAmt);
        const calculatedTotPay = Number((p1 + p2 + p3 + gstP).toFixed(2));
        const calculatedPayDays = invoiceService.calculateDaysDiff(row.dueDate, row.pay3Date) || row.payDays || null;
        const calculatedPayDelay = invoiceService.getPayDelayStatus(calculatedPayDays) || row.payDelay || null;
        
        if (isStandalone) {
          const invAmt = parseNum(row.invAmt);
          const igst = parseNum(row.igst);
          const sgst = parseNum(row.sgst);
          const cgst = parseNum(row.cgst);
          const totGst = parseNum(row.totGst) || (igst + sgst + cgst);
          const totInvAmt = parseNum(row.totInvAmt) || (invAmt + totGst);
          const tds = parseNum(row.tds) || Number((invAmt * 0.02).toFixed(2));
          const payable = parseNum(row.payable) || (totInvAmt - tds);

          const cnAmt = parseNum(row.cnAmt);
          const cnIgst = parseNum(row.cnIgst);
          const cnCgst = parseNum(row.cnCgst);
          const cnSgst = parseNum(row.cnSgst);
          const cnTotGst = parseNum(row.cnTotGst) || (cnIgst + cnCgst + cnSgst);
          const cnTotAmt = parseNum(row.cnTotAmt) || (cnAmt + cnTotGst);

          const outstanding = parseNum(row.outstanding) || (payable - calculatedTotPay - cnTotAmt);

          const q = `
            INSERT INTO global_invoice_manual_data (
              invoice_id, is_standalone, standalone_id, gst, gstNo, invNo, poNo, invDate, invMonth, finYear, svcMonth,
              jmsStatus, jmsNum, jmsDate, subDate, custName, proj, creditDays, projWork, loc, revHead, hsn, invTo, rcm, custGst,
              invAmt, igst, sgst, cgst, totGst, totInvAmt, tds, payable, dueDate,
              pay1Amt, pay1Date, pay1Adv, pay2Amt, pay2Date, pay2Adv, pay3Amt, pay3Date, pay3Adv,
              gstPayAmt, gstPayDate, totPay, cnNo, cnAmt, cnIgst, cnCgst, cnSgst, cnTotGst, cnTotAmt,
              outstanding, payStatus, payDays, payDelay, netCredit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              gst=VALUES(gst), gstNo=VALUES(gstNo), invNo=VALUES(invNo), poNo=VALUES(poNo), invDate=VALUES(invDate),
              invMonth=VALUES(invMonth), finYear=VALUES(finYear), svcMonth=VALUES(svcMonth),
              jmsStatus=VALUES(jmsStatus), jmsNum=VALUES(jmsNum), jmsDate=VALUES(jmsDate), subDate=VALUES(subDate),
              custName=VALUES(custName), proj=VALUES(proj), creditDays=VALUES(creditDays), projWork=VALUES(projWork), loc=VALUES(loc),
              revHead=VALUES(revHead), hsn=VALUES(hsn), invTo=VALUES(invTo), rcm=VALUES(rcm), custGst=VALUES(custGst),
              invAmt=VALUES(invAmt), igst=VALUES(igst), sgst=VALUES(sgst), cgst=VALUES(cgst), totGst=VALUES(totGst),
              totInvAmt=VALUES(totInvAmt), tds=VALUES(tds), payable=VALUES(payable), dueDate=VALUES(dueDate),
              pay1Amt=VALUES(pay1Amt), pay1Date=VALUES(pay1Date), pay1Adv=VALUES(pay1Adv),
              pay2Amt=VALUES(pay2Amt), pay2Date=VALUES(pay2Date), pay2Adv=VALUES(pay2Adv),
              pay3Amt=VALUES(pay3Amt), pay3Date=VALUES(pay3Date), pay3Adv=VALUES(pay3Adv),
              gstPayAmt=VALUES(gstPayAmt), gstPayDate=VALUES(gstPayDate), totPay=VALUES(totPay),
              cnNo=VALUES(cnNo), cnAmt=VALUES(cnAmt), cnIgst=VALUES(cnIgst), cnCgst=VALUES(cnCgst), cnSgst=VALUES(cnSgst),
              cnTotGst=VALUES(cnTotGst), cnTotAmt=VALUES(cnTotAmt), outstanding=VALUES(outstanding),
              payStatus=VALUES(payStatus), payDays=VALUES(payDays), payDelay=VALUES(payDelay), netCredit=VALUES(netCredit)
          `;

          const values = [
            null, 1, String(row.id), row.gst || 'DL', row.gstNo || '', row.invNo || '', row.poNo || '', row.invDate || '', row.invMonth || '', row.finYear || '', row.svcMonth || '',
            row.jmsStatus || null, row.jmsNum || null, row.jmsDate || null, row.subDate || null,
            row.custName || null, row.proj || null, row.creditDays || '30', row.projWork || null, row.loc || null,
            row.revHead || null, row.hsn || null, row.invTo || null, row.rcm || null, row.custGst || null,
            invAmt, igst, sgst, cgst, totGst, totInvAmt, tds, payable, row.dueDate || null,
            row.pay1Amt || null, row.pay1Date || null, row.pay1Adv || null,
            row.pay2Amt || null, row.pay2Date || null, row.pay2Adv || null,
            row.pay3Amt || null, row.pay3Date || null, row.pay3Adv || null,
            row.gstPayAmt || null, row.gstPayDate || null, calculatedTotPay,
            row.cnNo || null, cnAmt, cnIgst, cnCgst, cnSgst, cnTotGst, cnTotAmt,
            outstanding, row.payStatus || null, calculatedPayDays, calculatedPayDelay, row.netCredit || '30'
          ];

          await connection.query(q, values);
        } else {
          const q = `
            INSERT INTO global_invoice_manual_data (
              invoice_id, poNo, creditDays, jmsStatus, jmsNum, jmsDate, subDate, custName, proj, projWork, loc,
              revHead, hsn, invTo, rcm, pay1Amt, pay1Date, pay1Adv, pay2Amt, pay2Date, pay2Adv,
              pay3Amt, pay3Date, pay3Adv, gstPayAmt, gstPayDate, totPay, payStatus, payDays, payDelay
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              poNo=VALUES(poNo), creditDays=VALUES(creditDays),
              jmsStatus=VALUES(jmsStatus), jmsNum=VALUES(jmsNum), jmsDate=VALUES(jmsDate), subDate=VALUES(subDate),
              custName=VALUES(custName), proj=VALUES(proj), projWork=VALUES(projWork), loc=VALUES(loc),
              revHead=VALUES(revHead), hsn=VALUES(hsn), invTo=VALUES(invTo), rcm=VALUES(rcm),
              pay1Amt=VALUES(pay1Amt), pay1Date=VALUES(pay1Date), pay1Adv=VALUES(pay1Adv),
              pay2Amt=VALUES(pay2Amt), pay2Date=VALUES(pay2Date), pay2Adv=VALUES(pay2Adv),
              pay3Amt=VALUES(pay3Amt), pay3Date=VALUES(pay3Date), pay3Adv=VALUES(pay3Adv),
              gstPayAmt=VALUES(gstPayAmt), gstPayDate=VALUES(gstPayDate), totPay=VALUES(totPay), payStatus=VALUES(payStatus),
              payDays=VALUES(payDays), payDelay=VALUES(payDelay)
          `;
          
          const values = [
            row.id,
            row.poNo || null, row.creditDays || null,
            row.jmsStatus || null, row.jmsNum || null, row.jmsDate || null, row.subDate || null,
            row.custName || null, row.proj || null, row.projWork || null, row.loc || null,
            row.revHead || null, row.hsn || null, row.invTo || null, row.rcm || null,
            row.pay1Amt || null, row.pay1Date || null, row.pay1Adv || null,
            row.pay2Amt || null, row.pay2Date || null, row.pay2Adv || null,
            row.pay3Amt || null, row.pay3Date || null, row.pay3Adv || null,
            row.gstPayAmt || null, row.gstPayDate || null, calculatedTotPay, row.payStatus || null,
            calculatedPayDays, calculatedPayDelay
          ];
          
          await connection.query(q, values);
        }
      }
      
      await connection.commit();
      return { success: true };
    } catch (err) {
      await connection.rollback();
      console.error("Error in saveGlobalInvoiceMaster:", err);
      throw err;
    } finally {
      connection.release();
    }
  }
};
