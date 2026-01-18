import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import roomRoutes from './routes/roomRoutes';
import messageRoutes from './routes/messageRoutes';
import fileRoutes from './routes/fileRoutes';
import sseRoutes from './routes/sseRoutes';
import authRoutes from './routes/authRoutes';
import { initializeDatabase } from './database/init';
import { cleanupDatabase } from './database/cleanup';
import { getDatabase } from './utils/database';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
// 根据环境配置CORS
const isProduction = process.env.NODE_ENV === 'production';

// 从环境变量读取CORS域名配置，支持多个域名用逗号分隔
function getCorsOrigins(): string[] {
    if (isProduction) {
        // 生产环境：从环境变量读取，或使用默认配置
        const corsEnv = process.env.CORS_ORIGIN;
        if (corsEnv) {
            return corsEnv.split(',').map(origin => origin.trim());
        }
        // 默认生产环境域名（需要根据实际情况修改）
        return ['https://yourdomain.com', 'https://www.yourdomain.com'];
    } else {
        // 开发环境
        return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
    }
}

const corsOptions = {
    origin: getCorsOrigins(),
    credentials: true
};
app.use(cors(corsOptions));

// 速率限制器 - 1分钟内限制10次请求
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 10, // 限制10次请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        return req.ip || req.socket.remoteAddress || 'unknown';
    }
});

// 对API路由应用速率限制（排除健康检查和SSE）
app.use('/api/', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/sse')) {
        next();
    } else {
        apiLimiter(req, res, next);
    }
});

// Cookie解析中间件
app.use(cookieParser());

// SSE优化中间件 - 禁用SSE路径的压缩和缓冲
app.use('/api/sse', (_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('Content-Encoding');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供上传的文件访问（带缓存优化）
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: '7d', // 7天缓存
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
        // 图片设置更长的缓存时间
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filepath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30天
        }
    }
}));

// 请求日志中间件 - 生产环境只记录错误和重要请求
app.use((req, _res, next) => {
    if (!isProduction) {
        // 开发环境：详细日志
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    }
    next();
});

// 路由
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/auth', authRoutes);

// 临时清理数据库端点（仅开发环境）
if (!isProduction) {
    app.post('/api/admin/cleanup-database', async (_req, res) => {
        try {
            await cleanupDatabase();
            await initializeDatabase();
            res.json({ success: true, message: '数据库清理并重新初始化成功' });
        } catch (error) {
            console.error('数据库清理失败:', error);
            res.status(500).json({ success: false, message: '数据库清理失败' });
        }
    });
}

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理 - API 路由不存在时返回 404
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ success: false, message: '接口不存在' });
        return;
    }

    // 对于非 API 请求，提示前端未连接
    res.status(404).json({
        success: false,
        message: '页面不存在 - 前端服务未运行或未连接到后端'
    });
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (isProduction) {
        // 生产环境：记录错误但不暴露详细信息
        console.error(`[${new Date().toISOString()}] 错误:`, {
            method: req.method,
            path: req.path,
            error: err.message
        });
        res.status(500).json({ success: false, message: '服务器内部错误' });
    } else {
        // 开发环境：详细错误信息
        console.error('服务器错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: err.message,
            stack: err.stack
        });
    }
});

// 初始化数据库并启动服务器
async function startServer() {
    try {
        const db = getDatabase();

        console.log('正在测试数据库连接...');
        const connectionTest = await db.testConnection();

        if (!connectionTest) {
            console.error('无法连接到数据库，请检查:');
            console.error('  1. 网络连接是否正常');
            console.error('  2. POSTGRES_URL 配置是否正确');
            console.error('  3. 防火墙是否阻止了连接');
            console.error('  4. 数据库服务是否正常运行');
            process.exit(1);
        }

        console.log('正在初始化数据库...');
        await initializeDatabase();

        const server = app.listen(PORT, () => {
            if (isProduction) {
                console.log(`生产服务器启动成功 - 端口: ${PORT}`);
                console.log(`数据库: PostgreSQL (已连接)`);
                console.log(`环境: production`);
            } else {
                console.log(`开发服务器运行在 http://localhost:${PORT}`);
                console.log(`数据库: PostgreSQL (已连接)`);
                console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
            }
        });

        // 优雅关闭处理
        const gracefulShutdown = async (signal: string) => {
            console.log(`收到 ${signal} 信号，正在关闭服务器...`);
            
            server.close(async () => {
                console.log('HTTP 服务器已关闭');
                
                try {
                    const db = getDatabase();
                    await db.close();
                    console.log('数据库连接池已关闭');
                } catch (error) {
                    console.error('关闭数据库连接池时出错:', error);
                }
                
                console.log('服务器已完全关闭');
                process.exit(0);
            });

            // 强制关闭超时（30秒后）
            setTimeout(() => {
                console.error('无法在30秒内完全关闭，强制退出');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
}

startServer();
