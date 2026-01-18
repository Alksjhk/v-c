import { Message } from '../types';
import { messageAPI } from './api';

export class MessagePoller {
    private roomId: number;
    private lastMessageId: number;
    private pollInterval: number;
    private pollTimer: number | null;
    private onNewMessages: (messages: Message[]) => void;
    private isPolling: boolean;

    constructor(roomId: number, onNewMessages: (messages: Message[]) => void) {
        this.roomId = roomId;
        this.lastMessageId = 0;
        this.pollInterval = 1000; // 1秒轮询间隔，减少延迟
        this.pollTimer = null;
        this.onNewMessages = onNewMessages;
        this.isPolling = false;
    }

    start() {
        if (this.isPolling) return;

        console.log(`开始轮询房间 ${this.roomId} 的消息`);
        this.isPolling = true;
        
        // 立即执行一次
        this.fetchMessages();
        
        // 设置定时轮询
        this.pollTimer = window.setInterval(() => {
            this.fetchMessages();
        }, this.pollInterval);
    }

    stop() {
        if (this.pollTimer) {
            window.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.isPolling = false;
        console.log(`停止轮询房间 ${this.roomId} 的消息`);
    }

    updateRoomId(newRoomId: number) {
        console.log(`切换轮询房间: ${this.roomId} -> ${newRoomId}`);
        this.stop();
        this.roomId = newRoomId;
        this.lastMessageId = 0;
        this.start();
    }

    // 设置最后消息ID，避免重复获取
    setLastMessageId(messageId: number) {
        this.lastMessageId = messageId;
    }

    async fetchMessages() {
        try {
            const data = await messageAPI.getMessages(this.roomId, this.lastMessageId);

            if (data.success && data.hasNew && data.messages.length > 0) {
                console.log(`收到 ${data.messages.length} 条新消息`);
                // 过滤掉临时消息，只处理真实消息（ID是数字）
                const realMessages = data.messages.filter(msg => typeof msg.id === 'number');
                if (realMessages.length > 0) {
                    this.lastMessageId = realMessages[realMessages.length - 1].id as number;
                    this.onNewMessages(realMessages);
                }
            }
        } catch (error) {
            console.error('轮询消息失败:', error);
        }
    }

    // 手动触发一次消息获取（发送消息后调用）
    async triggerFetch() {
        if (this.isPolling) {
            await this.fetchMessages();
        }
    }

    destroy() {
        this.stop();
        console.log('消息轮询器已销毁');
    }
}