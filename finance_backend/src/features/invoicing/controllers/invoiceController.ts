import { Request, Response } from 'express';
import { invoiceService } from '../services/invoiceService';
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

export const invoiceController = {
  getInvoiceStatusSummary: async (req: Request, res: Response) => {
    try {
      // const summary = await invoiceService.getInvoiceStatusSummary();
      res.json({});
    } catch (error) {
      console.error('Error fetching invoice status summary:', error);
      res.status(500).json({ message: 'Failed to fetch invoice status summary' });
    }
  },

  getGlobalInvoiceMaster: async (req: Request, res: Response) => {
    try {
      const data = await invoiceService.getGlobalInvoiceMaster();
      res.json(data);
    } catch (error) {
      console.error('Error fetching global invoice master:', error);
      res.status(500).json({ message: 'Failed to fetch global invoice master' });
    }
  },

  saveGlobalInvoiceMaster: async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ message: 'Invalid rows provided' });
      }
      await invoiceService.saveGlobalInvoiceMaster(rows);
      res.json({ message: 'Saved successfully' });
    } catch (error) {
      console.error('Error saving global invoice master:', error);
      res.status(500).json({ message: 'Failed to save global invoice master' });
    }
  },

  saveCustomerCNDN: async (req: Request, res: Response) => {
    try {
      const { noteNumber, type, customerInvoiceRef, amount, date, reason, remarks, html } = req.body;

      if (!noteNumber || !type || !customerInvoiceRef || amount === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let finalAzureUrl = null;

      if (html) {
        try {
          const puppeteerModule = await import('puppeteer');
          const puppeteer = puppeteerModule.default || puppeteerModule;
          const browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: 'load' });
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
        } catch (error) {
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

      await pool.query(insertQuery, [
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
    } catch (error) {
      console.error('Error saving customer CN/DN:', error);
      res.status(500).json({ error: 'Failed to save customer CN/DN' });
    }
  },

  getCustomerCNDNList: async (req: Request, res: Response) => {
    try {
      const [rows] = await pool.query(`
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
    } catch (error) {
      console.error('Error fetching customer CN/DN notes:', error);
      res.status(500).json({ error: 'Failed to fetch customer CN/DN notes' });
    }
  },

  getInvoices: async (req: Request, res: Response) => {
    try {
      const invoices = await invoiceService.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  },

  createInvoice: async (req: Request, res: Response) => {
    try {
      const result = await invoiceService.saveInvoice(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error saving invoice:', error);
      res.status(500).json({ message: 'Failed to save invoice and upload to Azure' });
    }
  },

  getCustomers: async (req: Request, res: Response) => {
    try {
      const customers = await invoiceService.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  },

  getProjects: async (req: Request, res: Response) => {
    try {
      const projects = await invoiceService.getProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  },

  getLocations: async (req: Request, res: Response) => {
    try {
      const locations = await invoiceService.getLocations();
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  },

  generateReports: async (req: Request, res: Response) => {
    try {
      const { customerId, projectId, locationId, tripType, startDate, endDate } = req.body;
      
      if (!customerId || !tripType || !startDate || !endDate) {
        return res.status(400).json({ message: 'Missing required filters' });
      }

      const reports = await invoiceService.generateReports({
        customerId,
        projectId,
        locationId,
        tripType,
        startDate,
        endDate
      });
      
      res.json(reports);
    } catch (error) {
      console.error('Error generating reports:', error);
      res.status(500).json({ message: 'Failed to generate reports' });
    }
  }
};
