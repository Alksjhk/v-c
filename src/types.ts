// 消息类型
export interface Message {
    id: number;              // 消息ID
    userId: string;          // 发送者ID
    content: string;         // 消息内容
    messageType: 'text' | 'image' | 'file';  // 消息类型
    fileName?: string;       // 文件名
    fileSize?: number;       // 文件大小
    fileUrl?: string;        // 文件URL
    createdAt: string;       // 创建时间
}

// 房间类型
export interface Room {
    id: number;              // 房间ID
    roomCode: string;        // 房间号
    roomName: string;        // 房间名称
    createdBy?: string;      // 创建者ID
    isPublic: boolean;       // 是否公共大厅
    createdAt: string;       // 创建时间
}

// 用户认证类型
export interface UserAuth {
    uniqueId: string;        // 6位唯一ID（主键）
    username: string;        // 用户名
    passwordHash: string;    // 密码哈希
    createdAt: string;       // 创建时间
}

// Session类型
export interface Session {
    id: number;              // Session ID
    userId: string;         // 用户ID（6位数字）
    sessionId: string;      // Session token
    expiresAt: string;       // 过期时间
    createdAt: string;       // 创建时间
}

// 注册响应类型
export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        username: string;
        uniqueId: string;
        sessionId?: string;
    };
}

// Session验证响应类型
export interface SessionVerifyResponse {
    success: boolean;
    message: string;
    data?: {
        username: string;
        uniqueId: string;
        expiresAt: string;
    };
}

// API响应类型
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface MessagesResponse {
    success: boolean;
    hasNew: boolean;
    messages: Message[];
}

export interface RoomResponse {
    success: boolean;
    roomId: number;
    roomName: string;
    message?: string;
}

// SSE事件类型
export interface SSEEvent {
    type: 'connected' | 'newMessage' | 'userStatus' | 'error';
    data: Message | { message?: string; userId?: string; roomId?: number } | Error;
}