import React, { useEffect, useState } from 'react';
import styles from './RateLimitAlert.module.css';

interface RateLimitAlertProps {
    message: string;
    retryAfter: number;
    onClose: () => void;
}

const RateLimitAlert: React.FC<RateLimitAlertProps> = ({ message, retryAfter, onClose }) => {
    const [countdown, setCountdown] = useState(retryAfter);

    useEffect(() => {
        if (countdown <= 0) {
            onClose();
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown, onClose]);

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <div className={styles.icon}>⚠️</div>
                <h3 className={styles.title}>请求过于频繁</h3>
                <p className={styles.message}>{message}</p>
                <p className={styles.countdown}>
                    请在 <span className={styles.timer}>{countdown}</span> 秒后重试
                </p>
                <button className={styles.button} onClick={onClose}>
                    确定
                </button>
            </div>
        </div>
    );
};

export default RateLimitAlert;
