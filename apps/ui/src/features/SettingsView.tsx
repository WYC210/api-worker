import type { RuntimeProxyConfig, SettingsForm } from "../core/types";

type SettingsViewProps = {
	settingsForm: SettingsForm;
	adminPasswordSet: boolean;
	isSaving: boolean;
	runtimeConfig?: RuntimeProxyConfig | null;
	onSubmit: (event: Event) => void;
	onFormChange: (patch: Partial<SettingsForm>) => void;
};

/**
 * Renders the settings view.
 *
 * Args:
 *   props: Settings view props.
 *
 * Returns:
 *   Settings JSX element.
 */
export const SettingsView = ({
	settingsForm,
	adminPasswordSet,
	isSaving,
	runtimeConfig,
	onSubmit,
	onFormChange,
}: SettingsViewProps) => {
	const runtimeItems = [
		{
			label: "流式 usage 解析模式",
			value: runtimeConfig?.stream_usage_mode ?? "lite",
			env: "PROXY_STREAM_USAGE_MODE",
		},
		{
			label: "流式解析最大字节",
			value: runtimeConfig?.stream_usage_max_bytes ?? 262144,
			env: "PROXY_STREAM_USAGE_MAX_BYTES",
		},
		{
			label: "流式解析并发上限",
			value: runtimeConfig?.stream_usage_max_parsers ?? 2,
			env: "PROXY_STREAM_USAGE_MAX_PARSERS",
		},
		{
			label: "队列开关",
			value: runtimeConfig?.usage_queue_enabled ? "启用" : "关闭",
			env: "PROXY_USAGE_QUEUE_ENABLED",
		},
		{
			label: "队列绑定",
			value: runtimeConfig?.usage_queue_bound ? "已绑定" : "未绑定",
			env: "USAGE_QUEUE 绑定",
		},
		{
			label: "队列实际生效",
			value: runtimeConfig?.usage_queue_active ? "是" : "否",
			env: "USAGE_QUEUE 运行时",
		},
	];

	return (
		<div class="app-card animate-fade-up p-5">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="app-title text-lg">系统设置</h3>
			</div>
			<form class="grid gap-3.5 lg:grid-cols-2" onSubmit={onSubmit}>
				<div>
					<label
						class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
						for="retention"
					>
						日志保留天数
					</label>
					<input
						class="app-input app-focus"
						id="retention"
						name="log_retention_days"
						type="number"
						min="1"
						value={settingsForm.log_retention_days}
						onInput={(event) => {
							const target = event.currentTarget as HTMLInputElement | null;
							onFormChange({
								log_retention_days: target?.value ?? "",
							});
						}}
					/>
				</div>
				<div>
					<label
						class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
						for="session-ttl"
					>
						会话时长（小时）
					</label>
					<input
						class="app-input app-focus"
						id="session-ttl"
						name="session_ttl_hours"
						type="number"
						min="1"
						value={settingsForm.session_ttl_hours}
						onInput={(event) => {
							const target = event.currentTarget as HTMLInputElement | null;
							onFormChange({
								session_ttl_hours: target?.value ?? "",
							});
						}}
					/>
				</div>
				<div>
					<label
						class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
						for="checkin-schedule-time"
					>
						签到时间（中国时间）
					</label>
					<input
						class="app-input app-focus"
						id="checkin-schedule-time"
						name="checkin_schedule_time"
						type="time"
						value={settingsForm.checkin_schedule_time}
						onInput={(event) => {
							const target = event.currentTarget as HTMLInputElement | null;
							onFormChange({
								checkin_schedule_time: target?.value ?? "",
							});
						}}
					/>
				</div>
				<div>
					<label
						class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
						for="failure-cooldown"
					>
						失败冷却（分钟）
					</label>
					<input
						class="app-input app-focus"
						id="failure-cooldown"
						name="model_failure_cooldown_minutes"
						type="number"
						min="1"
						value={settingsForm.model_failure_cooldown_minutes}
						onInput={(event) => {
							const target = event.currentTarget as HTMLInputElement | null;
							onFormChange({
								model_failure_cooldown_minutes: target?.value ?? "",
							});
						}}
					/>
					<p class="mt-1 text-xs text-[color:var(--app-ink-muted)]">
						同一模型失败后在该时间内跳过对应渠道。
					</p>
				</div>
				<div class="lg:col-span-2">
					<label
						class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
						for="admin-password"
					>
						管理员密码
					</label>
					<input
						class="app-input app-focus"
						id="admin-password"
						name="admin_password"
						type="password"
						placeholder={
							adminPasswordSet
								? "已设置，留空则不修改"
								: "未设置，保存后即为登录密码"
						}
						value={settingsForm.admin_password}
						onInput={(event) => {
							const target = event.currentTarget as HTMLInputElement | null;
							onFormChange({
								admin_password: target?.value ?? "",
							});
						}}
					/>
					<p class="mt-1 text-xs text-[color:var(--app-ink-muted)]">
						密码状态：{adminPasswordSet ? "已设置" : "未设置"}
					</p>
				</div>
				<div class="flex items-end lg:col-span-2">
					<button
						class="app-button app-button-primary app-focus h-11 px-4 text-sm"
						type="submit"
						disabled={isSaving}
					>
						{isSaving ? "保存中..." : "保存设置"}
					</button>
				</div>
			</form>
			<div class="mt-6 border-t border-white/70 pt-5">
				<h4 class="app-title text-base">运行时配置（只读）</h4>
				<p class="mt-2 text-xs text-[color:var(--app-ink-muted)]">
					需要调整请在 Cloudflare Dashboard 或部署环境中修改以下环境变量，
					此处仅展示当前生效值（环境变量名已在每项卡片内标注）。
				</p>
				<div class="mt-3 grid gap-2 sm:grid-cols-2">
					{runtimeItems.map((item) => (
						<div class="rounded-xl bg-white/70 px-3 py-3 text-sm">
							<div class="text-sm font-semibold text-[color:var(--app-ink)]">
								{item.label}
							</div>
							<div class="mt-1 text-[11px] font-mono text-[color:var(--app-ink-muted)]">
								{item.env}
							</div>
							<div class="mt-2 text-base font-semibold text-[color:var(--app-ink)]">
								{item.value}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
