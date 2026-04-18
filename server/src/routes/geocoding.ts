import { Router } from 'express';
import { parseCity, batchParseAndGeocode } from '../controllers/geocodingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/parse', parseCity);

router.post('/batch', batchParseAndGeocode);

export default router;
