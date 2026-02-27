import "./styles.css";
import {
	render,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "hono/jsx/dom";
import { createApiFetch } from "./core/api";
import {
	initialData,
	initialSettingsForm,
	initialSiteForm,
	tabs,
} from "./core/constants";
import {
	filterSites,
	type SiteSortState,
	type SiteTestResult,
	sortSites,
	summarizeSiteTests,
} from "./core/sites";
import type {
	AdminData,
	CheckinSummary,
	DashboardData,
	Settings,
	SettingsForm,
	Site,
	SiteForm,
	SiteType,
	TabId,
	Token,
	UsageLog,
} from "./core/types";
import { toggleStatus } from "./core/utils";
import { AppLayout } from "./features/AppLayout";
import { DashboardView } from "./features/DashboardView";
import { LoginView } from "./features/LoginView";
import { ModelsView } from "./features/ModelsView";
import { SettingsView } from "./features/SettingsView";
import { SitesView } from "./features/SitesView";
import { TokensView } from "./features/TokensView";
import { UsageView } from "./features/UsageView";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
	throw new Error("Missing #app root");
}

const normalizePath = (path: string) => {
	if (path.length <= 1) {
		return "/";
	}
	return path.replace(/\/+$/, "") || "/";
};

const tabToPath: Record<TabId, string> = {
	dashboard: "/",
	channels: "/channels",
	models: "/models",
	tokens: "/tokens",
	usage: "/usage",
	settings: "/settings",
};

const pathToTab: Record<string, TabId> = {
	"/": "dashboard",
	"/channels": "channels",
	"/models": "models",
	"/tokens": "tokens",
	"/usage": "usage",
	"/settings": "settings",
};

const DEFAULT_BASE_URL_BY_TYPE: Partial<Record<SiteType, string>> = {
	openai: "https://api.openai.com",
	anthropic: "https://api.anthropic.com",
	gemini: "https://generativelanguage.googleapis.com",
};

/**
 * Renders the admin console application.
 *
 * Returns:
 *   Root application JSX element.
 */
const App = () => {
	const [token, setToken] = useState<string | null>(() =>
		localStorage.getItem("admin_token"),
	);
	const [activeTab, setActiveTab] = useState<TabId>(() => {
		if (typeof window === "undefined") {
			return "dashboard";
		}
		const normalized = normalizePath(window.location.pathname);
		return pathToTab[normalized] ?? "dashboard";
	});
	const [loading, setLoading] = useState(false);
	const [notice, setNotice] = useState("");
	const [data, setData] = useState<AdminData>(initialData);
	const [settingsForm, setSettingsForm] =
		useState<SettingsForm>(initialSettingsForm);
	const [sitePage, setSitePage] = useState(1);
	const [sitePageSize, setSitePageSize] = useState(10);
	const [siteSearch, setSiteSearch] = useState("");
	const [siteSort, setSiteSort] = useState<SiteSortState>({
		key: "name",
		direction: "asc",
	});
	const [tokenPage, setTokenPage] = useState(1);
	const [tokenPageSize, setTokenPageSize] = useState(10);
	const [editingSite, setEditingSite] = useState<Site | null>(null);
	const [siteForm, setSiteForm] = useState<SiteForm>(() => ({
		...initialSiteForm,
	}));
	const [isSiteModalOpen, setSiteModalOpen] = useState(false);
	const [isTokenModalOpen, setTokenModalOpen] = useState(false);
	const [checkinSummary, setCheckinSummary] = useState<CheckinSummary | null>(
		null,
	);
	const [checkinLastRun, setCheckinLastRun] = useState<string | null>(null);

	const updateToken = useCallback((next: string | null) => {
		setToken(next);
		if (next) {
			localStorage.setItem("admin_token", next);
		} else {
			localStorage.removeItem("admin_token");
		}
	}, []);

	const apiFetch = useMemo(
		() => createApiFetch(token, () => updateToken(null)),
		[token, updateToken],
	);

	const loadDashboard = useCallback(async () => {
		const dashboard = await apiFetch<DashboardData>("/api/dashboard");
		setData((prev) => ({ ...prev, dashboard }));
	}, [apiFetch]);

	const loadSites = useCallback(async () => {
		const result = await apiFetch<{
			sites: Site[];
		}>("/api/sites");
		setData((prev) => ({
			...prev,
			sites: result.sites,
		}));
	}, [apiFetch]);

	const loadModels = useCallback(async () => {
		const result = await apiFetch<{
			models: Array<{
				id: string;
				channels: Array<{ id: string; name: string }>;
			}>;
		}>("/api/models");
		setData((prev) => ({ ...prev, models: result.models }));
	}, [apiFetch]);

	const loadTokens = useCallback(async () => {
		const result = await apiFetch<{ tokens: Token[] }>("/api/tokens");
		setData((prev) => ({ ...prev, tokens: result.tokens }));
	}, [apiFetch]);

	const loadUsage = useCallback(async () => {
		const result = await apiFetch<{ logs: UsageLog[] }>("/api/usage?limit=200");
		setData((prev) => ({ ...prev, usage: result.logs }));
	}, [apiFetch]);

	const loadSettings = useCallback(async () => {
		const settings = await apiFetch<Settings>("/api/settings");
		setData((prev) => ({ ...prev, settings }));
	}, [apiFetch]);

	const loadTab = useCallback(
		async (tabId: TabId) => {
			setLoading(true);
			setNotice("");
			try {
				if (tabId === "dashboard") {
					await loadDashboard();
				}
				if (tabId === "channels") {
					await loadSites();
				}
				if (tabId === "models") {
					await loadModels();
				}
				if (tabId === "tokens") {
					await loadTokens();
				}
				if (tabId === "usage") {
					await loadUsage();
				}
				if (tabId === "settings") {
					await loadSettings();
				}
			} catch (error) {
				setNotice((error as Error).message);
			} finally {
				setLoading(false);
			}
		},
		[loadDashboard, loadSites, loadModels, loadSettings, loadTokens, loadUsage],
	);

	useEffect(() => {
		if (token) {
			loadTab(activeTab);
		}
	}, [token, activeTab, loadTab]);

	useEffect(() => {
		const handlePopState = () => {
			const normalized = normalizePath(window.location.pathname);
			setActiveTab(pathToTab[normalized] ?? "dashboard");
		};
		window.addEventListener("popstate", handlePopState);
		return () => {
			window.removeEventListener("popstate", handlePopState);
		};
	}, []);

	useEffect(() => {
		if (!data.settings) {
			return;
		}
		setSettingsForm({
			log_retention_days: String(data.settings.log_retention_days ?? 30),
			session_ttl_hours: String(data.settings.session_ttl_hours ?? 12),
			admin_password: "",
			checkin_schedule_time: data.settings.checkin_schedule_time ?? "00:10",
		});
	}, [data.settings]);

	const handleLogin = useCallback(
		async (event: Event) => {
			event.preventDefault();
			const form = event.currentTarget as HTMLFormElement;
			const formData = new FormData(form);
			const password = String(formData.get("password") ?? "");
			try {
				const result = await apiFetch<{ token: string }>("/api/auth/login", {
					method: "POST",
					body: JSON.stringify({ password }),
				});
				updateToken(result.token);
				setNotice("");
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, updateToken],
	);

	const handleLogout = useCallback(async () => {
		await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
		updateToken(null);
	}, [apiFetch, updateToken]);

	const handleSiteFormChange = useCallback((patch: Partial<SiteForm>) => {
		setSiteForm((prev) => {
			const next = { ...prev, ...patch };
			if (
				patch.site_type &&
				(!patch.base_url || patch.base_url.trim().length === 0) &&
				!prev.base_url.trim()
			) {
				const fallback = DEFAULT_BASE_URL_BY_TYPE[patch.site_type];
				if (fallback) {
					next.base_url = fallback;
				}
			}
			return next;
		});
	}, []);

	const handleSettingsFormChange = useCallback(
		(patch: Partial<SettingsForm>) => {
			setSettingsForm((prev) => ({ ...prev, ...patch }));
		},
		[],
	);

	const handleSitePageChange = useCallback((next: number) => {
		setSitePage(next);
	}, []);

	const handleSitePageSizeChange = useCallback((next: number) => {
		setSitePageSize(next);
		setSitePage(1);
	}, []);

	const handleSiteSearchChange = useCallback((next: string) => {
		setSiteSearch(next);
	}, []);

	const handleSiteSortChange = useCallback((next: SiteSortState) => {
		setSiteSort(next);
	}, []);

	const handleTokenPageChange = useCallback((next: number) => {
		setTokenPage(next);
	}, []);

	const handleTokenPageSizeChange = useCallback((next: number) => {
		setTokenPageSize(next);
		setTokenPage(1);
	}, []);

	const handleTabChange = useCallback((tabId: TabId) => {
		const nextPath = tabToPath[tabId];
		const normalized = normalizePath(window.location.pathname);
		if (normalized !== nextPath) {
			history.pushState(null, "", nextPath);
		}
		setActiveTab(tabId);
	}, []);

	const closeSiteModal = useCallback(() => {
		setEditingSite(null);
		setSiteForm({ ...initialSiteForm });
		setSiteModalOpen(false);
	}, []);

	const openSiteCreate = useCallback(() => {
		setEditingSite(null);
		setSiteForm({ ...initialSiteForm });
		setSiteModalOpen(true);
		setNotice("");
	}, []);

	const openTokenCreate = useCallback(() => {
		setTokenModalOpen(true);
		setNotice("");
	}, []);

	const startSiteEdit = useCallback((site: Site) => {
		setEditingSite(site);
		const callTokens =
			site.call_tokens && site.call_tokens.length > 0
				? site.call_tokens
				: site.api_key
					? [
							{
								id: "",
								name: "主调用令牌",
								api_key: site.api_key,
							},
						]
					: [];
		const tokenForms =
			callTokens.length > 0
				? callTokens.map((token) => ({
						id: token.id,
						name: token.name,
						api_key: token.api_key,
					}))
				: [
						{
							name: "主调用令牌",
							api_key: "",
						},
					];
		setSiteForm({
			name: site.name ?? "",
			base_url: site.base_url ?? "",
			weight: site.weight ?? 1,
			status: site.status ?? "active",
			site_type: site.site_type ?? "new-api",
			checkin_url: site.checkin_url ?? "",
			system_token: site.system_token ?? "",
			system_userid: site.system_userid ?? "",
			checkin_enabled: Boolean(site.checkin_enabled ?? false),
			call_tokens: tokenForms,
		});
		setSiteModalOpen(true);
		setNotice("");
	}, []);

	const closeTokenModal = useCallback(() => {
		setTokenModalOpen(false);
	}, []);

	const handleSiteSubmit = useCallback(
		async (event: Event) => {
			event.preventDefault();
			const siteName = siteForm.name.trim();
			const normalizedName = siteName.toLowerCase();
			const nameExists = data.sites.some(
				(site) =>
					site.name.trim().toLowerCase() === normalizedName &&
					site.id !== editingSite?.id,
			);
			if (nameExists) {
				setNotice("站点名称已存在，请使用其他名称");
				return;
			}
			const baseUrlValue = siteForm.base_url.trim();
			if (!baseUrlValue && !DEFAULT_BASE_URL_BY_TYPE[siteForm.site_type]) {
				setNotice("基础 URL 不能为空");
				return;
			}
			const callTokens = siteForm.call_tokens
				.map((token, index) => ({
					id: token.id,
					name: token.name.trim() || `调用令牌${index + 1}`,
					api_key: token.api_key.trim(),
				}))
				.filter((token) => token.api_key.length > 0);
			if (callTokens.length === 0) {
				setNotice("至少填写一个调用令牌");
				return;
			}
			if (
				siteForm.site_type === "new-api" &&
				siteForm.checkin_enabled &&
				(!siteForm.system_token.trim() || !siteForm.system_userid.trim())
			) {
				setNotice("启用签到需要填写系统令牌与 User ID");
				return;
			}
			try {
				const body = {
					name: siteName,
					base_url: baseUrlValue,
					weight: Number(siteForm.weight),
					status: siteForm.status,
					site_type: siteForm.site_type,
					system_token: siteForm.system_token.trim(),
					system_userid: siteForm.system_userid.trim(),
					checkin_url: siteForm.checkin_url.trim() || null,
					checkin_enabled: siteForm.checkin_enabled,
					call_tokens: callTokens,
				};
				if (editingSite) {
					await apiFetch(`/api/sites/${editingSite.id}`, {
						method: "PATCH",
						body: JSON.stringify(body),
					});
					setNotice("站点已更新");
				} else {
					await apiFetch("/api/sites", {
						method: "POST",
						body: JSON.stringify(body),
					});
					setNotice("站点已创建");
				}
				closeSiteModal();
				await loadSites();
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, siteForm, closeSiteModal, data.sites, editingSite, loadSites],
	);

	const handleTokenSubmit = useCallback(
		async (event: Event) => {
			event.preventDefault();
			const form = event.currentTarget as HTMLFormElement;
			const formData = new FormData(form);
			const payload: Record<string, FormDataEntryValue> = {};
			formData.forEach((value, key) => {
				payload[key] = value;
			});
			try {
				const result = await apiFetch<{ token: string }>("/api/tokens", {
					method: "POST",
					body: JSON.stringify({
						name: payload.name,
						quota_total: payload.quota_total
							? Number(payload.quota_total)
							: null,
					}),
				});
				setNotice(`新令牌: ${result.token}`);
				form.reset();
				setTokenModalOpen(false);
				setTokenPage(1);
				await loadTokens();
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, loadTokens],
	);

	const handleSettingsSubmit = useCallback(
		async (event: Event) => {
			event.preventDefault();
			const retention = Number(settingsForm.log_retention_days);
			const sessionTtlHours = Number(settingsForm.session_ttl_hours);
			const payload: Record<string, number | string | boolean> = {
				log_retention_days: retention,
				session_ttl_hours: sessionTtlHours,
				checkin_schedule_time:
					settingsForm.checkin_schedule_time.trim() || "00:10",
			};
			const password = settingsForm.admin_password.trim();
			if (password) {
				payload.admin_password = password;
			}
			try {
				await apiFetch("/api/settings", {
					method: "PUT",
					body: JSON.stringify(payload),
				});
				await loadSettings();
				setSettingsForm((prev) => ({ ...prev, admin_password: "" }));
				setNotice("设置已更新");
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, loadSettings, settingsForm],
	);

	const handleSiteTest = useCallback(
		async (id: string) => {
			try {
				const result = await apiFetch<{
					models: Array<{ id: string }>;
					token_summary?: {
						total: number;
						success: number;
						failed: number;
					};
				}>(`/api/channels/${id}/test`, {
					method: "POST",
				});
				await loadSites();
				const modelCount = result.models?.length ?? 0;
				const summary = result.token_summary;
				const detail = summary
					? `，令牌成功 ${summary.success}/${summary.total}${
							summary.failed > 0 ? `，失败 ${summary.failed}` : ""
						}`
					: "";
				setNotice(`连通测试完成，模型数 ${modelCount}${detail}`);
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, loadSites],
	);

	const handleSiteTestAll = useCallback(async () => {
		if (data.sites.length === 0) {
			setNotice("暂无站点可测试");
			return;
		}
		setNotice("正在执行一键测试...");
		const results: SiteTestResult[] = [];
		for (const site of data.sites) {
			if (site.status !== "active") {
				results.push({ status: "skipped" });
				continue;
			}
			try {
				await apiFetch(`/api/channels/${site.id}/test`, {
					method: "POST",
				});
				results.push({ status: "success" });
			} catch (_error) {
				results.push({ status: "failed" });
			}
		}
		await loadSites();
		const summary = summarizeSiteTests(results);
		const testedTotal = summary.success + summary.failed;
		if (testedTotal === 0) {
			setNotice(`已跳过 ${summary.skipped} 个禁用站点，暂无可测试站点。`);
			return;
		}
		let message =
			summary.failed > 0
				? `一键测试完成，成功 ${summary.success}/${testedTotal}，失败 ${summary.failed}。`
				: `一键测试完成，成功 ${summary.success}/${testedTotal}。`;
		if (summary.skipped > 0) {
			message += ` 已跳过 ${summary.skipped} 个禁用站点。`;
		}
		setNotice(message);
	}, [apiFetch, data.sites, loadSites]);

	const handleSiteDelete = useCallback(
		async (id: string) => {
			try {
				await apiFetch(`/api/sites/${id}`, { method: "DELETE" });
				await loadSites();
				setNotice("站点已删除");
				if (editingSite?.id === id) {
					closeSiteModal();
				}
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, closeSiteModal, editingSite, loadSites],
	);

	const handleSiteToggle = useCallback(
		async (id: string, status: string) => {
			try {
				const next = toggleStatus(status);
				await apiFetch(`/api/sites/${id}`, {
					method: "PATCH",
					body: JSON.stringify({ status: next }),
				});
				await loadSites();
				setNotice(`站点已${next === "active" ? "启用" : "停用"}`);
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, loadSites],
	);

	const handleTokenDelete = useCallback(
		async (id: string) => {
			try {
				await apiFetch(`/api/tokens/${id}`, { method: "DELETE" });
				await loadTokens();
				setNotice("令牌已删除");
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, loadTokens],
	);

	const handleTokenReveal = useCallback(
		async (id: string) => {
			try {
				const result = await apiFetch<{ token: string | null }>(
					`/api/tokens/${id}/reveal`,
				);
				if (!result.token) {
					setNotice("未找到令牌");
					return;
				}
				try {
					await navigator.clipboard.writeText(result.token);
					setNotice(`令牌已复制到剪贴板：${result.token}`);
				} catch (_clipboardError) {
					setNotice(`令牌: ${result.token}`);
				}
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch],
	);

	const handleTokenToggle = useCallback(
		async (id: string, status: string) => {
			try {
				const next = toggleStatus(status);
				await apiFetch(`/api/tokens/${id}`, {
					method: "PATCH",
					body: JSON.stringify({ status: next }),
				});
				await loadTokens();
				setNotice(`令牌已${next === "active" ? "启用" : "停用"}`);
			} catch (error) {
				setNotice((error as Error).message);
			}
		},
		[apiFetch, loadTokens],
	);

	const handleCheckinRunAll = useCallback(async () => {
		try {
			const result = await apiFetch<{
				results: Array<{
					id: string;
					name: string;
					status: "success" | "failed" | "skipped";
					message: string;
					checkin_date?: string | null;
				}>;
				summary: CheckinSummary;
				runs_at: string;
			}>("/api/sites/checkin-all", {
				method: "POST",
			});
			await loadSites();
			setCheckinSummary(result.summary);
			setCheckinLastRun(result.runs_at);
			setNotice(
				result.summary.failed > 0
					? "一键签到完成，有部分站点失败。"
					: "一键签到完成。",
			);
		} catch (error) {
			setNotice((error as Error).message);
		}
	}, [apiFetch, loadSites]);

	const handleUsageRefresh = useCallback(async () => {
		try {
			await loadUsage();
			setNotice("日志已刷新");
		} catch (error) {
			setNotice((error as Error).message);
		}
	}, [loadUsage]);

	const filteredSites = useMemo(
		() => filterSites(data.sites, siteSearch),
		[data.sites, siteSearch],
	);
	const sortedSites = useMemo(
		() => sortSites(filteredSites, siteSort),
		[filteredSites, siteSort],
	);
	const siteTotal = sortedSites.length;
	const siteTotalPages = useMemo(
		() => Math.max(1, Math.ceil(siteTotal / sitePageSize)),
		[siteTotal, sitePageSize],
	);
	const pagedSites = useMemo(() => {
		const start = (sitePage - 1) * sitePageSize;
		return sortedSites.slice(start, start + sitePageSize);
	}, [sitePage, sitePageSize, sortedSites]);
	const tokenTotal = data.tokens.length;
	const tokenTotalPages = useMemo(
		() => Math.max(1, Math.ceil(tokenTotal / tokenPageSize)),
		[tokenTotal, tokenPageSize],
	);
	const pagedTokens = useMemo(() => {
		const start = (tokenPage - 1) * tokenPageSize;
		return data.tokens.slice(start, start + tokenPageSize);
	}, [data.tokens, tokenPage, tokenPageSize]);

	useEffect(() => {
		setSitePage((prev) => Math.min(prev, siteTotalPages));
	}, [siteTotalPages]);

	useEffect(() => {
		setSitePage(1);
	}, [siteSearch, siteSort.key, siteSort.direction]);

	useEffect(() => {
		setTokenPage((prev) => Math.min(prev, tokenTotalPages));
	}, [tokenTotalPages]);

	const activeLabel = useMemo(
		() => tabs.find((tab) => tab.id === activeTab)?.label ?? "管理台",
		[activeTab],
	);

	const renderContent = () => {
		if (loading) {
			return (
				<div class="rounded-2xl border border-stone-200 bg-white p-5 shadow-lg">
					加载中...
				</div>
			);
		}
		if (activeTab === "dashboard") {
			return <DashboardView dashboard={data.dashboard} />;
		}
		if (activeTab === "channels") {
			return (
				<SitesView
					siteForm={siteForm}
					sitePage={sitePage}
					sitePageSize={sitePageSize}
					siteTotal={siteTotal}
					siteTotalPages={siteTotalPages}
					pagedSites={pagedSites}
					editingSite={editingSite}
					isSiteModalOpen={isSiteModalOpen}
					summary={checkinSummary}
					lastRun={checkinLastRun}
					siteSearch={siteSearch}
					siteSort={siteSort}
					onCreate={openSiteCreate}
					onCloseModal={closeSiteModal}
					onEdit={startSiteEdit}
					onSubmit={handleSiteSubmit}
					onTest={handleSiteTest}
					onToggle={handleSiteToggle}
					onDelete={handleSiteDelete}
					onPageChange={handleSitePageChange}
					onPageSizeChange={handleSitePageSizeChange}
					onSearchChange={handleSiteSearchChange}
					onSortChange={handleSiteSortChange}
					onFormChange={handleSiteFormChange}
					onRunAll={handleCheckinRunAll}
					onTestAll={handleSiteTestAll}
				/>
			);
		}
		if (activeTab === "models") {
			return <ModelsView models={data.models} />;
		}
		if (activeTab === "tokens") {
			return (
				<TokensView
					pagedTokens={pagedTokens}
					tokenPage={tokenPage}
					tokenPageSize={tokenPageSize}
					tokenTotal={tokenTotal}
					tokenTotalPages={tokenTotalPages}
					isTokenModalOpen={isTokenModalOpen}
					onCreate={openTokenCreate}
					onCloseModal={closeTokenModal}
					onPageChange={handleTokenPageChange}
					onPageSizeChange={handleTokenPageSizeChange}
					onSubmit={handleTokenSubmit}
					onReveal={handleTokenReveal}
					onToggle={handleTokenToggle}
					onDelete={handleTokenDelete}
				/>
			);
		}
		if (activeTab === "usage") {
			return <UsageView usage={data.usage} onRefresh={handleUsageRefresh} />;
		}
		if (activeTab === "settings") {
			return (
				<SettingsView
					settingsForm={settingsForm}
					adminPasswordSet={data.settings?.admin_password_set ?? false}
					onSubmit={handleSettingsSubmit}
					onFormChange={handleSettingsFormChange}
				/>
			);
		}
		return (
			<div class="rounded-2xl border border-stone-200 bg-white p-5 shadow-lg">
				未知模块
			</div>
		);
	};

	return (
		<div class="min-h-screen bg-linear-to-b from-white via-stone-50 to-stone-100 font-['IBM_Plex_Sans'] text-stone-900 antialiased">
			{token ? (
				<AppLayout
					tabs={tabs}
					activeTab={activeTab}
					activeLabel={activeLabel}
					token={token}
					notice={notice}
					onTabChange={handleTabChange}
					onLogout={handleLogout}
				>
					{renderContent()}
				</AppLayout>
			) : (
				<LoginView notice={notice} onSubmit={handleLogin} />
			)}
		</div>
	);
};

render(<App />, root);
