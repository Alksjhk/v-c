import { Router } from 'express';
import {
    register,
    login,
    verifySession,
    logout
} from '../controllers/authController';

const router = Router();

// 注册
router.post('/register', register);

// 登录
router.post('/login', login);

// 验证session
router.get('/verify/:sessionId', verifySession);

// 登出
router.post('/logout', logout);

export default router;
