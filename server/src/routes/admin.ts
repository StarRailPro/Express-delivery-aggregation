import { Router } from 'express';
import { getApiStats } from '../controllers/adminController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/api-stats', authMiddleware, getApiStats);

export default router;
