import React, { useState } from 'react';
import { Message } from '../types';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

const formatTime = (timestamp: string): string => {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const renderContent = () => {
        switch (message.messageType) {
            case 'image':
                return (
                    <div className={styles.imageContent}>
                        {imageLoading && !imageError && (
                            <div className={styles.imageLoading}>
                                <div className={styles.loadingSpinner}></div>
                                <span>加载中...</span>
                            </div>
                        )}
                        {imageError && (
                            <div className={styles.imageError}>
                                <span>图片加载失败</span>
                            </div>
                        )}
                        <img
                            src={message.fileUrl}
                            alt={message.fileName || '图片'}
                            className={styles.image}
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            style={{ display: imageLoading || imageError ? 'none' : 'block' }}
                            onClick={() => !imageError && setShowImageModal(true)}
                            onError={() => {
                                setImageLoading(false);
                                setImageError(true);
                            }}
                            onLoad={() => {
                                setImageLoading(false);
                                setImageError(false);
                            }}
                        />
                        {message.content && message.content !== message.fileName && (
                            <p className={styles.caption}>{message.content}</p>
                        )}
                    </div>
                );
            
            case 'file':
                return (
                    <div className={styles.fileContent}>
                        <div className={styles.fileIcon}>📄</div>
                        <div className={styles.fileInfo}>
                            <span className={styles.fileName}>{message.fileName}</span>
                            {message.fileSize && (
                                <span className={styles.fileSize}>
                                    {formatFileSize(message.fileSize)}
                                </span>
                            )}
                        </div>
                        <a
                            href={message.fileUrl}
                            download={message.fileName}
                            className={styles.downloadBtn}
                            onClick={(e) => e.stopPropagation()}
                        >
                            下载
                        </a>
                    </div>
                );
            
            default:
                return <p className={styles.textContent}>{message.content}</p>;
        }
    };

    return (
        <>
            <div className={`${styles.container} ${isOwn ? styles.own : styles.other}`}>
                <div className={styles.bubble}>
                    <div className={styles.header}>
                        <span className={styles.sender}>
                            {isOwn ? '我' : message.userId}
                        </span>
                        <span className={styles.time}>{formatTime(message.createdAt)}</span>
                    </div>
                    <div className={styles.content}>
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* 图片预览模态框 */}
            {showImageModal && message.messageType === 'image' && (
                <div className={styles.imageModal} onClick={() => setShowImageModal(false)}>
                    <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={message.fileUrl}
                            alt={message.fileName || '图片'}
                            className={styles.modalImage}
                            loading="eager"
                            decoding="async"
                        />
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowImageModal(false)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default MessageBubble;
