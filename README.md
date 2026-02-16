# new-api-lite

简易版 new-api：Cloudflare Workers + D1 后端，Vite 静态管理台。
管理台构建产物通过 Worker Static Assets 与 Worker 一起部署。

## 目录结构

- `apps/worker` Cloudflare Worker (Hono)
- `apps/admin` 管理台 (Vite)
- `tests` 基础单元测试

## 本地开发

### 1) 安装依赖

```bash
bun install
```

### 2) Worker

```bash
bun run dev:worker
```

环境变量（`apps/worker/wrangler.toml` 或 `wrangler secret put`）：

- `CORS_ORIGIN` 允许的管理台来源
- `PROXY_RETRY_ROUNDS` 代理失败轮询次数（默认 2）
- `PROXY_RETRY_DELAY_MS` 轮询间隔（毫秒，默认 200）

系统设置（管理台 → 系统设置）：

- 日志保留天数（默认 30）
- 会话时长（小时，默认 12）
- 管理员密码（首次登录自动初始化，可在系统设置中修改）

### 3) Admin UI

```bash
bun run dev:admin
```

前端配置（`apps/admin/.env` 可选）：

- `VITE_API_BASE` 管理 API 基址（默认同域）
- `VITE_API_TARGET` 本地开发代理目标（默认 http://localhost:8787）

### 4) 常用脚本

```bash
bun run fix
```

用于自动修正 package.json 常见问题（等价于 `bun pm pkg fix`）。

## New API 兼容接口

为了支持 all-api-hub 等插件同步渠道，Worker 提供 New API 风格的渠道管理接口：

- 路径前缀：`/api/channel`
- 认证方式：`Authorization: Bearer {管理员密码}`（或管理台登录 token）
- 可选请求头：`New-Api-User: 1`

支持的常用接口：
- `GET /api/channel` 渠道列表
- `GET /api/channel/` 渠道列表（兼容尾斜杠）
- `GET /api/group` 渠道分组列表
- `GET /api/channel/search` 渠道搜索
- `POST /api/channel` 新增渠道（单条）
- `PUT /api/channel` 更新渠道
- `DELETE /api/channel/:id` 删除渠道
- `GET /api/channel/test/:id` 渠道连通性测试
- `GET /api/channel/fetch_models/:id` 拉取渠道模型
- `GET /api/user/models` 用户可用模型列表

## D1 数据库

在 `apps/worker/migrations/0001_init.sql` 定义表结构，使用 Wrangler 迁移。
本地开发使用本地数据库，云端部署使用 `--remote`：

```bash
bun run --filter new-api-lite-worker db:migrate
```

云端（Cloudflare D1）请使用：

```bash
bunx wrangler d1 migrations apply DB --remote
```

## 忘记管理员密码

管理员密码存储为哈希，可通过删除设置记录来重置，下一次登录会用输入的密码重新初始化：

```bash
bunx wrangler d1 execute DB --command "DELETE FROM settings WHERE key = 'admin_password_hash';"
```

## 云端部署（Cloudflare Workers + D1）

说明：
- 管理台静态资源来自 `apps/admin/dist`
- `/api/*` 与 `/v1/*` 会优先走 Worker 逻辑
- 部署顺序：先构建管理台，再部署 Worker
- 下述 `wrangler deploy` 与 `--remote` 均为云端部署/迁移（非本地模拟）

### 1) 新建部署

1. 安装依赖：

```bash
bun install
```

2. 创建 D1 数据库并回填 `apps/worker/wrangler.toml` 的 `database_id`：

```bash
bunx wrangler d1 create new_api_lite
```

3. 设置 Worker 变量与密钥（如 CORS_ORIGIN）：

其他变量可继续放在 `apps/worker/wrangler.toml` 的 `[vars]` 中，`CORS_ORIGIN` 需指向管理台域名。

4. 构建管理台并上传静态资源：

```bash
bun run --filter new-api-lite-admin build
```

5. 执行远程迁移：

```bash
bunx wrangler d1 migrations apply DB --remote
```

6. 部署 Worker：

```bash
bun run --filter new-api-lite-worker deploy
```

### 2) 更新前端（仅管理台变更）

```bash
bun run --filter new-api-lite-admin build
bun run --filter new-api-lite-worker deploy
```

### 3) 更新后端（仅 Worker 变更）

```bash
bun run --filter new-api-lite-worker deploy
```

### 4) 数据库更新

1. 添加新的迁移文件到 `apps/worker/migrations/`。
2. 执行远程迁移：

```bash
bunx wrangler d1 migrations apply DB --remote
```

### 5) 自动部署（GitHub Actions）

工作流默认在 `main` 分支推送时触发，步骤为：安装依赖 → 构建管理台 → 部署 Worker。

需要在仓库 Secrets 中配置：
- `CLOUDFLARE_API_TOKEN`：具有 Workers 与 D1 权限的 API Token
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID（若 token 无法自动识别账户）

确保 `apps/worker/wrangler.toml` 中已填写 `database_id`。
