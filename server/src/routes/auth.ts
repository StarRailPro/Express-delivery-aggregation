import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { registerValidation, loginValidation } from '../middleware/validator';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authMiddleware, getMe);

export default router;
