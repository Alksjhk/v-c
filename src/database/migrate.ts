import { getDatabase } from '../utils/database';

export async function migrateDatabase(): Promise<void> {
    const db = getDatabase();

    try {
        console.log('开始数据库迁移...');

        // 检查并添加消息表的新列 (PostgreSQL 使用 ALTER TABLE ADD COLUMN)
        // 由于初始化时已经创建了完整的表结构，这里主要是兼容旧数据库
        // 如果是从SQLite迁移过来，可以在这里添加缺失的列

        console.log('数据库迁移完成');
    } catch (err) {
        console.error('数据库迁移失败:', err);
        throw err;
    }
}
