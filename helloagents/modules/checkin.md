# checkin 模块

## 职责
- 维护签到站点列表与状态
- 执行一键签到并汇总结果
- 提供手动签到跳转入口
- 提供后端定时自动签到调度
- 写回今日签到结果到站点表

## 接口定义
- `POST /api/sites/checkin-all`: 站点一键签到（仅 new-api + 自动签到开启）

## 行为规范
- 一键签到仅执行 `status=active` 的站点
- 仅对 `site_type=new-api` 且 `checkin_enabled=1` 的站点执行签到
- `checkin_sites` CRUD 接口已移除，签到字段统一由 `channels` 承载
- 一键签到会跳过 `last_checkin_date` 已是北京时间当日且状态为成功/已签的站点
- 定时签到由 `CheckinScheduler` Durable Object 触发，每天最多执行一次
- 定时签到始终启用，仅按 `settings.checkin_schedule_time` 到点执行
- 当签到时间变更且已到新时间时，允许当日再次执行一次
- 手动签到优先打开 `checkin_url`，为空则打开 `base_url`
- 签到执行使用 `checkin_url`（若为空则回退 `base_url`）拼接 `/api/user/checkin`
- 请求头必须携带 `New-Api-User`（值来自站点的 `userid` 配置）
- 签到结果写回 `channels.last_checkin_*` 字段（date/status/message/at）

## 依赖关系
- `worker` 路由与 D1 数据表 `channels`
- `admin-ui` 负责前端交互与结果展示
- `settings` 模块提供签到时间配置
