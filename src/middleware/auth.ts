import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../utils/database';

interface SessionWithUser {
    user_id: string;
    expires_at: Date;
    username: string;
    unique_id: string;
}

// 扩展Request类型，添加user属性
declare global {
    namespace Express {
        interface Request {
            user?: {
                uniqueId: string;
                username: string;
            };
        }
    }
}

// 认证中间件 - 从cookie或请求头中验证sessionId
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // 优先从cookie获取，其次从请求头获取
        let sessionId = req.cookies?.session_id;
        
        if (!sessionId) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                sessionId = authHeader.substring(7);
            }
        }

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: '未登录，请先登录'
            });
        }

        const db = getDatabase();

        // 查询session
        const session = await db.get<SessionWithUser>(
            `SELECT s.user_id, s.expires_at, u.username, u.unique_id
             FROM sessions s
             JOIN users_auth u ON s.user_id = u.unique_id
             WHERE s.session_id = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
            [sessionId]
        );

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session无效或已过期'
            });
        }

        // 将用户信息添加到请求对象
        req.user = {
            uniqueId: session.unique_id,
            username: session.username
        };

        next();
    } catch (error) {
        console.error('认证中间件错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
}

export {};

// 可选认证中间件 - 不强制要求登录
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    try {
        const sessionId = req.cookies?.session_id;

        if (sessionId) {
            const db = getDatabase();

            const session = await db.get<SessionWithUser>(
                `SELECT s.user_id, s.expires_at, u.username, u.unique_id
                 FROM sessions s
                 JOIN users_auth u ON s.user_id = u.unique_id
                 WHERE s.session_id = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
                [sessionId]
            );

            if (session) {
                req.user = {
                    uniqueId: session.unique_id,
                    username: session.username
                };
            }
        }

        next();
    } catch (error) {
        console.error('可选认证中间件错误:', error);
        next();
    }
}
