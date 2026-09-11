import { Router } from 'express';
import { salaryController } from '../controllers/salaryController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// Apply auth middleware to all salary routes
router.use(authenticateToken);

router.get('/sheet', salaryController.getSalarySheet);
router.get('/pending-approvals', salaryController.getPendingApprovals);
router.put('/sheets/:id/status', salaryController.updateSheetStatus);

// Salary Bank Payment Sheet routes
router.post('/bank-payment-sheets', salaryController.saveBankPaymentSheet);
router.get('/bank-payment-sheets', salaryController.getBankPaymentSheets);
router.get('/bank-payment-sheets/:batchId', salaryController.getBankPaymentSheetBatch);

export default router;
