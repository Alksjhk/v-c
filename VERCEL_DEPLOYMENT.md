# Vercel 部署指南

本项目已配置为可在 Vercel 上部署的全栈应用。以下是详细的部署步骤。

## 项目结构

```
/v-c/
├── src/                    # 后端源代码
│   ├── app.ts             # Express 应用入口
│   └── ...                # 其他后端文件
├── clinet/                # 前端 React 应用
│   ├── src/               # 前端源代码
│   └── dist/              # 前端构建产物 (构建后生成)
├── dist/                  # 后端构建产物 (构建后生成)
├── vercel.json            # Vercel 配置文件
├── package.json           # 项目依赖和脚本
└── .env.vercel.example    # 环境变量示例
```

## 部署步骤

### 1. 准备数据库

Vercel 部署需要 PostgreSQL 数据库。推荐使用以下服务：
- **Vercel Postgres** (推荐，集成度高)
- **Supabase** (免费额度充足)
- **Neon** (Serverless PostgreSQL)

获取数据库连接字符串后，在 Vercel Dashboard 中设置环境变量。

### 2. 配置 Vercel 环境变量

在 Vercel Dashboard 的项目设置中，添加以下环境变量：

| 环境变量名 | 说明 | 示例值 |
|-----------|------|--------|
| `POSTGRES_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host:port/db` |
| `CORS_ORIGIN` | 允许的 CORS 域名 | `https://your-project.vercel.app` |
| `NODE_ENV` | 环境类型 | `production` |

> **注意**：`CORS_ORIGIN` 需要包含你的 Vercel 域名，格式为 `https://your-project.vercel.app`

### 3. 部署到 Vercel

#### 方法 A: 通过 Vercel Dashboard (推荐)

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 点击 "Add New" → "Project"
3. 导入你的 GitHub/GitLab 仓库
4. Vercel 会自动检测到 `vercel.json` 配置文件
5. 点击 "Deploy"，等待部署完成

#### 方法 B: 通过 Vercel CLI

1. 安装 Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. 登录 Vercel:
   ```bash
   vercel login
   ```

3. 部署项目:
   ```bash
   cd /v-c
   vercel
   ```

4. 按照提示完成配置:
   - 选择项目名称
   - 确认构建命令: `bun run vercel-build`
   - 确认输出目录: `dist`

### 4. 构建过程

Vercel 会自动执行以下构建步骤：

1. **安装依赖**: `bun install`
2. **构建后端**: `bun build src/app.ts --outdir ./dist --target node`
3. **构建前端**: `cd clinet && bun run build`
4. **生成产物**:
   - 后端: `/dist/app.js`
   - 前端: `/clinet/dist/` (HTML, CSS, JS, 静态资源)

### 5. 部署后的配置

部署成功后，你可能需要：

#### 设置自定义域名 (可选)
1. 在 Vercel Dashboard 中添加自定义域名
2. 配置 DNS 记录指向 Vercel
3. 更新 `CORS_ORIGIN` 环境变量包含新域名

#### 数据库初始化
首次部署时，数据库表会自动创建。如果需要手动初始化：
```bash
# 本地执行
bun run reset-db
```

## API 端点

部署后，你的应用将提供以下端点：

### 后端 API
- `https://your-project.vercel.app/api/auth/register` - 用户注册
- `https://your-project.vercel.app/api/auth/login` - 用户登录
- `https://your-project.vercel.app/api/rooms/public` - 获取公共房间
- `https://your-project.vercel.app/api/sse/:roomId` - 实时消息推送 (SSE)

### 前端应用
- `https://your-project.vercel.app/` - 主应用界面

### 健康检查
- `https://your-project.vercel.app/health` - 服务健康状态

## 环境变量说明

### 必需的环境变量

| 变量名 | 说明 | 是否必需 |
|--------|------|----------|
| `POSTGRES_URL` | PostgreSQL 数据库连接字符串 | ✅ 必需 |
| `CORS_ORIGIN` | CORS 允许的域名 (多个用逗号分隔) | ✅ 必需 |
| `NODE_ENV` | 环境类型 (production/development) | ✅ 必需 |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | 3001 (Vercel 会忽略) |

## 常见问题

### 1. CORS 错误
**问题**: 前端无法连接到后端 API

**解决**: 确保 `CORS_ORIGIN` 环境变量包含你的 Vercel 域名：
```
CORS_ORIGIN=https://your-project.vercel.app
```

### 2. 数据库连接失败
**问题**: 无法连接到 PostgreSQL

**解决**:
1. 检查 `POSTGRES_URL` 格式是否正确
2. 确保数据库服务正常运行
3. 检查数据库防火墙规则

### 3. 前端路由 404
**问题**: 刷新页面或直接访问子路由时出现 404

**解决**: 这是正常的，Vercel 配置已处理客户端路由。确保 `vercel.json` 中的路由配置正确。

### 4. 构建失败
**问题**: 构建过程中出现错误

**解决**:
1. 检查 `package.json` 中的依赖是否完整
2. 确认 `bun` 版本兼容性
3. 查看 Vercel 构建日志获取详细错误信息

## 开发 vs 生产环境

### 开发环境
- 前端: `http://localhost:5173` (Vite dev server)
- 后端: `http://localhost:3001` (Bun dev server)
- 数据库: 本地 PostgreSQL

### 生产环境 (Vercel)
- 前端: `https://your-project.vercel.app/` (静态文件服务)
- 后端: `https://your-project.vercel.app/api/*` (Node.js 函数)
- 数据库: 远程 PostgreSQL

## 监控和日志

### Vercel 日志
在 Vercel Dashboard 中查看实时日志：
1. 进入项目 → "Deployments"
2. 点击最新部署
3. 查看 "Logs" 标签页

### 性能监控
Vercel 自动提供：
- 响应时间监控
- 错误率统计
- 流量分析

## 备份和恢复

### 数据库备份
使用数据库提供商的备份功能：
- Vercel Postgres: 自动备份
- Supabase: 每日自动备份
- Neon: 时间点恢复

### 代码备份
代码已存储在 Git 仓库中，可随时回滚到历史版本。

## 扩展功能

### 自定义域名
1. 在 Vercel Dashboard 添加域名
2. 配置 DNS 记录
3. 等待 DNS 生效 (通常几分钟到几小时)

### 自动部署
配置 Git Hook 实现自动部署：
1. 在 Vercel Dashboard 启用 "Git Integration"
2. 每次 push 到 main 分支会自动部署

### 环境变量管理
使用 Vercel 的环境变量组功能管理不同环境的配置：
- Development
- Preview
- Production

## 技术栈

- **后端**: Express.js + TypeScript + Bun
- **前端**: React + Vite + TypeScript
- **数据库**: PostgreSQL
- **部署平台**: Vercel
- **实时通信**: Server-Sent Events (SSE)

## 支持

如有问题，请检查：
1. Vercel 构建日志
2. 浏览器开发者工具 (Network/Console)
3. 环境变量配置
4. 数据库连接状态

---

**最后更新**: 2026-01-18
