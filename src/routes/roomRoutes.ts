import { Router } from 'express';
import { RoomController } from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new RoomController();

// 获取公共大厅 - 需要认证
router.get('/public', authMiddleware, controller.getPublicRoom.bind(controller));

// 创建房间 - 需要认证
router.post('/create', authMiddleware, controller.createRoom.bind(controller));

// 加入房间 - 需要认证
router.get('/join/:roomCode', authMiddleware, controller.joinRoom.bind(controller));

export default router;