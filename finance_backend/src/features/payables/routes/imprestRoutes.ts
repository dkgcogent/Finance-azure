import { Router } from 'express';
import { imprestController } from '../controllers/imprestController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// Apply auth middleware to all imprest routes
router.use(authenticateToken);

router.post('/', imprestController.createImprest);
router.get('/', imprestController.getImprests);
router.get('/tms-data', imprestController.getTmsData);
router.put('/:id/status', imprestController.updateImprestStatus);

// Bank Payment Sheet storage & history routes
router.post('/bank-payment-sheets', imprestController.saveBankPaymentSheet);
router.get('/bank-payment-sheets', imprestController.getBankPaymentSheets);
router.get('/bank-payment-sheets/:batchId', imprestController.getBankPaymentSheetBatch);

export default router;
