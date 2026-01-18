import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, ChatAction, Room, Message } from '../types';

// 初始状态
const initialState: AppState = {
    currentUser: '',
    currentUsername: '',
    currentRoom: { id: 1, name: '公共大厅', isPublic: true }, // 公共大厅的真实ID会在加载时更新
    messages: [],
    rooms: [],
    isConnected: false,
    isLoading: false,
};

// Reducer
function chatReducer(state: AppState, action: ChatAction): AppState {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, currentUser: action.payload };
        case 'SET_USERNAME':
            return { ...state, currentUsername: action.payload };
        case 'SET_ROOM':
            return { ...state, currentRoom: action.payload, messages: [] };
        case 'ADD_MESSAGES':
            // 去重处理：
            // 1. 移除所有临时消息（ID 以 'temp-' 开头）
            // 2. 过滤掉已存在的真实消息
            const nonTempMessages = state.messages.filter(msg => !msg.id.toString().startsWith('temp-'));
            const existingIds = new Set(nonTempMessages.map(msg => msg.id));

            // 只添加不存在的真实消息
            const newMessages = action.payload.filter(msg => {
                // 只处理真实消息（ID 是数字）
                if (typeof msg.id === 'number' && !existingIds.has(msg.id)) {
                    existingIds.add(msg.id);
                    return true;
                }
                return false;
            });

            return {
                ...state,
                messages: [...nonTempMessages, ...newMessages]
            };
        case 'SET_MESSAGES':
            // 直接设置消息列表（用于初始加载）
            return {
                ...state,
                messages: action.payload
            };
        case 'SEND_MESSAGE':
            return {
                ...state,
                messages: [...state.messages, action.payload]
            };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_CONNECTED':
            return { ...state, isConnected: action.payload };
        default:
            return state;
    }
}

// Context类型
interface ChatContextType {
    state: AppState;
    dispatch: React.Dispatch<ChatAction>;
    // 便捷方法
    setUser: (userId: string) => void;
    setUsername: (username: string) => void;
    setRoom: (room: Room) => void;
    setMessages: (messages: Message[]) => void;
    addMessages: (messages: Message[]) => void;
    setLoading: (loading: boolean) => void;
    setConnected: (connected: boolean) => void;
    sendMessage: (message: Message) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider组件
interface ChatProviderProps {
    children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(chatReducer, initialState);

    // 便捷方法
    const setUser = (userId: string) => {
        dispatch({ type: 'SET_USER', payload: userId });
    };

    const setUsername = (username: string) => {
        dispatch({ type: 'SET_USERNAME', payload: username });
    };

    const setRoom = (room: Room) => {
        dispatch({ type: 'SET_ROOM', payload: room });
    };

    const setMessages = (messages: Message[]) => {
        dispatch({ type: 'SET_MESSAGES', payload: messages });
    };

    const addMessages = (messages: Message[]) => {
        dispatch({ type: 'ADD_MESSAGES', payload: messages });
    };

    const setLoading = (loading: boolean) => {
        dispatch({ type: 'SET_LOADING', payload: loading });
    };

    const setConnected = (connected: boolean) => {
        dispatch({ type: 'SET_CONNECTED', payload: connected });
    };

    const sendMessage = (message: Message) => {
        dispatch({ type: 'SEND_MESSAGE', payload: message });
    };

    const value: ChatContextType = {
        state,
        dispatch,
        setUser,
        setUsername,
        setRoom,
        setMessages,
        addMessages,
        setLoading,
        setConnected,
        sendMessage,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

// Hook
export const useChat = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};