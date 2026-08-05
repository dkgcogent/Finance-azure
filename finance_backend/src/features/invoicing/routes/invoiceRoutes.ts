import { Router } from 'express';
import { invoiceController } from '../controllers/invoiceController';
import express from 'express';

const router = Router();

// Need to parse large HTML payload for PDF generation
router.post('/', express.json({ limit: '50mb' }), invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices);

router.post('/cndn/save', express.json({ limit: '50mb' }), invoiceController.saveCustomerCNDN);
router.get('/cndn/list', invoiceController.getCustomerCNDNList);
router.get('/global-master', invoiceController.getGlobalInvoiceMaster);
router.post('/global-master/save', invoiceController.saveGlobalInvoiceMaster);

router.get('/customers', invoiceController.getCustomers);
router.get('/projects', invoiceController.getProjects);
router.get('/locations', invoiceController.getLocations);
router.post('/generate-reports', invoiceController.generateReports);

export const invoiceRoutes = router;
