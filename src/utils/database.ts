import { Pool, QueryResult, PoolConfig, QueryResultRow } from 'pg';

interface PoolConfiguration {
    max: number;
    min: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    ssl: { rejectUnauthorized: false };
    maxUses: number;
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
}

class Database {
    protected pool: Pool;

    constructor() {
        const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

        let poolConfig: PoolConfiguration = {
            max: 20,
            min: 2,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 10000,
            ssl: { rejectUnauthorized: false },
            maxUses: 7500
        };

        if (postgresUrl) {
            // 解析连接字符串 postgres://user:pass@host:5432/db?sslmode=require
            const url = new URL(postgresUrl);
            console.log(`连接到数据库: ${url.hostname}:${url.port || '5432'}/${url.pathname.slice(1)}`);

            // 检查URL中是否包含sslmode参数
            const sslMode = url.searchParams.get('sslmode');
            if (sslMode === 'require') {
                poolConfig.ssl = { rejectUnauthorized: false };
            }

            poolConfig = {
                ...poolConfig,
                connectionString: postgresUrl,
            };
        } else {
            // 使用独立的环境变量
            const host = process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost';
            const port = parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432');
            const database = process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'chat_db';

            console.log(`连接到数据库: ${host}:${port}/${database}`);

            poolConfig = {
                ...poolConfig,
                host,
                port,
                database,
                user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
                password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || '',
            };
        }

        this.pool = new Pool(poolConfig);

        // 监听连接池错误
        this.pool.on('error', (err: Error) => {
            console.error('数据库连接池错误:', err.message);
            process.exit(-1);
        });
    }

    async get<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
        const result: QueryResult<T> = await this.pool.query(sql, params);
        return result.rows[0] || null;
    }

    async all<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
        const result: QueryResult<T> = await this.pool.query(sql, params);
        return result.rows;
    }

    async run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
        const result: QueryResult = await this.pool.query(sql, params);
        // PostgreSQL 使用 RETURNING 返回插入的ID
        if (result.rows.length > 0 && result.rows[0].id) {
            return { lastID: result.rows[0].id, changes: result.rowCount || 0 };
        }
        return { lastID: 0, changes: result.rowCount || 0 };
    }

    // 关闭连接池
    async close(): Promise<void> {
        await this.pool.end();
    }

    // 获取连接池实例
    getPool(): Pool {
        return this.pool;
    }

    // 测试数据库连接
    async testConnection(): Promise<boolean> {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('✓ 数据库连接测试成功');
            return true;
        } catch (error) {
            console.error('✗ 数据库连接测试失败:', error);
            return false;
        }
    }
}

// 单例模式
let dbInstance: Database | null = null;

export function getDatabase(): Database {
    if (!dbInstance) {
        dbInstance = new Database();
    }
    return dbInstance;
}

export default getDatabase();
