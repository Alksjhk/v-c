import axios from 'axios';
import { RoomResponse, MessagesResponse } from '../types';
import { API_CONFIG, getEnvConfig } from '../config/api';

export interface RateLimitError {
    success: boolean;
    message: string;
    retryAfter: number;
}

const envConfig = getEnvConfig();

const baseURL = '/api';

const api = axios.create({
    baseURL: baseURL,
    timeout: API_CONFIG.timeout,
    withCredentials: true,  // 允许发送cookie
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        // 备用方案：如果cookie不可用，尝试从localStorage获取sessionId
        const sessionId = localStorage.getItem('chat_session_id');
        if (sessionId && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${sessionId}`;
        }

        if (envConfig.enableLogging) {
            console.log(`API请求: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        if (envConfig.enableLogging) {
            console.error('API请求错误:', error);
        }
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        if (envConfig.enableLogging) {
            console.log(`API响应: ${response.config.url}`, response.data);
        }
        return response;
    },
    (error) => {
        if (envConfig.enableLogging) {
            console.error('API响应错误:', error);
        }
        
        // 检测速率限制错误 (429 Too Many Requests)
        if (error.response?.status === 429) {
            const rateLimitError: RateLimitError = {
                success: false,
                message: error.response.data?.message || '请求过于频繁，请稍后再试',
                retryAfter: error.response.data?.retryAfter || 60
            };
            console.warn('速率限制触发:', rateLimitError);
            return Promise.reject(rateLimitError);
        }
        
        // 生产环境错误报告
        if (envConfig.enableErrorReporting) {
            // 这里可以集成错误监控服务，如 Sentry
            console.error('生产环境API错误:', {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                message: error.message
            });
        }
        
        return Promise.reject(error);
    }
);

export const roomAPI = {
    // 获取公共大厅
    getPublicRoom: async (): Promise<RoomResponse> => {
        const response = await api.get('/rooms/public');
        return response.data;
    },

    // 创建房间
    createRoom: async (roomCode: string, userId: string): Promise<RoomResponse> => {
        const response = await api.post('/rooms/create', { roomCode, userId });
        return response.data;
    },

    // 加入房间
    joinRoom: async (roomCode: string): Promise<RoomResponse> => {
        const response = await api.get(`/rooms/join/${roomCode}`);
        return response.data;
    },
};

export const messageAPI = {
    // 发送消息
    sendMessage: async (messageData: {
        roomId: number;
        content: string;
        messageType: string;
        fileName?: string;
        fileSize?: number;
        fileUrl?: string;
    }) => {
        const response = await api.post('/messages/send', messageData);
        return response.data;
    },

    // 获取消息
    getMessages: async (roomId: number, lastMessageId: number = 0): Promise<MessagesResponse> => {
        const response = await api.get(`/messages/${roomId}?lastMessageId=${lastMessageId}`);
        return response.data;
    },

    // 获取房间最新消息（用于初始化）
    getLatestMessages: async (roomId: number, limit: number = 50): Promise<MessagesResponse> => {
        const response = await api.get(`/messages/${roomId}/latest?limit=${limit}`);
        return response.data;
    },
};

// 用户认证API
export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        username: string;
        uniqueId: string;
        sessionId?: string;
    };
}

export interface SessionVerifyResponse {
    success: boolean;
    message: string;
    data?: {
        username: string;
        uniqueId: string;
        expiresAt: string;
    };
}

export const authAPI = {
    // 注册
    register: async (username: string, password: string): Promise<AuthResponse> => {
        const response = await api.post('/auth/register', { username, password });
        return response.data;
    },

    // 登录
    login: async (username: string, password: string): Promise<AuthResponse> => {
        const response = await api.post('/auth/login', { username, password });
        return response.data;
    },

    // 验证session
    verifySession: async (sessionId: string): Promise<SessionVerifyResponse> => {
        const response = await api.get(`/auth/verify/${sessionId}`);
        return response.data;
    },

    // 登出
    logout: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/auth/logout', { sessionId });
        return response.data;
    },
};

export default api;