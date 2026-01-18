import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { SSEManager } from '../utils/SSEManager';
import { messageAPI, roomAPI, authAPI, RateLimitError } from '../utils/api';
import { preloadMessageImages, ImagePreloader } from '../utils/imagePreloader';
import ChatHeader from './ChatHeader';
import RoomSelector from './RoomSelector';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import RateLimitAlert from './RateLimitAlert';
import { Room, Message } from '../types';
import styles from './ChatContainer.module.css';

interface FileData {
    fileName: string;
    fileSize: number;
    fileUrl: string;
}

const ChatContainer: React.FC = () => {
    const { state, setRoom, setMessages, addMessages, sendMessage, setLoading } = useChat();
    const sseManagerRef = useRef<SSEManager | null>(null);
    const imagePreloaderRef = useRef<ImagePreloader | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>('未连接');
    const [imagesPreloaded, setImagesPreloaded] = useState<boolean>(false);
    const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);

    useEffect(() => {
        if (state.currentUser) {
            // 用户登录后，自动获取并进入公共大厅
            initializePublicRoom();
        }

        return () => {
            sseManagerRef.current?.destroy();
            imagePreloaderRef.current?.clear?.();
        };
    }, [state.currentUser]);

    // 初始化公共大厅
    const initializePublicRoom = async () => {
        try {
            const data = await roomAPI.getPublicRoom();
            if (data.success) {
                const publicRoom: Room = {
                    id: data.roomId,
                    name: data.roomName,
                    isPublic: true
                };
                setRoom(publicRoom);
                await startSSE(publicRoom);
            }
        } catch (error) {
            console.error('获取公共大厅失败:', error);
        }
    };

    const startSSE = async (room: Room) => {
        // 清理旧的连接
        if (sseManagerRef.current) {
            sseManagerRef.current.destroy();
        }

        // 清理旧的图片预加载
        if (imagePreloaderRef.current) {
            imagePreloaderRef.current.clear();
        }

        try {
            setLoading(true);

            // 先获取历史消息
            const data = await messageAPI.getLatestMessages(room.id, 50);
            if (data.success) {
                setMessages(data.messages);

                // 预加载图片（优化加载体验）
                setImagesPreloaded(false);
                const preloader = preloadMessageImages(data.messages, {
                    maxConcurrent: 3,
                    onProgress: (loaded, total) => {
                        console.log(`图片预加载进度: ${loaded}/${total}`);
                    },
                    onComplete: () => {
                        console.log('图片预加载完成');
                        setImagesPreloaded(true);
                    }
                });
                imagePreloaderRef.current = preloader;

                // 如果没有图片需要预加载，立即标记为完成
                if (preloader.getStats().total === 0) {
                    console.log('没有图片需要预加载');
                    setImagesPreloaded(true);
                }
            }

            // 创建SSE管理器
            sseManagerRef.current = new SSEManager(
                addMessages, // 新消息回调
                (connectedData) => {
                    console.log('SSE连接成功:', connectedData);
                    setConnectionStatus('已连接');
                },
                (error) => {
                    console.error('SSE连接错误:', error);
                    setConnectionStatus('连接错误');
                }
            );

            // 连接到SSE
            sseManagerRef.current.connect(room.id, state.currentUser);
            setConnectionStatus('连接中');

        } catch (error) {
            console.error('启动SSE失败:', error);
            setConnectionStatus('连接失败');
        } finally {
            setLoading(false);
        }
    };

    const handleRoomChange = async (room: Room) => {
        setRoom(room);
        await startSSE(room);
    };

    const handleSendMessage = async (content: string, messageType = 'text', fileData?: FileData) => {
        try {
            const requestData: {
                roomId: number;
                content: string;
                messageType: string;
                fileName?: string;
                fileSize?: number;
                fileUrl?: string;
            } = {
                roomId: state.currentRoom.id,
                content,
                messageType
            };

            if (fileData) {
                requestData.fileName = fileData.fileName;
                requestData.fileSize = fileData.fileSize;
                requestData.fileUrl = fileData.fileUrl;
            }

            // 创建临时消息对象（用于乐观更新）
            const tempMessage: Message = {
                id: `temp-${Date.now()}`, // 临时 ID，SSE 推送后会替换为真实 ID
                userId: state.currentUser,
                content,
                messageType: messageType as 'text' | 'image' | 'file',
                fileName: fileData?.fileName,
                fileSize: fileData?.fileSize,
                fileUrl: fileData?.fileUrl,
                createdAt: new Date().toISOString(),
            };

            // 立即添加消息到本地列表（乐观更新）
            sendMessage(tempMessage);

            const data = await messageAPI.sendMessage(requestData);

            if (data.success) {
                console.log('消息发送成功，消息ID:', data.messageId);
                // SSE 会推送包含真实 ID 的消息，通过去重机制自动替换临时消息
            } else {
                alert(data.message || '发送失败');
                // 发送失败，可以移除临时消息（这里简化处理，保留显示）
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            if (error && typeof error === 'object' && 'retryAfter' in error) {
                setRateLimitError(error as RateLimitError);
            } else {
                alert('网络错误，请重试');
            }
        }
    };

    const handleLogout = async () => {
        try {
            const sessionId = localStorage.getItem('chat_session_id');
            if (sessionId) {
                await authAPI.logout(sessionId);
            }
        } catch (error) {
            console.error('登出失败:', error);
        } finally {
            localStorage.removeItem('chat_session_id');
            localStorage.removeItem('chat_username');
            localStorage.removeItem('chat_unique_id');
            window.location.reload();
        }
    };

    const handleCloseRateLimitAlert = () => {
        setRateLimitError(null);
    };

    return (
        <div className={styles.container}>
            {rateLimitError && (
                <RateLimitAlert
                    message={rateLimitError.message}
                    retryAfter={rateLimitError.retryAfter}
                    onClose={handleCloseRateLimitAlert}
                />
            )}
            <ChatHeader
                username={state.currentUsername}
                onLogout={handleLogout}
                connectionStatus={connectionStatus}
            />
            
            <RoomSelector
                currentRoom={state.currentRoom}
                currentUser={state.currentUser}
                onRoomChange={handleRoomChange}
            />
            
            <div className={styles.main}>
                <MessageList
                    messages={state.messages}
                    isLoading={state.isLoading}
                    currentUser={state.currentUser}
                    imagesPreloaded={imagesPreloaded}
                />
            </div>
            
            <MessageInput
                onSendMessage={handleSendMessage}
                disabled={state.isLoading}
            />
        </div>
    );
};

export default ChatContainer;
