import { Router } from 'express';
import { getVendors, getVendorTrips, saveVendorInvoice, getVendorInvoicesList, saveVendorCNDN, getVendorCNDNList } from '../controllers/vendorController';

const router = Router();

router.get('/', getVendors);
router.get('/trips', getVendorTrips);
router.post('/save', saveVendorInvoice);
router.get('/invoices', getVendorInvoicesList);
router.post('/cndn/save', saveVendorCNDN);
router.get('/cndn/list', getVendorCNDNList);

export default router;
