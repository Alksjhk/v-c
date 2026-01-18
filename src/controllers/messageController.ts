import { Request, Response } from 'express';
import db from '../utils/database';
import { SSEManager } from '../utils/SSEManager';
import { Message } from '../types';

interface RoomRecord {
    id: number;
}

export class MessageController {
    // 发送消息
    async sendMessage(req: Request, res: Response) {
        const { roomId, content, messageType = 'text', fileName, fileSize, fileUrl } = req.body;
        const userId = req.user?.uniqueId; // 从认证中间件获取userId

        // 验证
        if (!content || !content.trim()) {
            return res.json({
                success: false,
                message: '消息内容不能为空'
            });
        }

        if (messageType === 'text' && content.length > 500) {
            return res.json({
                success: false,
                message: '消息内容不能超过500字符'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }

        if (roomId === undefined || roomId === null) {
            return res.json({
                success: false,
                message: '房间ID不能为空'
            });
        }

        try {
            // 验证房间存在
            const room = await db.get<RoomRecord>('SELECT id FROM rooms WHERE id = $1', [roomId]);
            if (!room) {
                return res.json({
                    success: false,
                    message: '房间不存在'
                });
            }

            // 插入消息并返回完整消息信息
            const insertResult = await db.run(
                `INSERT INTO messages (room_id, user_id, content, message_type, file_name, file_size, file_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [roomId, userId, content.trim(), messageType, fileName || null, fileSize || null, fileUrl || null]
            );

            const insertedId = insertResult.lastID;

            // 获取完整的消息信息
            const newMessage = await db.get<Message>(
                `SELECT id, user_id as "userId", content, message_type as "messageType",
                        file_name as "fileName", file_size as "fileSize", file_url as "fileUrl",
                        created_at as "createdAt"
                 FROM messages WHERE id = $1`,
                [insertedId]
            );

            if (!newMessage) {
                return res.json({
                    success: false,
                    message: '消息插入失败'
                });
            }

            // 通过SSE广播新消息
            const sseManager = SSEManager.getInstance();
            sseManager.broadcastNewMessage(roomId, newMessage);

            res.json({
                success: true,
                messageId: insertedId
            });
        } catch (error) {
            console.error('发送消息失败:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    // 获取消息（轮询接口）
    async getMessages(req: Request, res: Response) {
        const roomId = parseInt(req.params.roomId);
        const lastMessageId = parseInt(req.query.lastMessageId as string) || 0;

        if (isNaN(roomId)) {
            return res.json({
                success: false,
                message: '房间ID格式错误'
            });
        }

        try {
            // 获取新消息
            const messages = await db.all(
                `SELECT id, user_id as "userId", content, message_type as "messageType",
                        file_name as "fileName", file_size as "fileSize", file_url as "fileUrl",
                        created_at as "createdAt"
                 FROM messages
                 WHERE room_id = $1 AND id > $2
                 ORDER BY id ASC
                 LIMIT 50`,
                [roomId, lastMessageId]
            );

            res.json({
                success: true,
                hasNew: messages.length > 0,
                messages: messages
            });
        } catch (error) {
            console.error('获取消息失败:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    // 获取房间最新消息（用于初始化）
    async getLatestMessages(req: Request, res: Response) {
        const roomId = parseInt(req.params.roomId);
        const limit = parseInt(req.query.limit as string) || 50;

        if (isNaN(roomId)) {
            return res.json({
                success: false,
                message: '房间ID格式错误'
            });
        }

        if (limit > 100) {
            return res.json({
                success: false,
                message: '消息数量限制不能超过100条'
            });
        }

        try {
            // 获取最新消息
            const messages = await db.all(
                `SELECT id, user_id as "userId", content, message_type as "messageType",
                        file_name as "fileName", file_size as "fileSize", file_url as "fileUrl",
                        created_at as "createdAt"
                 FROM messages
                 WHERE room_id = $1
                 ORDER BY id DESC
                 LIMIT $2`,
                [roomId, limit]
            );

            // 反转数组，使消息按时间正序排列
            messages.reverse();

            res.json({
                success: true,
                hasNew: messages.length > 0,
                messages: messages
            });
        } catch (error) {
            console.error('获取最新消息失败:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
}
