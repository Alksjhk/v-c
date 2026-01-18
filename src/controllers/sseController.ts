import { Request, Response } from 'express';
import { SSEManager } from '../utils/SSEManager';

const sseManager = SSEManager.getInstance();

export class SSEController {
    // 建立SSE连接
    async connect(req: Request, res: Response) {
        const roomId = parseInt(req.params.roomId);
        const userId = req.user?.uniqueId; // 从cookie认证获取用户ID

        if (!userId || isNaN(roomId)) {
            return res.status(400).json({
                success: false,
                message: '用户ID和房间ID不能为空'
            });
        }

        console.log(`[SSE] 新连接请求: roomId=${roomId}, userId=${userId}`);

        // 设置SSE响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

        // 禁用压缩中间件对SSE的影响
        res.removeHeader('Content-Encoding');

        // 发送初始连接事件
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            data: {
                roomId,
                userId,
                timestamp: new Date().toISOString()
            }
        })}\n\n`);

        // 立即刷新缓冲区
        if ('flush' in res && typeof (res as any).flush === 'function') {
            (res as any).flush();
        }

        // 添加到SSE管理器
        sseManager.addConnection(roomId, userId, res as any);

        // 处理客户端断开连接 - 只在 SSEManager 中统一处理，避免重复
        req.on('aborted', () => {
            console.log(`[SSE] 请求被中止: roomId=${roomId}, userId=${userId}`);
            sseManager.removeConnection(roomId, userId);
        });

        req.on('error', (error) => {
            // ECONNRESET 是客户端主动断开连接导致的，属于正常情况，不需要作为错误处理
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNRESET') {
                console.log(`[SSE] 客户端断开连接: roomId=${roomId}, userId=${userId}`);
            } else {
                console.error(`[SSE] 请求错误: roomId=${roomId}, userId=${userId}, error:`, error);
            }
            sseManager.removeConnection(roomId, userId);
        });
    }

    // 获取连接统计信息
    async getStats(_req: Request, res: Response) {
        try {
            const stats = sseManager.getStats();
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('获取SSE统计失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    }
}