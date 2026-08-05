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

export default router;
