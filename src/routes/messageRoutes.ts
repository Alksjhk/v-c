import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new MessageController();

// 发送消息 - 需要认证
router.post('/send', authMiddleware, controller.sendMessage.bind(controller));

// 获取消息（轮询接口） - 需要认证
router.get('/:roomId', authMiddleware, controller.getMessages.bind(controller));

// 获取房间最新消息 - 需要认证
router.get('/:roomId/latest', authMiddleware, controller.getLatestMessages.bind(controller));

export default router;