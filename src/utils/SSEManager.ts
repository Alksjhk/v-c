import { Message } from '../types';

interface SSEEvent {
    type: 'connected' | 'newMessage' | 'userStatus';
    data: unknown;
}

// SSE响应接口，包含必要的流方法
export interface SSEResponse {
    flush?: () => void;
    on(event: 'close' | 'error', listener: (...args: unknown[]) => void): void;
    write(chunk: string, encoding?: BufferEncoding): boolean;
    writable: boolean;
    writableEnded: boolean;
    writableFinished: boolean;
}

// SSE连接管理器
export class SSEManager {
    private static instance: SSEManager;
    private connections: Map<number, Map<string, SSEResponse>> = new Map();
    // roomId -> Set of userIds
    private roomSubscribers: Map<number, Set<string>> = new Map();
    // 心跳定时器 Map
    private heartbeatTimers: Map<number, Map<string, NodeJS.Timeout>> = new Map();

    private constructor() {}

    static getInstance(): SSEManager {
        if (!SSEManager.instance) {
            SSEManager.instance = new SSEManager();
        }
        return SSEManager.instance;
    }

    // 添加SSE连接
    addConnection(roomId: number, userId: string, res: SSEResponse) {
        // 初始化房间连接映射
        if (!this.connections.has(roomId)) {
            this.connections.set(roomId, new Map());
        }

        // 初始化房间订阅者
        if (!this.roomSubscribers.has(roomId)) {
            this.roomSubscribers.set(roomId, new Set());
        }

        // 初始化房间心跳定时器
        if (!this.heartbeatTimers.has(roomId)) {
            this.heartbeatTimers.set(roomId, new Map());
        }

        // 添加连接
        this.connections.get(roomId)!.set(userId, res);
        this.roomSubscribers.get(roomId)!.add(userId);

        console.log(`用户 ${userId} 订阅房间 ${roomId}，当前房间订阅者数: ${this.roomSubscribers.get(roomId)!.size}`);

        // 发送连接确认
        this.sendToClient(roomId, userId, {
            type: 'connected',
            data: {
                roomId,
                userId,
                timestamp: new Date().toISOString()
            }
        });

        // 启动心跳机制，每30秒发送一次心跳
        const heartbeatTimer = setInterval(() => {
            this.sendHeartbeat(roomId, userId);
        }, 30000); // 30秒

        this.heartbeatTimers.get(roomId)!.set(userId, heartbeatTimer);

        // 设置连接关闭处理 - 只处理 close 事件，不处理 finish
        // SSE 是长连接，finish 事件可能在正常消息发送时触发，不应该关闭连接
        res.on('close', () => {
            this.removeConnection(roomId, userId);
        });

        // 响应错误处理
        res.on('error', (error) => {
            console.error(`SSE响应错误 [${userId}]:`, error);
            this.removeConnection(roomId, userId);
        });
    }

    // 移除SSE连接
    removeConnection(roomId: number, userId: string) {
        // 检查连接是否存在，避免重复移除
        const roomConnections = this.connections.get(roomId);
        if (!roomConnections || !roomConnections.has(userId)) {
            // 连接不存在，可能已经被移除
            return;
        }

        const subscribers = this.roomSubscribers.get(roomId);
        const heartbeatMap = this.heartbeatTimers.get(roomId);

        // 移除连接
        roomConnections.delete(userId);
        if (roomConnections.size === 0) {
            this.connections.delete(roomId);
        }

        if (subscribers) {
            subscribers.delete(userId);
            if (subscribers.size === 0) {
                this.roomSubscribers.delete(roomId);
            }
        }

        // 清除心跳定时器
        if (heartbeatMap) {
            const timer = heartbeatMap.get(userId);
            if (timer) {
                clearInterval(timer);
                heartbeatMap.delete(userId);
            }
            if (heartbeatMap.size === 0) {
                this.heartbeatTimers.delete(roomId);
            }
        }

        console.log(`用户 ${userId} 取消订阅房间 ${roomId}，当前房间订阅者数: ${subscribers?.size || 0}`);
    }

    // 向特定用户发送消息
    private sendToClient(roomId: number, userId: string, event: SSEEvent) {
        const roomConnections = this.connections.get(roomId);
        if (!roomConnections || !roomConnections.has(userId)) {
            return;
        }

        const res = roomConnections.get(userId)!;
        try {
            // 检查响应是否仍然可写
            if (!res.writable || res.writableEnded || res.writableFinished) {
                console.warn(`连接 ${userId} 已结束，移除连接`);
                this.removeConnection(roomId, userId);
                return;
            }
            res.write(`data: ${JSON.stringify(event)}\n\n`);
            // 强制刷新缓冲区，确保消息立即发送
            if (res.flush && typeof res.flush === 'function') {
                res.flush();
            }
        } catch (error) {
            console.error(`发送消息给用户 ${userId} 失败:`, error);
            this.removeConnection(roomId, userId);
        }
    }

    // 发送心跳包
    private sendHeartbeat(roomId: number, userId: string) {
        const roomConnections = this.connections.get(roomId);
        if (!roomConnections || !roomConnections.has(userId)) {
            return;
        }

        const res = roomConnections.get(userId)!;
        try {
            // 检查响应是否仍然可写
            if (!res.writable || res.writableEnded || res.writableFinished) {
                this.removeConnection(roomId, userId);
                return;
            }
            // 发送心跳注释（不会触发客户端onmessage事件）
            res.write(': heartbeat\n\n');
            if (res.flush && typeof res.flush === 'function') {
                res.flush();
            }
        } catch (error) {
            console.error(`发送心跳失败 [${userId}]:`, error);
            this.removeConnection(roomId, userId);
        }
    }

    // 向房间所有订阅者广播消息
    broadcastToRoom(roomId: number, event: SSEEvent) {
        const subscribers = this.roomSubscribers.get(roomId);
        if (!subscribers || subscribers.size === 0) {
            console.log(`房间 ${roomId} 没有订阅者`);
            return;
        }

        console.log(`向房间 ${roomId} 的 ${subscribers.size} 个订阅者广播消息`);

        subscribers.forEach(userId => {
            this.sendToClient(roomId, userId, event);
        });
    }

    // 广播新消息
    broadcastNewMessage(roomId: number, message: Message) {
        this.broadcastToRoom(roomId, {
            type: 'newMessage',
            data: message
        });
    }

    // 广播用户状态变化
    broadcastUserStatus(roomId: number, userId: string, status: 'online' | 'offline') {
        this.broadcastToRoom(roomId, {
            type: 'userStatus',
            data: {
                userId,
                status,
                timestamp: new Date().toISOString()
            }
        });
    }

    // 获取房间订阅者数量
    getRoomSubscriberCount(roomId: number): number {
        return this.roomSubscribers.get(roomId)?.size || 0;
    }

    // 获取所有房间订阅统计
    getStats() {
        const stats: { [key: number]: number } = {};
        this.roomSubscribers.forEach((subscribers, roomId) => {
            stats[roomId] = subscribers.size;
        });
        return stats;
    }
}