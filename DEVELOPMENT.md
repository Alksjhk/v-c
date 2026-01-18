# 开发环境说明

## 前后端分离架构

本项目已配置为前后端分离架构，前端和后端可以独立运行和部署。

## 目录结构

```
v-c/
├── src/                    # 后端代码 (Express + TypeScript)
│   ├── app.ts             # 主入口文件
│   ├── routes/            # API 路由
│   ├── controllers/       # 控制器
│   └── ...
├── clinet/                # 前端代码 (React + Vite + TypeScript)
│   ├── src/               # 前端源代码
│   ├── dist/              # 前端构建输出
│   └── ...
├── uploads/               # 上传文件存储目录
└── .env                   # 环境变量配置
```

## 开发环境配置

### 1. 后端服务器 (默认端口: 3001)

启动后端：
```bash
cd v-c
bun run dev
```

后端 API 地址：`http://localhost:3001`

### 2. 前端开发服务器 (默认端口: 5173)

启动前端：
```bash
cd v-c/clinet
bun run dev
```

前端访问地址：`http://localhost:5173`

### 3. 代理配置

前端通过 Vite 代理将 API 请求转发到后端：
- `/api/*` → `http://localhost:3001/api/*`
- `/uploads/*` → `http://localhost:3001/uploads/*`

配置文件：`clinet/vite.config.ts`

## 生产环境部署

### 方式一：独立部署（推荐）

1. **后端部署**
   ```bash
   cd v-c
   bun run build
   bun run start
   ```

2. **前端部署**
   ```bash
   cd v-c/clinet
   bun run build
   # 将 dist/ 目录部署到静态文件服务器或 CDN
   ```

3. **配置前端环境变量**

   创建 `.env.production` 文件：
   ```env
   VITE_API_BASE_URL=https://your-api-domain.com
   VITE_NODE_ENV=production
   ```

### 方式二：后端托管前端（传统方式）

如果需要后端同时托管前端静态文件，可以修改 `src/app.ts`：

```typescript
// 添加前端静态文件服务
const distPath = path.join(__dirname, '../../client/dist');
app.use(express.static(distPath));

// SPA 路由处理
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ success: false, message: '接口不存在' });
        return;
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath);
});
```

## 环境变量配置

### 后端环境变量 (.env)

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# CORS 配置（开发环境已预设 localhost:5173）
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# 数据库配置
POSTGRES_URL=your_postgresql_connection_string
```

### 前端环境变量 (.env.development)

```env
# 开发环境：使用相对路径，由 Vite 代理
VITE_NODE_ENV=development
```

### 前端环境变量 (.env.production)

```env
# 生产环境：配置完整的后端 API 地址
VITE_API_BASE_URL=https://your-api-domain.com
VITE_NODE_ENV=production
```

## API 端点

后端提供的 API 端点：

- `GET /health` - 健康检查
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/verify/:sessionId` - 验证会话
- `POST /api/auth/logout` - 用户登出
- `GET /api/rooms/public` - 获取公共房间
- `POST /api/rooms/create` - 创建房间
- `GET /api/rooms/join/:roomCode` - 加入房间
- `POST /api/messages/send` - 发送消息
- `GET /api/messages/:roomId` - 获取消息
- `GET /api/sse/:roomId` - SSE 实时消息推送
- `POST /api/files/upload` - 文件上传
- `GET /uploads/*` - 访问上传的文件

## 开发工作流

### 1. 同时启动前后端

**终端 1 - 后端：**
```bash
cd v-c
bun run dev
```

**终端 2 - 前端：**
```bash
cd v-c/clinet
bun run dev
```

**访问：** http://localhost:5173

### 2. 仅开发后端

如果只需要测试 API，可以使用 Postman 或 curl：

```bash
# 测试健康检查
curl http://localhost:3001/health

# 测试 API
curl http://localhost:3001/api/rooms/public
```

### 3. 仅开发前端

如果后端已部署，修改前端环境变量：

```env
VITE_API_BASE_URL=https://your-api-domain.com
```

## 常见问题

### Q: 前端无法连接到后端

A: 检查：
1. 后端是否运行在 `http://localhost:3001`
2. 前端 `vite.config.ts` 中的代理配置是否正确
3. CORS 配置是否包含前端域名

### Q: 生产环境部署后前端无法访问

A: 确保：
1. 前端已构建 (`bun run build`)
2. 环境变量 `VITE_API_BASE_URL` 已正确配置
3. 后端 CORS 配置包含前端域名

### Q: 上传的文件无法访问

A: 确保：
1. `uploads/` 目录存在且有写入权限
2. 后端正确配置了静态文件服务
3. 前端请求使用正确的 URL (`/uploads/filename`)

## 部署示例

### Docker 部署（前后端分离）

**后端 Dockerfile:**
```dockerfile
FROM oven/bun:1.0
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY src/ ./src/
EXPOSE 3001
CMD ["bun", "run", "start"]
```

**前端 Dockerfile:**
```dockerfile
FROM oven/bun:1.0 AS builder
WORKDIR /app
COPY clinet/package.json clinet/bun.lock ./
RUN bun install
COPY clinet/ ./
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

## 相关文件

- 后端配置：`src/app.ts`
- 前端 API 配置：`clinet/src/config/api.ts`
- 前端 API 客户端：`clinet/src/utils/api.ts`
- 前端 Vite 配置：`clinet/vite.config.ts`
