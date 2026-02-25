import type { AdminData, SettingsForm, SiteForm, TabItem } from "./types";

export const apiBase = import.meta.env.VITE_API_BASE ?? "";

export const tabs: TabItem[] = [
	{ id: "dashboard", label: "数据面板" },
	{ id: "channels", label: "站点管理" },
	{ id: "models", label: "模型广场" },
	{ id: "tokens", label: "令牌管理" },
	{ id: "usage", label: "使用日志" },
	{ id: "settings", label: "系统设置" },
];

export const initialData: AdminData = {
	sites: [],
	tokens: [],
	models: [],
	usage: [],
	dashboard: null,
	settings: null,
};

export const initialSiteForm: SiteForm = {
	name: "",
	base_url: "",
	weight: 1,
	status: "active",
	site_type: "new-api",
	checkin_url: "",
	system_token: "",
	system_userid: "",
	checkin_enabled: false,
	call_tokens: [
		{
			name: "主调用令牌",
			api_key: "",
		},
	],
};

export const initialSettingsForm: SettingsForm = {
	log_retention_days: "30",
	session_ttl_hours: "12",
	admin_password: "",
	checkin_schedule_time: "00:10",
};
