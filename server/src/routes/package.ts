import { Router } from 'express';
import {
  create,
  list,
  getById,
  update,
  deletePackage,
  archive,
} from '../controllers/packageController';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validator';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  validateBody([
    { field: 'trackingNo', required: true, type: 'string', minLength: 1, maxLength: 50 },
  ]),
  create,
);

router.get('/', list);

router.get('/:id', getById);

router.put(
  '/:id',
  validateBody([
    { field: 'alias', required: false, type: 'string', maxLength: 50 },
    { field: 'status', required: false, type: 'string' },
  ]),
  update,
);

router.delete('/:id', deletePackage);

router.put('/:id/archive', archive);

export default router;
