import React from 'react';
import { Button } from './ui';
import { useTheme } from '../hooks/useTheme';
import styles from './ChatHeader.module.css';

interface ChatHeaderProps {
    username: string;
    onLogout: () => void;
    connectionStatus?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ username, onLogout, connectionStatus }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <div className={styles.logo}>💬</div>
                <h1 className={styles.title}>轻量级聊天</h1>
            </div>

            <div className={styles.right}>
                {connectionStatus && (
                    <div className={styles.connectionStatus}>
                        <span className={`${styles.statusDot} ${
                            connectionStatus === '已连接' ? styles.connected :
                            connectionStatus === '连接中' ? styles.connecting :
                            styles.disconnected
                        }`}></span>
                        <span className={styles.statusText}>{connectionStatus}</span>
                    </div>
                )}
                <div className={styles.themeToggle} onClick={toggleTheme} title="切换主题">
                    <div className={`${styles.toggleSwitch} ${theme === 'dark' ? styles.dark : styles.light}`}>
                        <div className={styles.toggleSlider}>
                            {theme === 'light' ? '☀️' : '🌙'}
                        </div>
                    </div>
                </div>
                <div className={styles.userInfo}>
                    <span className={styles.username}>{username}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onLogout}>
                    退出
                </Button>
            </div>
        </header>
    );
};

export default ChatHeader;
