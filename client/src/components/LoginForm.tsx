import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from './ui';
import { authAPI, RateLimitError } from '../utils/api';
import RateLimitAlert from './RateLimitAlert';
import styles from './LoginForm.module.css';

interface LoginFormProps {
    onLogin: (userId: string, username?: string) => void;
}

type AuthMode = 'login' | 'register';

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const usernameInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);

    useEffect(() => {
        const savedSessionId = localStorage.getItem('chat_session_id');
        const savedUniqueId = localStorage.getItem('chat_unique_id');

        if (savedSessionId && savedUniqueId) {
            // 验证session是否有效
            verifySession(savedSessionId);
        }
    }, []);

    const verifySession = async (sessionId: string) => {
        try {
            const response = await authAPI.verifySession(sessionId);
            if (response.success && response.data) {
                // Session有效，自动登录
                const { username: savedUsername, uniqueId } = response.data;
                if (savedUsername && uniqueId) {
                    localStorage.setItem('chat_username', savedUsername);
                    localStorage.setItem('chat_unique_id', uniqueId);
                    onLogin(uniqueId, savedUsername);
                }
            }
        } catch (err) {
            // Session无效，清除本地存储
            localStorage.removeItem('chat_session_id');
            localStorage.removeItem('chat_username');
            localStorage.removeItem('chat_unique_id');
        }
    };

    const validateUsername = (name: string): string | null => {
        const trimmed = name.trim();
        if (!trimmed) return '请输入用户名';
        if (trimmed.length < 2) return '用户名至少需要2个字符';
        if (trimmed.length > 15) return '用户名不能超过15个字符';
        if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(trimmed)) {
            return '用户名只能包含字母、数字、中文、下划线和横线';
        }
        return null;
    };

    const validatePassword = (pwd: string): string | null => {
        if (!pwd) return '请输入密码';
        if (pwd.length < 6) return '密码至少需要6个字符';
        if (pwd.length > 20) return '密码不能超过20个字符';
        return null;
    };

    const getPasswordHint = () => {
        if (mode === 'login') {
            return '请输入密码';
        }
        return '6-20个字符，建议使用字母和数字组合';
    };

    const getUsernameHint = () => {
        if (mode === 'login') {
            return '请输入用户名';
        }
        return '2-15个字符，支持中文、字母、数字、下划线和横线';
    };

    const getSubmitButtonText = () => {
        return mode === 'login' ? '登录' : '注册';
    };

    const getSubtitle = () => {
        return mode === 'login' ? '欢迎回来，请登录您的账号' : '创建您的专属账号';
    };

    const handleToggleMode = () => {
        setMode(prev => prev === 'login' ? 'register' : 'login');
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const usernameError = validateUsername(username);
        if (usernameError) {
            setError(usernameError);
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setIsLoading(true);

        try {
            let response;

            if (mode === 'register') {
                response = await authAPI.register(username.trim(), password);
            } else {
                response = await authAPI.login(username.trim(), password);
            }

            if (response.success && response.data) {
                const { username: returnedUsername, uniqueId, sessionId } = response.data;

                if (sessionId) {
                    localStorage.setItem('chat_session_id', sessionId);
                }
                localStorage.setItem('chat_username', returnedUsername);
                localStorage.setItem('chat_unique_id', uniqueId);
                onLogin(uniqueId, returnedUsername);
            } else {
                setError(response.message || (mode === 'register' ? '注册失败' : '登录失败，请稍后重试'));
            }
        } catch (err) {
            console.error('认证失败:', err);
            if (err && typeof err === 'object' && 'retryAfter' in err) {
                setRateLimitError(err as RateLimitError);
            } else {
                let errorMessage: string | undefined;
                if (err instanceof Error && 'response' in err) {
                    const axiosError = err as { response?: { data?: { message?: string } } };
                    errorMessage = axiosError.response?.data?.message;
                }
                const finalMessage = errorMessage || (mode === 'register' ? '注册失败，请稍后重试' : '登录失败，请稍后重试');
                setError(finalMessage);
                if (errorMessage && errorMessage.includes('密码')) {
                    passwordInputRef.current?.focus();
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseRateLimitAlert = () => {
        setRateLimitError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const usernameError = validateUsername(username);
            if (usernameError || !username.trim()) {
                usernameInputRef.current?.focus();
                return;
            }
            if (!password.trim()) {
                passwordInputRef.current?.focus();
                return;
            }
            handleSubmit(e);
        }
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
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>💬</div>
                    <h1 className={styles.title}>轻量级聊天</h1>
                    <p className={styles.subtitle}>{getSubtitle()}</p>
                </div>

                <div className={`${styles.toggleContainer} ${mode === 'register' ? styles.register : ''}`}>
                    <button
                        type="button"
                        className={`${styles.toggleButton} ${mode === 'login' ? styles.active : ''}`}
                        onClick={handleToggleMode}
                    >
                        登录
                    </button>
                    <button
                        type="button"
                        className={`${styles.toggleButton} ${mode === 'register' ? styles.active : ''}`}
                        onClick={handleToggleMode}
                    >
                        注册
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>用户名</label>
                        <Input
                            ref={usernameInputRef}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="请输入用户名"
                            maxLength={15}
                            autoFocus
                            fullWidth
                        />
                        <div className={styles.formHint}>{getUsernameHint()}</div>
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>密码</label>
                        <Input
                            ref={passwordInputRef}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="请输入密码"
                            maxLength={20}
                            fullWidth
                            error={error ? error : ''}
                        />
                        <div className={styles.formHint}>{getPasswordHint()}</div>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        fullWidth
                        loading={isLoading}
                        disabled={!username.trim() || !password.trim()}
                    >
                        {getSubmitButtonText()}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
