import { Router } from 'express';
import { SSEController } from '../controllers/sseController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new SSEController();

// 获取连接统计信息 - 需要认证
router.get('/stats', authMiddleware, (req, res) => controller.getStats(req, res));

// 建立SSE连接 - 需要认证
router.get('/:roomId', authMiddleware, (req, res) => controller.connect(req, res));

export default router;