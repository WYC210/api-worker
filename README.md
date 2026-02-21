# api-worker

简易版 new-api：Cloudflare Workers + D1 后端，Vite 静态管理台。
管理台构建产物通过 Worker Static Assets 与 Worker 一起部署。

## 目录结构

- `apps/worker` Cloudflare Worker (Hono)
- `apps/ui` 管理台 (Vite)
- `tests` 基础单元测试

## Action 自动部署流程（GitHub Actions）

工作流名称：`Deploy SPA CF Workers[Worker一体化部署]`

### 1) 配置 GitHub Secrets

在仓库 Settings → Secrets and variables → Actions 中新增：

- `CLOUDFLARE_API_TOKEN`：需包含 Workers + D1 的读写权限
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID

### 2) 可选配置 Actions 变量

- `SPA_DEPLOY`：自动部署开关（`true`/`false`），未设置时默认启用

### 3) 触发方式

- 自动触发：push 到 `main` 或 `master`，且变更命中 `apps/ui/**` 或 `apps/worker/**`
  - 受 `SPA_DEPLOY` 控制
- 手动触发：Actions 页面选择工作流并 Run workflow
  - 默认不受 `SPA_DEPLOY` 影响（除非设置 `from_panel=true`）
- 外部触发：`repository_dispatch`（type = `deploy-spa-button`）
  - 不受 `SPA_DEPLOY` 影响

### 4) 触发参数（workflow_dispatch）

- `deploy_target`：`frontend`/`backend`/`both`/`auto`（默认 auto）
  - `frontend` 仍会部署 Worker（静态资源随 Worker 发布）
  - `auto` 在 push 时按变更范围决定，手动触发默认部署前后端
- `apply_migrations`：`true`/`false`/`auto`（默认 auto）
  - `auto` 仅在 push 且迁移文件变更时执行
- `from_panel`：`true`/`false`（是否由控制面板触发；为 true 时会尊重 `SPA_DEPLOY`）

### 5) 部署步骤摘要

- Checkout → 安装 Bun 1.3.9 → `bun install`
- 构建管理台（`apps/ui/dist`），并校验产物
- 关闭 wrangler telemetry
- 创建/校验 D1（`api-worker`），在 CI 内写入 `apps/worker/wrangler.toml` 的 `database_id`
- 按需执行远程迁移
- `wrangler deploy` 部署 Worker

## 本地开发流程

### 0) 前置要求

- Bun 1.3.9（见 `package.json` 的 `packageManager`）
- Cloudflare Wrangler（通过 `bunx wrangler` 使用）

### 1) 安装依赖

```bash
bun install
```

### 2) 启动 Worker（后端）

```bash
bun run dev:worker
```

说明：

- 默认使用 `apps/worker/wrangler.toml`
- 本地端口通常为 8787（wrangler 默认）
- D1 使用本地数据库

环境变量/配置（`apps/worker/wrangler.toml` 或 `wrangler secret put`）：

- `CORS_ORIGIN` 允许的管理台来源（如 UI 使用 4173 端口，请同步调整）
- `PROXY_RETRY_ROUNDS` 代理失败轮询次数（默认 2）
- `PROXY_RETRY_DELAY_MS` 轮询间隔（毫秒，默认 200）

系统设置（管理台 → 系统设置）：

- 日志保留天数（默认 30）
- 会话时长（小时，默认 12）
- 管理员密码（首次登录在登录页输入密码将自动设置，可在系统设置中修改）

### 3) 启动管理台 UI

```bash
bun run dev:ui
```

说明：

- 默认端口为 4173（见根目录脚本）

前端配置（`apps/ui/.env` 可选）：

- `VITE_API_BASE` 管理 API 基址（默认同域）
- `VITE_API_TARGET` 本地开发代理目标（默认 http://localhost:8787）

### 4) 本地数据库迁移（可选/首次启动推荐）

```bash
bun run --filter api-worker db:migrate
```

### 5) 常用命令

- `bun run test`
- `bun run typecheck`
- `bun run lint`
- `bun run format`

## API 接口

### 鉴权方式概览

- 管理台接口（`/api/*`）：
  - 管理员登录后获取会话 token，推荐使用 `Authorization: Bearer {token}`
  - 也支持 `x-admin-token` 或 `x-api-key` 作为备选头
- New API 兼容接口（`/api/channel`、`/api/group`、`/api/user`）：
  - `Authorization: Bearer {管理员密码}` 或管理员登录 token
  - 可选请求头：`New-Api-User: 1`
- OpenAI 兼容代理（`/v1/*`）：
  - 使用 `Authorization: Bearer {API Token}`（或 `x-api-key`）
  - API Token 由 `/api/tokens` 创建与管理
- 健康检查：`GET /health` 无鉴权

### 管理台接口（/api/\*）

- `POST /api/auth/login` 管理员登录
- `POST /api/auth/logout` 管理员登出
- `GET /api/channels` 渠道列表
- `POST /api/channels` 新增渠道
- `PATCH /api/channels/:id` 更新渠道
- `DELETE /api/channels/:id` 删除渠道
- `POST /api/channels/:id/test` 渠道连通性测试并刷新模型
- `GET /api/models` 汇总所有渠道模型
- `GET /api/tokens` 令牌列表
- `POST /api/tokens` 新建令牌（返回明文 token）
- `PATCH /api/tokens/:id` 更新令牌（配额/状态/允许渠道等）
- `GET /api/tokens/:id/reveal` 查看令牌明文
- `DELETE /api/tokens/:id` 删除令牌
- `GET /api/usage` 使用日志（支持 `from/to/model/channel_id/token_id/limit`）
- `GET /api/dashboard` 面板聚合指标（支持 `from/to`）
- `GET /api/settings` 读取系统设置
- `PUT /api/settings` 更新系统设置（日志保留/会话时长/管理员密码）

### New API 兼容接口（/api/channel /api/group /api/user）

渠道管理（`/api/channel`）：

- `GET /api/channel` 渠道列表（支持分页与筛选）
- `GET /api/channel/search` 渠道搜索（keyword/group/model/status/type）
- `GET /api/channel/:id` 渠道详情
- `POST /api/channel` 新增渠道（单条）
- `PUT /api/channel` 更新渠道
- `DELETE /api/channel/:id` 删除渠道
- `GET /api/channel/test/:id` 渠道连通性测试
- `POST /api/channel/test` 渠道连通性测试（body 传 id）
- `GET /api/channel/fetch_models/:id` 拉取渠道模型
- `POST /api/channel/fetch_models` 拉取模型（body 传 base_url/key）
- `GET /api/channel/models` 模型列表
- `GET /api/channel/models_enabled` 启用模型列表
- `PUT /api/channel/tag` 批量更新 tag 权重/优先级
- `POST /api/channel/tag/enabled` 批量启用 tag
- `POST /api/channel/tag/disabled` 批量停用 tag

分组与用户（只读）：

- `GET /api/group` 渠道分组列表
- `GET /api/user/models` 用户可用模型列表

### OpenAI 兼容代理（/v1/\*）

- `ALL /v1/*` 转发到渠道 `base_url + 请求路径`
- 当请求路径为 `/v1/responses` 且上游 400/404 时自动回退到 `/responses`
- 流式请求会自动补齐 `stream_options.include_usage = true` 以收集用量

