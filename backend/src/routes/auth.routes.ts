import { Router } from 'express';
import { login, register, getMe, forgotPassword, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, forgotPasswordSchema } from '../validators/auth.validator';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

export default router;
