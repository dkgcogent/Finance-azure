import { Router } from 'express';
import { salaryController } from '../controllers/salaryController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// Apply auth middleware to all salary routes
router.use(authenticateToken);

router.get('/sheet', salaryController.getSalarySheet);
router.get('/pending-approvals', salaryController.getPendingApprovals);
router.put('/sheets/:id/status', salaryController.updateSheetStatus);

export default router;
