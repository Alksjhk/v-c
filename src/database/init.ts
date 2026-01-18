import { getDatabase } from '../utils/database';

interface RoomRecord {
    id: number;
}

export async function initializeDatabase(): Promise<void> {
    const db = getDatabase();

    try {
        // 只清理旧的users表（如果有），因为现在改用users_auth表
        const oldUsersTable = await db.get(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'users'
        `);

        if (oldUsersTable) {
            console.log('发现旧的users表，正在清理...');
            try {
                await db.run('DROP TABLE IF EXISTS users CASCADE');
                console.log('✓ 已删除旧表: users');
            } catch (error) {
                console.log('  旧users表删除失败或不存在');
            }
            console.log('');
        }

        // 创建用户认证表（使用unique_id作为主键）
        await db.run(`
            CREATE TABLE IF NOT EXISTS users_auth (
                unique_id CHAR(6) PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('用户认证表创建成功');

        // 创建session表
        await db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id CHAR(6) NOT NULL,
                session_id TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users_auth(unique_id) ON DELETE CASCADE
            )
        `);
        console.log('Session表创建成功');

        // 创建房间表
        await db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
                id SERIAL PRIMARY KEY,
                room_code CHAR(6) UNIQUE NOT NULL,
                room_name TEXT DEFAULT '私密房间',
                created_by TEXT,
                admin_users TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_public BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('房间表创建成功');

        // 创建用户在线状态表
        await db.run(`
            CREATE TABLE IF NOT EXISTS user_status (
                id SERIAL PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                room_id INTEGER,
                is_online BOOLEAN DEFAULT TRUE,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms(id)
            )
        `);
        console.log('用户状态表创建成功');

        // 创建消息表
        await db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT DEFAULT 'text',
                file_name TEXT,
                file_size INTEGER,
                file_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms(id)
            )
        `);
        console.log('消息表创建成功');

        // 创建索引
        await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
        console.log('索引创建成功');

        // 创建公共大厅（如果不存在）
        const existingPublicRoom = await db.get<RoomRecord>(
            'SELECT id FROM rooms WHERE room_code = $1',
            ['PUBLIC']
        );
        if (!existingPublicRoom) {
            await db.run(`
                INSERT INTO rooms (room_code, room_name, is_public)
                VALUES ('PUBLIC', '公共大厅', TRUE)
            `);
            console.log('公共大厅初始化完成');
        } else {
            console.log('公共大厅已存在 (id=' + existingPublicRoom.id + ')');
        }

        console.log('数据库初始化完成');
    } catch (err) {
        console.error('数据库初始化失败:', err);
        throw err;
    }
}
