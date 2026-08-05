import { Router } from 'express';
import { salaryController } from '../controllers/salaryController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

router.get('/sheet', authenticateToken, salaryController.getSalarySheet);

export default router;
