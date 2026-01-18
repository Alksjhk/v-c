// 应用状态
export interface AppState {
    currentUser: string;      // 当前用户ID (uniqueId)
    currentUsername: string;   // 当前用户名
    currentRoom: Room;        // 当前房间
    messages: Message[];      // 消息列表
    rooms: Room[];            // 已加入房间列表
    isConnected: boolean;     // 连接状态
    isLoading: boolean;       // 加载状态
}

// 房间类型
export interface Room {
    id: number;              // 房间ID
    name: string;            // 房间名称
    code?: string;           // 房间号（私密房间）
    isPublic: boolean;       // 是否公共大厅
}

// 用户在线状态
export interface UserStatus {
    userId: string;          // 用户ID
    roomId: number;          // 所在房间ID
    isOnline: boolean;       // 是否在线
    lastSeen: string;        // 最后在线时间
}

// 消息类型
export interface Message {
    id: number | string;     // 消息ID（number为真实ID，string为临时ID）
    userId: string;          // 发送者ID
    content: string;         // 消息内容
    messageType: 'text' | 'image' | 'file';  // 消息类型
    fileName?: string;       // 文件名
    fileSize?: number;       // 文件大小
    fileUrl?: string;        // 文件URL
    createdAt: string;       // 创建时间
}

// API响应类型
export interface ApiResponse<T = any> {
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

// 认证响应类型
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

// Action 类型
export type ChatAction =
    | { type: 'SET_USER'; payload: string }
    | { type: 'SET_USERNAME'; payload: string }
    | { type: 'SET_ROOM'; payload: Room }
    | { type: 'SET_MESSAGES'; payload: Message[] }
    | { type: 'ADD_MESSAGES'; payload: Message[] }
    | { type: 'SEND_MESSAGE'; payload: Message }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_CONNECTED'; payload: boolean };