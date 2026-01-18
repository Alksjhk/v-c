import crypto from 'crypto';
import { Request, Response } from 'express';
import { getDatabase } from '../utils/database';

interface UserRecord {
    unique_id: string;
    username: string;
    password_hash: string;
}

interface SessionRecord {
    session_id: string;
    expires_at: Date;
}

interface SessionWithUser {
    user_id: string;
    expires_at: Date;
    username: string;
    unique_id: string;
}

interface ExistingUserRecord {
    unique_id: string;
}

// SHA-256哈希函数
function sha256Hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
}

// 生成6位唯一ID
function generateUniqueId(username: string, password: string): string {
    const hash = sha256Hash(username + password + Date.now());
    const num = BigInt('0x' + hash).toString().slice(0, 6);
    return num.padEnd(6, '0').slice(0, 6);
}

// 生成16位随机字符串
function generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 注册接口
export async function register(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        // 参数验证
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        // 用户名长度验证
        if (username.length < 2 || username.length > 15) {
            return res.status(400).json({
                success: false,
                message: '用户名长度必须在2-15个字符之间'
            });
        }

        // 密码长度验证
        if (password.length < 6 || password.length > 20) {
            return res.status(400).json({
                success: false,
                message: '密码长度必须在6-20个字符之间'
            });
        }

        // 用户名格式验证
        if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: '用户名只能包含字母、数字、中文、下划线和横线'
            });
        }

        const db = getDatabase();

        // 检查用户名是否已存在
        const existingUser = await db.get<ExistingUserRecord>(
            'SELECT unique_id FROM users_auth WHERE username = $1',
            [username]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 密码哈希
        const passwordHash = sha256Hash(password);

        // 生成6位唯一ID
        let uniqueId = generateUniqueId(username, password);

        // 检查unique_id是否已存在
        let existingUniqueId = await db.get<ExistingUserRecord>(
            'SELECT unique_id FROM users_auth WHERE unique_id = $1',
            [uniqueId]
        );

        // 如果unique_id已存在，重新生成
        while (existingUniqueId) {
            const newUniqueId = generateUniqueId(username + Date.now(), password);
            existingUniqueId = await db.get<ExistingUserRecord>(
                'SELECT unique_id FROM users_auth WHERE unique_id = $1',
                [newUniqueId]
            );
            if (!existingUniqueId) {
                uniqueId = newUniqueId;
                break;
            }
        }

        // 插入用户
        await db.run(
            'INSERT INTO users_auth (unique_id, username, password_hash) VALUES ($1, $2, $3)',
            [uniqueId, username, passwordHash]
        );

        console.log(`用户注册成功: ${username} (${uniqueId})`);

        res.status(200).json({
            success: true,
            message: '注册成功',
            data: {
                username,
                uniqueId
            }
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            success: false,
            message: '注册失败，请稍后重试'
        });
    }
}

// 登录接口
export async function login(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        // 参数验证
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        const db = getDatabase();

        // 查询用户
        const user = await db.get<UserRecord>(
            'SELECT username, password_hash, unique_id FROM users_auth WHERE username = $1',
            [username]
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 验证密码
        const passwordHash = sha256Hash(password);
        if (passwordHash !== user.password_hash) {
            return res.status(400).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 检查是否有有效的session
        const existingSession = await db.get<SessionRecord>(
            'SELECT session_id, expires_at FROM sessions WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP',
            [user.unique_id]
        );

        let sessionId;

        if (existingSession) {
            // 使用现有session
            sessionId = existingSession.session_id;
            console.log(`用户登录成功（复用session）: ${username}`);
        } else {
            // 创建新session
            sessionId = generateSessionToken();
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48小时后过期

            await db.run(
                'INSERT INTO sessions (user_id, session_id, expires_at) VALUES ($1, $2, $3)',
                [user.unique_id, sessionId, expiresAt.toISOString()]
            );

            console.log(`用户登录成功（新session）: ${username}`);
        }

        // 设置HTTP Cookie（同时返回sessionId在响应体中作为备用）
        res.cookie('session_id', sessionId, {
            httpOnly: true,        // 防止XSS攻击
            secure: process.env.NODE_ENV === 'production',  // 生产环境使用HTTPS
            sameSite: 'none',       // 允许跨站发送cookie（开发环境需要配合secure=false）
            // 开发环境下sameSite设为'lax'以避免HTTPS要求
            ...(process.env.NODE_ENV !== 'production' && { sameSite: 'lax' }),
            maxAge: 48 * 60 * 60 * 1000  // 48小时
        });

        res.status(200).json({
            success: true,
            message: '登录成功',
            data: {
                username: user.username,
                uniqueId: user.unique_id,
                sessionId  // 保留在响应体中，兼容旧客户端
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试'
        });
    }
}

// 验证session接口
export async function verifySession(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID不能为空'
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

        res.status(200).json({
            success: true,
            message: 'Session有效',
            data: {
                username: session.username,
                uniqueId: session.unique_id,
                expiresAt: session.expires_at
            }
        });
    } catch (error) {
        console.error('验证Session失败:', error);
        res.status(500).json({
            success: false,
            message: '验证失败，请稍后重试'
        });
    }
}

// 登出接口
export async function logout(req: Request, res: Response) {
    try {
        // 从cookie获取sessionId
        const sessionId = req.cookies?.session_id || req.body?.sessionId;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID不能为空'
            });
        }

        const db = getDatabase();

        // 删除session
        await db.run('DELETE FROM sessions WHERE session_id = $1', [sessionId]);

        // 清除cookie
        res.clearCookie('session_id', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            ...(process.env.NODE_ENV !== 'production' && { sameSite: 'lax' })
        });

        console.log('用户登出成功');

        res.status(200).json({
            success: true,
            message: '登出成功'
        });
    } catch (error) {
        console.error('登出失败:', error);
        res.status(500).json({
            success: false,
            message: '登出失败，请稍后重试'
        });
    }
}
