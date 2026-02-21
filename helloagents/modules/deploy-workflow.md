# deploy-workflow

## 职责

GitHub Actions 部署流程，负责区分 update/init 动作，控制 UI/Worker 构建、D1 初始化与部署。

## 行为规范

### 初始化部署
**条件**: workflow_dispatch/repository_dispatch 且 `deploy_action=init`，`should_deploy=true`，D1 数据库不存在
**行为**: 创建 D1 数据库 → 远程迁移 → 部署 Worker（含 UI 构建）
**结果**: 完成首次初始化部署

### 常规更新
**条件**: `deploy_action=update` 或 push 自动触发
**行为**: 按变更范围选择前端/后端部署，必要时执行迁移
**结果**: 日常更新发布

## 依赖关系

```yaml
依赖: admin-ui, worker
被依赖: -
```
