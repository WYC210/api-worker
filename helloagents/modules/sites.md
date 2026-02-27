# sites 模块

## 职责
- 聚合渠道与系统令牌为统一“站点”视图
- 提供站点级 CRUD、上游类型与多调用令牌管理
- 提供站点一键签到入口（仅 new-api）

## 接口定义
- `GET /api/sites`: 获取站点列表
- `POST /api/sites`: 新增站点（系统令牌 + 多调用令牌）
- `PATCH /api/sites/:id`: 更新站点信息、系统令牌与调用令牌
- `DELETE /api/sites/:id`: 删除站点
- `POST /api/sites/checkin-all`: 站点一键签到（仅 new-api）

## 行为规范
- 站点主记录来源于 `channels` 表
- 系统令牌与签到配置存储在 `channels` 的 `system_token/system_userid/checkin_*` 字段
- 调用令牌来源于 `channel_call_tokens` 表，按 `channel_id` 聚合
- 站点类型写入 `channels.metadata_json.site_type`
- done-hub 仅使用 `base_url`，不再支持多地址
- openai/Anthropic/gemini 在未填写 base_url 时自动使用官方地址
- 一键签到仅执行满足以下条件的记录:
  - `checkin_enabled=1`

## 依赖关系
- `channels` / `channel_call_tokens` 表
- `channels` / `checkin` / `proxy` 模块
