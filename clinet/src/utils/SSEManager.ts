import { Message } from '../types';

export interface SSEEvent {
    type: 'connected' | 'newMessage' | 'userStatus' | 'error';
    data: Message | { message?: string; userId?: string; roomId?: number } | Error;
}

export class SSEManager {
    private abortController: AbortController | null = null;
    private roomId: number | null = null;
    private userId: string | null = null;
    private onNewMessages: ((messages: Message[]) => void) | null = null;
    private onConnected: ((data: { message?: string }) => void) | null = null;
    private onError: ((error: Error) => void) | null = null;
    private isConnecting = false;
    private isConnectedState = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        onNewMessages?: (messages: Message[]) => void,
        onConnected?: (data: { message?: string }) => void,
        onError?: (error: Error) => void
    ) {
        this.onNewMessages = onNewMessages || null;
        this.onConnected = onConnected || null;
        this.onError = onError || null;
    }

    // 连接到SSE
    async connect(roomId: number, userId: string) {
        if (this.isConnecting) {
            console.log('正在连接中，跳过重复连接');
            return;
        }

        if (this.isConnectedState && this.roomId === roomId) {
            console.log('已连接到相同房间且连接正常，跳过重复连接');
            return;
        }

        this.disconnect();
        this.roomId = roomId;
        this.userId = userId;
        this.isConnecting = true;
        this.reconnectAttempts = 0;

        const url = `/api/sse/${roomId}`;
        console.log(`连接SSE: ${url} (userId: ${userId})`);

        try {
            await this.connectWithFetch();
        } catch (error) {
            console.error('创建SSE连接失败:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    // 使用fetch API连接SSE（支持携带cookie）
    private async connectWithFetch() {
        this.abortController = new AbortController();

        try {
            const response = await fetch(`/api/sse/${this.roomId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                },
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            this.isConnecting = false;
            this.isConnectedState = true;
            this.reconnectAttempts = 0;

            console.log('SSE连接已建立');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    console.log('SSE连接已关闭');
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data.trim()) {
                            try {
                                const sseEvent: SSEEvent = JSON.parse(data);
                                this.handleEvent(sseEvent);
                            } catch (error) {
                                console.error('解析SSE消息失败:', error, data);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('SSE连接被主动断开');
            } else {
                console.error('SSE连接错误:', error);
                this.isConnectedState = false;
                throw error;
            }
        }
    }

    // 处理SSE事件
    private handleEvent(event: SSEEvent) {
        switch (event.type) {
            case 'connected':
                console.log('SSE连接确认:', event.data);
                if (this.onConnected) {
                    const connectedData = event.data as { message?: string };
                    this.onConnected(connectedData);
                }
                break;

            case 'newMessage':
                console.log('收到新消息:', event.data);
                if (this.onNewMessages && this.isMessage(event.data)) {
                    this.onNewMessages([event.data]);
                }
                break;

            case 'userStatus':
                console.log('用户状态变化:', event.data);
                break;

            case 'error':
                console.error('服务器错误:', event.data);
                break;

            default:
                console.log('未知事件类型:', event);
        }
    }

    private isMessage(data: unknown): data is Message {
        return (
            typeof data === 'object' &&
            data !== null &&
            'id' in data &&
            'userId' in data &&
            'content' in data &&
            'messageType' in data &&
            'createdAt' in data
        );
    }

    // 调度重连
    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('达到最大重连次数，停止重连');
            if (this.onError) {
                this.onError(new Error('Max reconnect attempts reached'));
            }
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`将在 ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);

        this.reconnectTimer = setTimeout(() => {
            if (this.roomId && this.userId) {
                this.connect(this.roomId, this.userId);
            }
        }, delay);
    }

    // 断开连接
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.isConnectedState = false;
        this.isConnecting = false;
        console.log('断开SSE连接');
    }

    // 更新房间ID
    updateRoomId(newRoomId: number) {
        if (this.userId) {
            this.connect(newRoomId, this.userId);
        }
    }

    // 检查连接状态
    isConnected(): boolean {
        return this.isConnectedState;
    }

    // 获取连接状态描述
    getConnectionState(): string {
        if (this.isConnecting) return '连接中';
        if (this.isConnectedState) return '已连接';
        return '未连接';
    }

    // 销毁管理器
    destroy() {
        this.disconnect();
        this.onNewMessages = null;
        this.onConnected = null;
        this.onError = null;
        console.log('SSE管理器已销毁');
    }
}
