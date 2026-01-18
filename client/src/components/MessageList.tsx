import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import MessageBubble from './MessageBubble';
import styles from './MessageList.module.css';

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    currentUser: string;
    imagesPreloaded?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    isLoading,
    currentUser,
    imagesPreloaded = true
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef<number>(0);
    const prevImagesPreloadedRef = useRef<boolean>(false);

    // 自动滚动到底部
    useEffect(() => {
        // 如果消息列表为空，不滚动
        if (messages.length === 0) {
            prevMessagesLength.current = 0;
            return;
        }

        // 如果图片还未预加载完成，暂不滚动
        if (!imagesPreloaded) {
            return;
        }

        if (bottomRef.current) {
            const isFirstLoad = prevMessagesLength.current === 0 || (!prevImagesPreloadedRef.current && imagesPreloaded);
            bottomRef.current.scrollIntoView({ behavior: isFirstLoad ? 'auto' : 'smooth' });
        }
        prevMessagesLength.current = messages.length;
        prevImagesPreloadedRef.current = imagesPreloaded;
    }, [messages, imagesPreloaded]);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <span>加载中...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.messageList}>
                {messages.length === 0 ? (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon}>💬</span>
                        <p>暂无消息</p>
                        <p className={styles.emptyHint}>发送第一条消息开始聊天吧</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.userId === currentUser}
                        />
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default MessageList;
