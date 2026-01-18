import React, { Suspense, lazy } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import './App.css';

const LoginForm = lazy(() => import('./components/LoginForm'));
const ChatContainer = lazy(() => import('./components/ChatContainer'));
const Aurora = lazy(() => import('./component/Aurora'));

const AppContent: React.FC = () => {
    const { state, setUser, setUsername, setConnected } = useChat();

    const handleLogin = (userId: string, username?: string) => {
        setUser(userId);
        if (username) {
            setUsername(username);
        }
        setConnected(true);
    };

    // 显示登录界面
    if (!state.isConnected) {
        return <LoginForm onLogin={handleLogin} />;
    }

    // 显示聊天界面
    return <ChatContainer />;
};

const App: React.FC = () => {
    return (
        <ChatProvider>
            <div className="app">
                <Suspense fallback={<div className="loading-screen">加载中...</div>}>
                    <Aurora
                        colorStops={["#10e8e8", "#15dc47", "#ece624"]}
                        blend={1.0}
                        amplitude={1.0}
                        speed={0.8}
                    />
                    <AppContent />
                </Suspense>
            </div>
        </ChatProvider>
    );
};

export default App;
