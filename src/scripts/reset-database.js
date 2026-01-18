const { cleanupDatabase } = require('../dist/database/cleanup');
const { initializeDatabase } = require('../dist/database/init');
const { getDatabase } = require('../dist/utils/database');
require('dotenv').config();

async function resetDatabase() {
    console.log('========================================');
    console.log('开始重置数据库');
    console.log('========================================\n');

    try {
        // 1. 清理数据库
        console.log('步骤 1/3: 清理数据库表...');
        await cleanupDatabase();
        console.log('✓ 数据库表清理完成\n');

        // 2. 重新初始化数据库
        console.log('步骤 2/3: 重新初始化数据库...');
        await initializeDatabase();
        console.log('✓ 数据库初始化完成\n');

        // 3. 完成
        console.log('步骤 3/3: 验证数据库结构...');

        const db = getDatabase();

        // 测试查询
        const testResult = await db.get('SELECT 1 as test');
        if (testResult && testResult.test === 1) {
            console.log('✓ 数据库验证通过\n');
        }

        console.log('========================================');
        console.log('✅ 数据库重置成功！');
        console.log('========================================\n');
        console.log('现在可以重新注册和登录了。');

        process.exit(0);
    } catch (error) {
        console.error('\n========================================');
        console.error('❌ 数据库重置失败！');
        console.error('========================================');
        console.error('错误详情:', error);
        process.exit(1);
    }
}

// 执行重置
resetDatabase();
