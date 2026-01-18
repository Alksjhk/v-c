import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { messageAPI } from '../utils/api';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
    className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
    const { state } = useChat();
    const [serverConnected, setServerConnected] = useState<boolean>(true);
    const [isChecking, setIsChecking] = useState<boolean>(false);
    const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());

    // 检查服务器连接状态
    const checkServerConnection = async () => {
        if (isChecking) return;
        
        setIsChecking(true);
        try {
            // 尝试获取公共房间信息来测试连接
            await messageAPI.getLatestMessages(0, 1);
            setServerConnected(true);
        } catch (error) {
            console.warn('服务器连接检查失败:', error);
            setServerConnected(false);
        } finally {
            setIsChecking(false);
            setLastCheckTime(new Date());
        }
    };

    // 定期检查连接状态
    useEffect(() => {
        // 只有在用户已连接时才检查服务器状态
        if (state.isConnected) {
            // 初始检查
            checkServerConnection();

            // 每30秒检查一次连接状态
            const interval = setInterval(checkServerConnection, 30000);

            return () => clearInterval(interval);
        }
    }, [state.isConnected]);

    // 手动重新检查连接
    const handleRetryConnection = () => {
        checkServerConnection();
    };

    // 如果用户未连接，不显示服务器状态
    if (!state.isConnected) {
        return null;
    }

    const getStatusText = () => {
        if (isChecking) return '检查中...';
        return serverConnected ? '服务器已连接' : '服务器连接失败';
    };

    const getStatusIcon = () => {
        if (isChecking) return '⏳';
        return serverConnected ? '🟢' : '🔴';
    };

    return (
        <div className={`${styles.connectionStatus} ${className || ''}`}>
            <div 
                className={`${styles.statusIndicator} ${
                    serverConnected ? styles.connected : styles.disconnected
                } ${isChecking ? styles.checking : ''}`}
                onClick={handleRetryConnection}
                title={`${getStatusText()}\n最后检查: ${lastCheckTime.toLocaleTimeString()}\n点击重新检查`}
            >
                <span className={styles.icon}>{getStatusIcon()}</span>
                <span className={styles.text}>{getStatusText()}</span>
            </div>
        </div>
    );
};

export default ConnectionStatus;