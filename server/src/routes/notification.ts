import { Router } from 'express';
import {
  getUnread,
  markAsRead,
  markAllAsRead,
  markBatchAsRead,
} from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/unread', getUnread);

router.put('/read/all', markAllAsRead);

router.put('/read/batch', markBatchAsRead);

router.put('/:id/read', markAsRead);

export default router;
