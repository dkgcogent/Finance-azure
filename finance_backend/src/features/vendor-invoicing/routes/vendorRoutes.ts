import { Router } from 'express';
import { 
  getVendors, 
  getVendorTrips, 
  saveVendorInvoice, 
  getVendorInvoicesList, 
  saveVendorCNDN, 
  getVendorCNDNList, 
  getNextInvoiceNumber,
  saveVendorBankPaymentSheet,
  getVendorBankPaymentSheets,
  getVendorBankPaymentSheetBatch
} from '../controllers/vendorController';

const router = Router();

router.get('/', getVendors);
router.get('/trips', getVendorTrips);
router.get('/next-number', getNextInvoiceNumber);
router.post('/save', saveVendorInvoice);
router.get('/invoices', getVendorInvoicesList);
router.post('/cndn/save', saveVendorCNDN);
router.get('/cndn/list', getVendorCNDNList);

// Vendor Bank Payment Sheet routes
router.post('/bank-payment-sheets', saveVendorBankPaymentSheet);
router.get('/bank-payment-sheets', getVendorBankPaymentSheets);
router.get('/bank-payment-sheets/:batchId', getVendorBankPaymentSheetBatch);

export default router;

