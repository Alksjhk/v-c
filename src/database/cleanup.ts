import { getDatabase } from '../utils/database';

export async function cleanupDatabase(): Promise<void> {
    const db = getDatabase();

    try {
        console.log('开始清理数据库...');

        // 检查并删除可能存在的旧表
        const tables = [
            'sessions',
            'user_status', 
            'messages',
            'rooms',
            'users',
            'users_auth'
        ];

        for (const table of tables) {
            try {
                await db.getPool().query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`✓ 已删除表: ${table}`);
            } catch (error) {
                console.log(`  表 ${table} 不存在或已删除`);
            }
        }

        // 删除索引
        const indexes = [
            'idx_messages_room_id',
            'idx_messages_created_at'
        ];

        for (const index of indexes) {
            try {
                await db.getPool().query(`DROP INDEX IF EXISTS ${index}`);
                console.log(`✓ 已删除索引: ${index}`);
            } catch (error) {
                console.log(`  索引 ${index} 不存在或已删除`);
            }
        }

        console.log('数据库清理完成');
    } catch (error) {
        console.error('数据库清理失败:', error);
        throw error;
    }
}
