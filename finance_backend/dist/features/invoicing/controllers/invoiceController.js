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
exports.invoiceController = void 0;
const invoiceService_1 = require("../services/invoiceService");
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
exports.invoiceController = {
    getInvoiceStatusSummary: async (req, res) => {
        try {
            // const summary = await invoiceService.getInvoiceStatusSummary();
            res.json({});
        }
        catch (error) {
            console.error('Error fetching invoice status summary:', error);
            res.status(500).json({ message: 'Failed to fetch invoice status summary' });
        }
    },
    getGlobalInvoiceMaster: async (req, res) => {
        try {
            const data = await invoiceService_1.invoiceService.getGlobalInvoiceMaster();
            res.json(data);
        }
        catch (error) {
            console.error('Error fetching global invoice master:', error);
            res.status(500).json({ message: 'Failed to fetch global invoice master' });
        }
    },
    saveGlobalInvoiceMaster: async (req, res) => {
        try {
            const { rows } = req.body;
            if (!rows || !Array.isArray(rows)) {
                return res.status(400).json({ message: 'Invalid rows provided' });
            }
            await invoiceService_1.invoiceService.saveGlobalInvoiceMaster(rows);
            res.json({ message: 'Saved successfully' });
        }
        catch (error) {
            console.error('Error saving global invoice master:', error);
            res.status(500).json({ message: 'Failed to save global invoice master' });
        }
    },
    saveCustomerCNDN: async (req, res) => {
        try {
            const { noteNumber, type, customerInvoiceRef, amount, date, reason, remarks, html } = req.body;
            if (!noteNumber || !type || !customerInvoiceRef || amount === undefined) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            let finalAzureUrl = null;
            if (html) {
                try {
                    let browser;
                    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
                        const chromium = (await Promise.resolve().then(() => __importStar(require('@sparticuz/chromium')))).default;
                        const puppeteerCore = (await Promise.resolve().then(() => __importStar(require('puppeteer-core')))).default;
                        browser = await puppeteerCore.launch({
                            args: chromium.args,
                            executablePath: await chromium.executablePath(),
                            headless: true,
                        });
                    }
                    else {
                        const puppeteerModule = await Promise.resolve().then(() => __importStar(require('puppeteer')));
                        const puppeteer = puppeteerModule.default || puppeteerModule;
                        browser = await puppeteer.launch({ headless: true });
                    }
                    const page = await browser.newPage();
                    await page.setContent(html, { waitUntil: 'networkidle0' });
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
                    const blobName = `customer-cndn/${noteNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    await blockBlobClient.uploadData(Buffer.from(pdfBuffer), {
                        blobHTTPHeaders: { blobContentType: 'application/pdf' }
                    });
                    finalAzureUrl = blockBlobClient.url;
                }
                catch (error) {
                    console.error('Failed to generate PDF or upload to Azure:', error);
                    throw error;
                }
            }
            const insertQuery = `
        INSERT INTO customer_cndn_notes (
          note_number, type, customer_invoice_ref, amount, date, reason, remarks, azure_blob_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
            const cndnDate = date ? new Date(date) : new Date();
            await database_1.db.query(insertQuery, [
                noteNumber,
                type,
                customerInvoiceRef,
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
        }
        catch (error) {
            console.error('Error saving customer CN/DN:', error);
            res.status(500).json({ error: 'Failed to save customer CN/DN' });
        }
    },
    getCustomerCNDNList: async (req, res) => {
        try {
            const [rows] = await database_1.db.query(`
        SELECT 
          cndn.id, 
          cndn.note_number AS noteNumber, 
          cndn.type, 
          cndn.customer_invoice_ref AS invoiceRef, 
          cndn.amount, 
          cndn.date, 
          cndn.reason, 
          cndn.remarks, 
          cndn.azure_blob_url, 
          cndn.status,
          ci.customer_name AS customerOrVendor
        FROM customer_cndn_notes cndn
        LEFT JOIN customer_invoices ci ON cndn.customer_invoice_ref = ci.invoice_number
        ORDER BY cndn.id DESC
      `);
            res.json(rows);
        }
        catch (error) {
            console.error('Error fetching customer CN/DN notes:', error);
            res.status(500).json({ error: 'Failed to fetch customer CN/DN notes' });
        }
    },
    getInvoices: async (req, res) => {
        try {
            const invoices = await invoiceService_1.invoiceService.getInvoices();
            res.json(invoices);
        }
        catch (error) {
            console.error('Error fetching invoices:', error);
            res.status(500).json({ message: 'Failed to fetch invoices' });
        }
    },
    createInvoice: async (req, res) => {
        try {
            const result = await invoiceService_1.invoiceService.saveInvoice(req.body);
            res.status(201).json(result);
        }
        catch (error) {
            console.error('Error saving invoice:', error);
            res.status(500).json({ message: 'Failed to save invoice and upload to Azure' });
        }
    },
    getCustomers: async (req, res) => {
        try {
            const customers = await invoiceService_1.invoiceService.getCustomers();
            res.json(customers);
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            res.status(500).json({ message: 'Failed to fetch customers' });
        }
    },
    getProjects: async (req, res) => {
        try {
            const projects = await invoiceService_1.invoiceService.getProjects();
            res.json(projects);
        }
        catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ message: 'Failed to fetch projects' });
        }
    },
    getLocations: async (req, res) => {
        try {
            const locations = await invoiceService_1.invoiceService.getLocations();
            res.json(locations);
        }
        catch (error) {
            console.error('Error fetching locations:', error);
            res.status(500).json({ message: 'Failed to fetch locations' });
        }
    },
    generateReports: async (req, res) => {
        try {
            const { customerId, projectId, locationId, tripType, startDate, endDate } = req.body;
            if (!customerId || !tripType || !startDate || !endDate) {
                return res.status(400).json({ message: 'Missing required filters' });
            }
            const reports = await invoiceService_1.invoiceService.generateReports({
                customerId,
                projectId,
                locationId,
                tripType,
                startDate,
                endDate
            });
            res.json(reports);
        }
        catch (error) {
            console.error('Error generating reports:', error);
            res.status(500).json({ message: 'Failed to generate reports' });
        }
    }
};
