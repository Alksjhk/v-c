import { Request, Response } from 'express';
import db from '../utils/database';

interface RoomRecord {
    id: number;
    room_name: string;
}

export class RoomController {
    // 获取公共大厅
    async getPublicRoom(_req: Request, res: Response) {
        try {
            // 从数据库获取公共大厅的真实ID
            const room = await db.get<RoomRecord>(
                'SELECT id, room_name FROM rooms WHERE room_code = $1',
                ['PUBLIC']
            );

            if (!room) {
                return res.json({
                    success: false,
                    message: '公共大厅不存在'
                });
            }

            res.json({
                success: true,
                roomId: room.id,
                roomName: room.room_name
            });
        } catch (error) {
            console.error('获取公共大厅失败:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    // 创建房间
    async createRoom(req: Request, res: Response) {
        const { roomCode } = req.body;
        const userId = req.user?.uniqueId; // 从认证中间件获取userId

        // 验证
        if (!roomCode || !/^\d{6}$/.test(roomCode)) {
            return res.json({
                success: false,
                message: '房间号必须是6位数字'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }

        try {
            // 检查房间是否已存在
            const existing = await db.get<RoomRecord>(
                'SELECT id FROM rooms WHERE room_code = $1',
                [roomCode]
            );

            if (existing) {
                return res.json({
                    success: false,
                    message: '房间已存在'
                });
            }

            // 创建房间并返回ID
            const result = await db.run(
                'INSERT INTO rooms (room_code, created_by) VALUES ($1, $2) RETURNING id',
                [roomCode, userId]
            );

            res.json({
                success: true,
                roomId: result.lastID,
                roomName: '私密房间'
            });
        } catch (error) {
            console.error('创建房间失败:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    // 加入房间
    async joinRoom(req: Request, res: Response) {
        const { roomCode } = req.params;

        if (!roomCode || !/^\d{6}$/.test(roomCode)) {
            return res.json({
                success: false,
                message: '房间号格式错误'
            });
        }

        try {
            const room = await db.get<RoomRecord>(
                'SELECT id, room_name FROM rooms WHERE room_code = $1',
                [roomCode]
            );

            if (!room) {
                return res.json({
                    success: false,
                    message: '房间不存在'
                });
            }

            res.json({
                success: true,
                roomId: room.id,
                roomName: room.room_name
            });
        } catch (error) {
            console.error('加入房间失败:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
}
