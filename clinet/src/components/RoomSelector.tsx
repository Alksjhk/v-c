import React, { useState } from 'react';
import { Room } from '../types';
import { roomAPI } from '../utils/api';
import { Button, Input } from './ui';
import styles from './RoomSelector.module.css';

interface RoomSelectorProps {
    currentRoom: Room;
    currentUser: string;
    onRoomChange: (room: Room) => void;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({
    currentRoom,
    currentUser,
    onRoomChange
}) => {
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePublicRoom = async () => {
        if (currentRoom.isPublic) return;
        
        setLoading(true);
        setError('');
        try {
            const data = await roomAPI.getPublicRoom();
            if (data.success) {
                onRoomChange({
                    id: data.roomId,
                    name: data.roomName,
                    isPublic: true
                });
            }
        } catch {
            setError('切换失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinOrCreate = async () => {
        setError('');
        
        if (!/^\d{6}$/.test(roomCode)) {
            setError('房间号必须是6位数字');
            return;
        }

        setLoading(true);
        try {
            let data = await roomAPI.joinRoom(roomCode);
            if (data.success) {
                onRoomChange({
                    id: data.roomId,
                    name: data.roomName,
                    code: roomCode,
                    isPublic: false
                });
                setRoomCode('');
                return;
            }

            data = await roomAPI.createRoom(roomCode, currentUser);
            if (data.success) {
                onRoomChange({
                    id: data.roomId,
                    name: data.roomName,
                    code: roomCode,
                    isPublic: false
                });
                setRoomCode('');
            } else {
                setError(data.message || '操作失败');
            }
        } catch {
            setError('网络错误，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setRoomCode(value);
        if (error) setError('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && roomCode.length === 6 && !loading) {
            handleJoinOrCreate();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.currentRoom}>
                <span className={styles.label}>当前房间</span>
                <span className={styles.roomName}>{currentRoom.name}</span>
                {currentRoom.code && (
                    <span className={styles.roomCode}>{currentRoom.code}</span>
                )}
            </div>

            <div className={styles.controls}>
                <Button
                    variant={currentRoom.isPublic ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={handlePublicRoom}
                    disabled={loading || currentRoom.isPublic}
                >
                    公共大厅
                </Button>

                <div className={styles.joinGroup}>
                    <Input
                        value={roomCode}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="6位房间号"
                        maxLength={6}
                        disabled={loading}
                        className={styles.roomInput}
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleJoinOrCreate}
                        disabled={loading || roomCode.length !== 6}
                        loading={loading}
                    >
                        加入
                    </Button>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
        </div>
    );
};

export default RoomSelector;
