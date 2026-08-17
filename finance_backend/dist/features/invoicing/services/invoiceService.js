"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceService = void 0;
const database_1 = require("../../../config/database");
const storage_blob_1 = require("@azure/storage-blob");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getBlobServiceClient = () => {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error('Azure Storage Connection string not found');
    }
    return storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
};
exports.invoiceService = {
    getInvoices: async () => {
        const [rows] = await database_1.db.query(`
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
        const [rows] = await database_1.db.query("SELECT CustomerID as id, COALESCE(MasterCustomerName, Name) as name, GSTNo as gstNo, COALESCE(CustomerRegisteredOfficeAddress, CustomerCorporateOfficeAddress) as address FROM customer");
        return rows;
    },
    getProjects: async () => {
        const [rows] = await database_1.db.query("SELECT ProjectID as id, ProjectName as name, CustomerID as customerId FROM project");
        return rows;
    },
    getLocations: async () => {
        const [rows] = await database_1.db.query("SELECT DISTINCT Location as id, TRIM(SUBSTRING_INDEX(Location, '-', 1)) as name, CustomerID as customerId FROM project WHERE Location IS NOT NULL AND Location != ''");
        return rows;
    },
    saveInvoice: async (data) => {
        // Ensure columns exist on customer_invoices table
        try {
            const [existingCols] = await database_1.db.query("SHOW COLUMNS FROM customer_invoices");
            const colNames = existingCols.map((c) => c.Field);
            if (!colNames.includes('project')) {
                await database_1.db.query("ALTER TABLE customer_invoices ADD COLUMN project VARCHAR(255) NULL");
            }
            if (!colNames.includes('project_work')) {
                await database_1.db.query("ALTER TABLE customer_invoices ADD COLUMN project_work VARCHAR(255) NULL");
            }
            if (!colNames.includes('location')) {
                await database_1.db.query("ALTER TABLE customer_invoices ADD COLUMN location VARCHAR(255) NULL");
            }
            if (!colNames.includes('hsn')) {
                await database_1.db.query("ALTER TABLE customer_invoices ADD COLUMN hsn VARCHAR(100) NULL");
            }
        }
        catch (e) {
            console.error("Error ensuring customer_invoices columns:", e);
        }
        const { html, invoiceNumber, customerName, date, dueDate, amount, status, format, financialYear, project, projectWork, location, hsn } = data;
        let azureBlobUrl = null;
        if (html) {
            try {
                // Generate PDF using Puppeteer
                let browser;
                if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
                    const chromium = (await Promise.resolve().then(() => __importStar(require('@sparticuz/chromium')))).default;
                    const puppeteerCore = (await Promise.resolve().then(() => __importStar(require('puppeteer-core')))).default;
                    browser = await puppeteerCore.launch({
                        args: chromium.args,
                        defaultViewport: chromium.defaultViewport,
                        executablePath: await chromium.executablePath(),
                        headless: chromium.headless ?? true,
                    });
                }
                else {
                    const puppeteerModule = await Promise.resolve().then(() => __importStar(require('puppeteer')));
                    const puppeteer = puppeteerModule.default || puppeteerModule;
                    browser = await puppeteer.launch({ headless: true });
                }
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
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
            }
            catch (error) {
                console.error('Failed to generate PDF or upload to Azure:', error);
                throw error;
            }
        }
        // Insert into DB
        const [result] = await database_1.db.query(`INSERT INTO customer_invoices 
       (invoice_number, customer_name, date, due_date, amount, status, format, financial_year, azure_blob_url, project, project_work, location, hsn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            invoiceNumber,
            customerName,
            date,
            dueDate,
            amount,
            status || 'Pending',
            format,
            financialYear,
            azureBlobUrl,
            project || null,
            projectWork || null,
            location || null,
            hsn || '996511'
        ]);
        const invoiceId = result.insertId;
        // Auto-populate global_invoice_manual_data for Global Invoice Master
        try {
            await database_1.db.query(`INSERT INTO global_invoice_manual_data (
          invoice_id, custName, proj, projWork, loc, hsn, subDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          custName = VALUES(custName),
          proj = VALUES(proj),
          projWork = VALUES(projWork),
          loc = VALUES(loc),
          hsn = VALUES(hsn),
          subDate = VALUES(subDate)`, [
                invoiceId,
                customerName || null,
                project || null,
                projectWork || null,
                location || null,
                hsn || '996511',
                date || null
            ]);
        }
        catch (e) {
            console.error("Error auto-populating global_invoice_manual_data:", e);
        }
        return {
            id: invoiceId,
            invoiceNumber,
            azureBlobUrl
        };
    },
    generateReports: async (filters) => {
        const { customerId, projectId, locationId, tripType, startDate, endDate } = filters;
        // Fetch the default customer GSTIN from the customer table as a fallback
        let fallbackCustomerGSTIN = null;
        let fallbackCustomerAddress = null;
        try {
            const [customerRows] = await database_1.db.query("SELECT GSTNo, COALESCE(CustomerRegisteredOfficeAddress, CustomerCorporateOfficeAddress) as address FROM customer WHERE CustomerID = ?", [customerId]);
            if (customerRows.length > 0) {
                fallbackCustomerGSTIN = customerRows[0].GSTNo;
                fallbackCustomerAddress = customerRows[0].address;
            }
        }
        catch (e) {
            console.error("Error fetching fallback customer GSTIN:", e);
        }
        // Fetch MIS data
        let query = '';
        let params = [];
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
          vc.fixed_rate as vc_fixed_rate
        FROM fixed_transactions ft
        LEFT JOIN vehicle v ON v.VehicleID = JSON_UNQUOTE(JSON_EXTRACT(ft.VehicleIDs, '$[0]'))
        LEFT JOIN vendor vend ON vend.VendorID = ft.VendorID
        LEFT JOIN project p ON p.ProjectID = ft.ProjectID
        LEFT JOIN customer_commercial cc ON ft.customer_commercial_id = cc.id
        LEFT JOIN vendor_commercial vc ON ft.vendor_commercial_id = vc.id
        WHERE (ft.CustomerID = ? OR ? IS NULL)
          AND (ft.ProjectID = ? OR ? IS NULL)
          AND COALESCE(ft.ServiceDate, ft.TransactionDate) BETWEEN ? AND ?
      `;
            params = [customerId, customerId, projectId || null, projectId || null, startDate, endDate];
        }
        else {
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
          vc.fixed_rate as vc_fixed_rate
        FROM adhoc_transactions at
        LEFT JOIN project p ON p.ProjectID = at.ProjectID
        LEFT JOIN vendor vend ON vend.VendorID = at.VendorID
        LEFT JOIN customer_commercial cc ON at.customer_commercial_id = cc.id
        LEFT JOIN vendor_commercial vc ON at.vendor_commercial_id = vc.id
        WHERE (at.CustomerID = ? OR ? IS NULL)
          AND (at.ProjectID = ? OR ? IS NULL)
          AND COALESCE(at.ServiceDate, at.TransactionDate) BETWEEN ? AND ?
      `;
            params = [customerId, customerId, projectId || null, projectId || null, startDate, endDate];
        }
        console.log('[generateReports] tripType:', tripType);
        console.log('[generateReports] params:', params);
        const [misRows] = await database_1.db.query(query, params);
        console.log('[generateReports] misRows count:', misRows.length);
        // Generate Annexure from MIS
        const annexureMap = new Map();
        misRows.forEach((row) => {
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
        const [customerRows] = await database_1.db.query("SELECT COALESCE(MasterCustomerName, Name) as customerName FROM customer WHERE CustomerID = ? LIMIT 1", [customerId]);
        const customerName = (customerRows[0]?.customerName || '').toLowerCase();
        const isFlipkart = customerName.includes('flipkart') || customerName.includes('instakart') || customerName.includes('instra');
        console.log('[generateReports] customerName:', customerName, '| isFlipkart:', isFlipkart);
        // Flipkart specific Annexure logic
        let flipkartAnnexureData = [];
        let flipkartAdhocAnnexureData = [];
        if (misRows.length > 0) {
            if (tripType === 'Fixed') {
                const flipkartMap = new Map();
                const workingDaysInMonth = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).getDate();
                // Fetch commercial for exact customer and project
                const [commercialRows] = await database_1.db.query("SELECT * FROM customer_commercial WHERE (customer_id = ? OR ? IS NULL) AND (project_id = ? OR ? IS NULL) AND type_of_vehicle_placement = 'Fixed'", [customerId, customerId, projectId, projectId]);
                misRows.forEach((row) => {
                    const veh = row.vehicle || 'Unknown Vehicle';
                    // Find specific commercial for this vehicle type, or fallback to row's joined cc values, or first match
                    const comm = commercialRows.find((c) => c.type_of_vehicle === row.vehicleType) || commercialRows[0] || {};
                    const extraKmRate = Number(row.cc_additional_rate_per_km || comm.additional_rate_per_km || 0);
                    const extraHourRate = Number(row.cc_over_time_charges || comm.over_time_charges || 0);
                    const fixedKms = Number(row.cc_km_include || comm.km_include_in_fix_rate || 0);
                    const fixedRate = Number(row.cc_fixed_rate || comm.fixed_rate || 0);
                    const workingDaysToBeDone = Number(row.cc_no_of_days_per_month || comm.no_of_days_per_month || workingDaysInMonth);
                    const hours = Number(row.cc_hours || comm.hours || 0);
                    const dieselHike = 0;
                    const totalChargesWithDieselHike = fixedRate + dieselHike;
                    const vehicleTypeStr = comm.type_of_vehicle || row.vehicleType || '';
                    const mode = row.projectName || (comm.project ? comm.project.split(' / ')[0] : '') || comm.type_of_vehicle_placement || '';
                    const vertical = row.cc_vertical || comm.description_only_sbs || 'LM';
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
                            commTollParking: Number(row.cc_toll || comm.toll || 0) + Number(row.cc_parking || comm.parking || 0),
                            amount: 0
                        });
                    }
                    const summary = flipkartMap.get(veh);
                    summary.daysActualDone.add(new Date(row.date).toISOString().split('T')[0]);
                    summary.totalKMs += Number(row.distance || 0);
                    summary.tollCharges += Number(row.ParkingCharges || 0) + Number(row.TollExpenses || 0);
                    // Calculate extra hours for this trip
                    const transitHours = Number(row.transit || 0);
                    if (transitHours > summary.noOfHours) {
                        summary.extraHour += Math.floor(transitHours - summary.noOfHours);
                    }
                });
                flipkartAnnexureData = Array.from(flipkartMap.values()).map((summary) => {
                    const actualDays = summary.daysActualDone.size;
                    summary.daysActualDone = actualDays;
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
            }
            else if (tripType === 'Adhoc') {
                const adhocMap = new Map();
                const [commercialRows] = await database_1.db.query("SELECT * FROM customer_commercial WHERE (customer_id = ? OR customer_id IS NULL OR ? IS NULL) AND (project_id = ? OR project_id IS NULL OR ? IS NULL)", [customerId, customerId, projectId, projectId]);
                misRows.forEach((row) => {
                    const comm = commercialRows.find((c) => c.type_of_vehicle === row.vehicleType) || commercialRows[0] || {};
                    const extraKmRate = Number(row.cc_additional_rate_per_km || comm.additional_rate_per_km || row.FreightVariable || 0);
                    const fixRate = Number(row.cc_fixed_rate || comm.fixed_rate || row.FreightFix || 0);
                    const loc = row.consignorName || 'Unknown';
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
                flipkartAdhocAnnexureData = Array.from(adhocMap.values()).map((summary) => {
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
            flipkartAdhocAnnexureData,
            fallbackCustomerGSTIN,
            fallbackCustomerAddress
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
        ci.project as ci_project,
        ci.project_work as ci_project_work,
        ci.location as ci_location,
        ci.hsn as ci_hsn,
        
        MIN(b.BillingID) as billingId,
        MIN(b.ProjectID) as projectId,
        MIN(b.PaymentStatus) as payStatus,
        MIN(b.GSTRate) as gstRate,
        
        MIN(cndn.amount) as cnAmt,
        MIN(cndn.type) as cnType,
        MIN(cndn.note_number) as cnNo,

        MIN(p.ProjectName) as linkedProjectName,
        MIN(p.Location) as linkedLocation,

        MIN(m.jmsStatus) as m_jmsStatus, MIN(m.jmsNum) as m_jmsNum, MIN(m.jmsDate) as m_jmsDate, MIN(m.subDate) as m_subDate,
        MIN(m.custName) as m_custName, MIN(m.proj) as m_proj, MIN(m.projWork) as m_projWork, MIN(m.loc) as m_loc,
        MIN(m.revHead) as m_revHead, MIN(m.hsn) as m_hsn, MIN(m.invTo) as m_invTo, MIN(m.rcm) as m_rcm,
        MIN(m.pay1Amt) as m_pay1Amt, MIN(m.pay1Date) as m_pay1Date, MIN(m.pay1Adv) as m_pay1Adv,
        MIN(m.pay2Amt) as m_pay2Amt, MIN(m.pay2Date) as m_pay2Date, MIN(m.pay2Adv) as m_pay2Adv,
        MIN(m.pay3Amt) as m_pay3Amt, MIN(m.pay3Date) as m_pay3Date, MIN(m.pay3Adv) as m_pay3Adv,
        MIN(m.gstPayAmt) as m_gstPayAmt, MIN(m.gstPayDate) as m_gstPayDate, MIN(m.totPay) as m_totPay, MIN(m.payStatus) as m_payStatus
        
      FROM customer_invoices ci
      LEFT JOIN billing b ON ci.invoice_number = b.InvoiceNo
      LEFT JOIN customer c ON (ci.customer_name = c.Name OR ci.customer_name = c.MasterCustomerName)
      LEFT JOIN project p ON (b.ProjectID = p.ProjectID OR p.CustomerID = c.CustomerID)
      LEFT JOIN customer_cndn_notes cndn ON ci.invoice_number = cndn.customer_invoice_ref AND cndn.status = 'Approved'
      LEFT JOIN global_invoice_manual_data m ON ci.id = m.invoice_id
      GROUP BY ci.id, ci.invoice_number, ci.customer_name, ci.date, ci.due_date, ci.amount, ci.financial_year, ci.project, ci.project_work, ci.location, ci.hsn
      ORDER BY ci.created_at DESC
    `;
        const [rows] = await database_1.db.query(query);
        // Fetch payments for the associated billings
        const billingIds = rows.map((r) => r.billingId).filter(Boolean);
        let paymentsMap = {};
        if (billingIds.length > 0) {
            const [payments] = await database_1.db.query(`SELECT BillingID, PaymentDate, PaymentAmount, PaymentReference 
         FROM paymentcollection 
         WHERE BillingID IN (?)
         ORDER BY PaymentDate ASC`, [billingIds]);
            payments.forEach((p) => {
                if (!paymentsMap[p.BillingID])
                    paymentsMap[p.BillingID] = [];
                paymentsMap[p.BillingID].push(p);
            });
        }
        return rows.map((row) => {
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
                custName: (row.m_custName && String(row.m_custName).trim() !== '') ? row.m_custName : (row.custName || ""),
                proj: (row.m_proj && String(row.m_proj).trim() !== '') ? row.m_proj : (row.ci_project || row.linkedProjectName || ""),
                creditDays: "30",
                projWork: (row.m_projWork && String(row.m_projWork).trim() !== '') ? row.m_projWork : (row.ci_project_work || (row.ci_project ? `${row.ci_project} ${row.ci_location || ''}`.trim() : (row.linkedProjectName ? `${row.linkedProjectName} ${row.ci_location || row.linkedLocation || ''}`.trim() : ""))),
                loc: (row.m_loc && String(row.m_loc).trim() !== '') ? row.m_loc : (row.ci_location || row.linkedLocation || ""),
                revHead: (row.m_revHead && String(row.m_revHead).trim() !== '') ? row.m_revHead : "Transportation Of Goods by Road",
                hsn: (row.m_hsn && String(row.m_hsn).trim() !== '') ? row.m_hsn : (row.ci_hsn || "996511"),
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
    saveGlobalInvoiceMaster: async (rows) => {
        // Bulk upsert into global_invoice_manual_data
        const connection = await database_1.db.getConnection();
        try {
            await connection.beginTransaction();
            for (const row of rows) {
                if (!row.id)
                    continue;
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
        }
        catch (err) {
            await connection.rollback();
            throw err;
        }
        finally {
            connection.release();
        }
    }
};
