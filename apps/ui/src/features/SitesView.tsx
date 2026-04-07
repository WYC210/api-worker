import { useEffect, useMemo, useState } from "hono/jsx/dom";
import {
	Button,
	Card,
	Chip,
	ColumnPicker,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Pagination,
	Select,
	Switch,
	Tooltip,
} from "../components/ui";
import {
	getSiteCheckinLabel,
	getPrimaryVerificationIssue,
	getSuggestedActionLabel,
	getSiteTypeLabel,
	getVerificationSeverityLabel,
	getVerificationSeverityRank,
	getVerificationVerdictLabel,
	type SiteSortKey,
	type SiteSortState,
} from "../core/sites";
import type {
	Site,
	SiteChannelRefreshItem,
	SiteForm,
	SiteTaskKind,
	SiteTaskReportMap,
	SiteVerificationResult,
} from "../core/types";
import {
	buildPageItems,
	getBeijingDateString,
	loadColumnPrefs,
	persistColumnPrefs,
} from "../core/utils";

type SitesViewProps = {
	siteForm: SiteForm;
	sitePage: number;
	sitePageSize: number;
	siteTotal: number;
	siteTotalPages: number;
	pagedSites: Site[];
	editingSite: Site | null;
	isSiteModalOpen: boolean;
	taskReports: SiteTaskReportMap;
	siteSearch: string;
	siteSort: SiteSortState;
	isActionPending: (key: string) => boolean;
	onCreate: () => void;
	onCloseModal: () => void;
	onEdit: (site: Site) => void;
	onSubmit: (event: Event) => void;
	onVerify: (id: string) => void;
	onCheckin: (site: Site) => void;
	onRefreshSite: (site: Site) => void;
	onToggle: (id: string, status: string) => void;
	onDelete: (site: Site) => void;
	onPageChange: (next: number) => void;
	onPageSizeChange: (next: number) => void;
	onSearchChange: (next: string) => void;
	onSortChange: (next: SiteSortState) => void;
	onFormChange: (patch: Partial<SiteForm>) => void;
	onRunAll: () => void;
	onVerifyAll: () => void;
	onEvaluateRecovery: () => void;
	onRefreshAll: () => void;
	onDisableFailedSite: (site: SiteVerificationResult) => void;
	onDisableAllFailedSites: () => void;
};

const pageSizeOptions = [10, 20, 50];
const sortableColumns: Array<{ key: SiteSortKey; label: string }> = [
	{ key: "name", label: "站点" },
	{ key: "type", label: "类型" },
	{ key: "status", label: "状态" },
	{ key: "weight", label: "权重" },
	{ key: "tokens", label: "令牌" },
	{ key: "checkin_enabled", label: "自动签到" },
	{ key: "checkin", label: "今日签到" },
];
const siteColumnOptions = [
	{ id: "name", label: "站点", width: "minmax(0,1.4fr)", locked: true },
	{ id: "type", label: "类型", width: "minmax(0,0.6fr)" },
	{ id: "status", label: "状态", width: "minmax(0,0.6fr)", locked: true },
	{ id: "weight", label: "权重", width: "minmax(0,0.5fr)", locked: true },
	{ id: "tokens", label: "令牌", width: "minmax(0,0.6fr)", locked: true },
	{
		id: "checkin_enabled",
		label: "自动签到",
		width: "minmax(0,0.6fr)",
		locked: true,
	},
	{ id: "checkin", label: "今日签到", width: "minmax(0,0.8fr)", locked: true },
	{ id: "actions", label: "操作", width: "minmax(0,1.4fr)", locked: true },
];
const siteColumnDefaults = siteColumnOptions.map((column) => column.id);
const requiredSiteColumns = [
	"name",
	"status",
	"weight",
	"tokens",
	"checkin_enabled",
	"checkin",
	"actions",
];
const siteColumnVersion = "2026-03-18";
const columnTooltips: Partial<Record<SiteSortKey, string>> = {
	checkin_enabled: "仅 new-api 类型支持自动签到。",
	checkin: "展示今天的签到结果。",
};

const siteTaskButtons: Array<{
	kind: SiteTaskKind;
	label: string;
	pendingLabel: string;
}> = [
	{
		kind: "checkin",
		label: "签到已启用站点",
		pendingLabel: "签到中...",
	},
	{
		kind: "verify-active",
		label: "检查启用渠道",
		pendingLabel: "检查中...",
	},
	{
		kind: "verify-disabled",
		label: "检查停用渠道",
		pendingLabel: "检查中...",
	},
	{
		kind: "refresh-active",
		label: "更新启用渠道",
		pendingLabel: "更新中...",
	},
];

const formatTaskTime = (value: string) =>
	new Date(value).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

export const SitesView = ({
	siteForm,
	sitePage,
	sitePageSize,
	siteTotal,
	siteTotalPages,
	pagedSites,
	editingSite,
	isSiteModalOpen,
	taskReports,
	siteSearch,
	siteSort,
	isActionPending,
	onCreate,
	onCloseModal,
	onEdit,
	onSubmit,
	onVerify,
	onCheckin,
	onRefreshSite,
	onToggle,
	onDelete,
	onPageChange,
	onPageSizeChange,
	onSearchChange,
	onSortChange,
	onFormChange,
	onRunAll,
	onVerifyAll,
	onEvaluateRecovery,
	onRefreshAll,
	onDisableFailedSite,
	onDisableAllFailedSites,
}: SitesViewProps) => {
	const isEditing = Boolean(editingSite);
	const pageItems = buildPageItems(sitePage, siteTotalPages);
	const today = getBeijingDateString();
	const isSubmitting = isActionPending("site:submit");
	const isVerifyingAll = isActionPending("site:verifyAll");
	const isCheckinAll = isActionPending("site:checkinAll");
	const isRecoveryEvaluate = isActionPending("site:recoveryEvaluate");
	const isRefreshingAll = isActionPending("site:refreshAll");
	const [localSearch, setLocalSearch] = useState(siteSearch);
	const [activeReportTask, setActiveReportTask] = useState<SiteTaskKind | null>(
		null,
	);
	const isOfficialType =
		siteForm.site_type === "openai" ||
		siteForm.site_type === "anthropic" ||
		siteForm.site_type === "gemini";
	const needsSystemToken = !isOfficialType;
	const isNewApi = siteForm.site_type === "new-api";
	const checkinTask = taskReports.checkin;
	const verifyActiveTask = taskReports["verify-active"];
	const verifyDisabledTask = taskReports["verify-disabled"];
	const refreshTask = taskReports["refresh-active"];
	const failedVerificationItems =
		verifyActiveTask?.kind === "verify-active"
			? verifyActiveTask.report.items.filter(
					(item) => item.verdict !== "serving",
				)
			: [];
	const recoveredItems =
		verifyDisabledTask?.kind === "verify-disabled"
			? verifyDisabledTask.report.items.filter(
					(item) => item.verdict === "recoverable",
				)
			: [];
	const stillFailedRecoveryItems =
		verifyDisabledTask?.kind === "verify-disabled"
			? verifyDisabledTask.report.items.filter(
					(item) => item.verdict !== "recoverable",
				)
			: [];
	const [visibleColumns, setVisibleColumns] = useState(() => {
		if (typeof window === "undefined") {
			return siteColumnDefaults;
		}
		const versionKey = "columns:sites:version";
		const storedVersion = window.localStorage.getItem(versionKey);
		const stored = loadColumnPrefs("columns:sites", siteColumnDefaults);
		const nextSet = new Set([...stored, ...requiredSiteColumns]);
		const normalized = siteColumnDefaults.filter((id) => nextSet.has(id));
		if (storedVersion !== siteColumnVersion) {
			window.localStorage.setItem(versionKey, siteColumnVersion);
			persistColumnPrefs("columns:sites", normalized);
			return normalized;
		}
		if (
			normalized.length !== stored.length ||
			normalized.some((id, index) => stored[index] !== id)
		) {
			persistColumnPrefs("columns:sites", normalized);
		}
		return normalized;
	});
	const visibleColumnSet = useMemo(
		() => new Set(visibleColumns),
		[visibleColumns],
	);
	const updateVisibleColumns = (next: string[]) => {
		const nextSet = new Set([...next, ...requiredSiteColumns]);
		const normalized = siteColumnDefaults.filter((id) => nextSet.has(id));
		setVisibleColumns(normalized);
		persistColumnPrefs("columns:sites", normalized);
	};
	const siteGridTemplate = useMemo(
		() =>
			siteColumnOptions
				.filter((column) => visibleColumnSet.has(column.id))
				.map((column) => column.width)
				.join(" "),
		[visibleColumnSet],
	);
	const updateCallToken = (
		index: number,
		patch: Partial<SiteForm["call_tokens"][number]>,
	) => {
		const next = siteForm.call_tokens.map((token, idx) =>
			idx === index ? { ...token, ...patch } : token,
		);
		onFormChange({ call_tokens: next });
	};
	const addCallToken = () => {
		const next = [
			...siteForm.call_tokens,
			{
				name: `调用令牌${siteForm.call_tokens.length + 1}`,
				api_key: "",
			},
		];
		onFormChange({ call_tokens: next });
	};
	const removeCallToken = (index: number) => {
		if (siteForm.call_tokens.length <= 1) {
			return;
		}
		const next = siteForm.call_tokens.filter((_, idx) => idx !== index);
		onFormChange({ call_tokens: next });
	};
	const toggleSort = (key: SiteSortKey) => {
		if (siteSort.key === key) {
			onSortChange({
				key,
				direction: siteSort.direction === "asc" ? "desc" : "asc",
			});
			return;
		}
		onSortChange({ key, direction: "asc" });
	};
	const sortIndicator = (key: SiteSortKey) => {
		if (siteSort.key !== key) {
			return "↕";
		}
		return siteSort.direction === "asc" ? "▲" : "▼";
	};
	const getTaskStatusText = (kind: SiteTaskKind) => {
		if (kind === "checkin") {
			if (!checkinTask || checkinTask.kind !== "checkin") {
				return "暂无";
			}
			if (checkinTask.summary.total === 0) {
				return `${formatTaskTime(checkinTask.runs_at)}  无站点`;
			}
			return `${formatTaskTime(checkinTask.runs_at)}  ${
				checkinTask.summary.failed > 0
					? `失败 ${checkinTask.summary.failed}`
					: "完成"
			}`;
		}
		if (kind === "verify-active") {
			if (!verifyActiveTask || verifyActiveTask.kind !== "verify-active") {
				return "暂无";
			}
			if (verifyActiveTask.report.summary.total === 0) {
				return `${formatTaskTime(verifyActiveTask.runs_at)}  无站点`;
			}
			return `${formatTaskTime(verifyActiveTask.runs_at)}  ${
				failedVerificationItems.length > 0
					? `异常 ${failedVerificationItems.length}`
					: "正常"
			}`;
		}
		if (kind === "verify-disabled") {
			if (
				!verifyDisabledTask ||
				verifyDisabledTask.kind !== "verify-disabled"
			) {
				return "暂无";
			}
			if (verifyDisabledTask.report.summary.total === 0) {
				return `${formatTaskTime(verifyDisabledTask.runs_at)}  无站点`;
			}
			return `${formatTaskTime(verifyDisabledTask.runs_at)}  ${
				recoveredItems.length > 0 ? `恢复 ${recoveredItems.length}` : "未恢复"
			}`;
		}
		if (!refreshTask || refreshTask.kind !== "refresh-active") {
			return "暂无";
		}
		if (refreshTask.report.summary.total === 0) {
			return `${formatTaskTime(refreshTask.runs_at)}  无站点`;
		}
		return `${formatTaskTime(refreshTask.runs_at)}  ${
			refreshTask.report.summary.failed > 0
				? `失败 ${refreshTask.report.summary.failed}`
				: "完成"
		}`;
	};
	const getTaskStatusClass = (kind: SiteTaskKind) => {
		if (!taskReports[kind]) {
			return "border-white/60 bg-white/65 text-[color:var(--app-ink-muted)]/80";
		}
		if (kind === "checkin") {
			return checkinTask &&
				checkinTask.kind === "checkin" &&
				checkinTask.summary.failed > 0
				? "border-amber-200 bg-amber-50/90 text-amber-700"
				: "border-slate-200 bg-slate-50/90 text-slate-600";
		}
		if (kind === "verify-active") {
			const hasHardFailure = failedVerificationItems.some(
				(item) => item.verdict === "failed",
			);
			if (hasHardFailure) {
				return "border-rose-200 bg-rose-50/90 text-rose-700";
			}
			if (failedVerificationItems.length > 0) {
				return "border-amber-200 bg-amber-50/90 text-amber-700";
			}
			return "border-slate-200 bg-slate-50/90 text-slate-600";
		}
		if (kind === "verify-disabled") {
			return recoveredItems.length > 0
				? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
				: "border-slate-200 bg-slate-50/90 text-slate-600";
		}
		return refreshTask &&
			refreshTask.kind === "refresh-active" &&
			refreshTask.report.summary.failed > 0
			? "border-amber-200 bg-amber-50/90 text-amber-700"
			: "border-slate-200 bg-slate-50/90 text-slate-600";
	};
	const openTaskReport = (kind: SiteTaskKind) => {
		const hasReport = Boolean(taskReports[kind]);
		if (!hasReport) {
			return;
		}
		setActiveReportTask(kind);
	};
	const closeTaskReport = () => setActiveReportTask(null);
	const runTask = (kind: SiteTaskKind) => {
		if (kind === "checkin") {
			onRunAll();
			return;
		}
		if (kind === "verify-active") {
			onVerifyAll();
			return;
		}
		if (kind === "verify-disabled") {
			onEvaluateRecovery();
			return;
		}
		onRefreshAll();
	};
	const displayPages = siteTotal === 0 ? 0 : siteTotalPages;
	useEffect(() => {
		if (!isSiteModalOpen) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onCloseModal();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isSiteModalOpen, onCloseModal]);
	useEffect(() => {
		setLocalSearch(siteSearch);
	}, [siteSearch]);
	useEffect(() => {
		const timer = window.setTimeout(() => {
			if (localSearch !== siteSearch) {
				onSearchChange(localSearch);
			}
		}, 300);
		return () => window.clearTimeout(timer);
	}, [localSearch, onSearchChange, siteSearch]);
	const renderTaskReportDialog = () => {
		if (!activeReportTask) {
			return null;
		}
		if (activeReportTask === "checkin") {
			if (!checkinTask || checkinTask.kind !== "checkin") {
				return null;
			}
			const items = [...checkinTask.items].sort((left, right) => {
				const rank = { failed: 0, skipped: 1, success: 2 };
				const diff = rank[left.status] - rank[right.status];
				return diff !== 0 ? diff : left.name.localeCompare(right.name);
			});
			return (
				<Dialog open={Boolean(activeReportTask)} onClose={closeTaskReport}>
					<DialogContent class="max-w-4xl" aria-modal="true">
						<DialogHeader>
							<div>
								<DialogTitle>签到已启用站点</DialogTitle>
								<DialogDescription>
									最后记录 {formatTaskTime(checkinTask.runs_at)}。
								</DialogDescription>
							</div>
							<Button size="sm" type="button" onClick={closeTaskReport}>
								关闭
							</Button>
						</DialogHeader>
						<div class="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
							{items.length === 0 ? (
								<p class="text-xs text-[color:var(--app-ink-muted)]">
									当前没有开启签到的站点。
								</p>
							) : (
								items.map((item) => (
									<div
										class="grid gap-3 rounded-xl border border-white/60 bg-white/80 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
										key={item.id}
									>
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold text-[color:var(--app-ink)]">
												{item.name}
											</p>
											<p class="text-[11px] text-[color:var(--app-ink-muted)]">
												{item.status === "failed"
													? "失败"
													: item.status === "skipped"
														? "已签"
														: "成功"}
											</p>
										</div>
										<p class="text-xs text-[color:var(--app-ink)]">
											{item.message || "-"}
										</p>
									</div>
								))
							)}
						</div>
					</DialogContent>
				</Dialog>
			);
		}
		if (activeReportTask === "verify-active") {
			if (!verifyActiveTask || verifyActiveTask.kind !== "verify-active") {
				return null;
			}
			const items = [...failedVerificationItems].sort((left, right) => {
				const diff =
					getVerificationSeverityRank(left.verdict) -
					getVerificationSeverityRank(right.verdict);
				return diff !== 0
					? diff
					: left.site_name.localeCompare(right.site_name);
			});
			const failedItems = items.filter((item) => item.verdict === "failed");
			return (
				<Dialog open={Boolean(activeReportTask)} onClose={closeTaskReport}>
					<DialogContent class="max-w-4xl" aria-modal="true">
						<DialogHeader>
							<div>
								<DialogTitle>检查启用渠道</DialogTitle>
								<DialogDescription>
									最后记录 {formatTaskTime(verifyActiveTask.runs_at)}。
								</DialogDescription>
							</div>
							<Button size="sm" type="button" onClick={closeTaskReport}>
								关闭
							</Button>
						</DialogHeader>
						<div class="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
							{items.length === 0 ? (
								<p class="text-xs text-[color:var(--app-ink-muted)]">
									本次无异常。
								</p>
							) : (
								items.map((item) => (
									<div
										class="grid gap-3 rounded-xl border border-white/60 bg-white/80 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]"
										key={item.site_id}
									>
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold text-[color:var(--app-ink)]">
												{item.site_name}
											</p>
											<p class="text-[11px] text-[color:var(--app-ink-muted)]">
												{getVerificationSeverityLabel(item.verdict)} ·{" "}
												{getVerificationVerdictLabel(item.verdict)}
											</p>
										</div>
										<div class="space-y-1">
											<p class="text-xs text-[color:var(--app-ink)]">
												{getPrimaryVerificationIssue(item)}
											</p>
											<p class="text-[11px] text-[color:var(--app-ink-muted)]">
												建议：{getSuggestedActionLabel(item.suggested_action)}
											</p>
										</div>
										<div class="flex flex-wrap items-center justify-end gap-2">
											<Button
												size="sm"
												type="button"
												class="h-8 px-3 text-xs"
												disabled={isActionPending(
													`site:verify:${item.site_id}`,
												)}
												onClick={() => onVerify(item.site_id)}
											>
												重新检查
											</Button>
											<Button
												size="sm"
												type="button"
												variant="danger"
												class="h-8 px-3 text-xs"
												disabled={isActionPending(
													`site:disableFailed:${item.site_id}`,
												)}
												onClick={() => onDisableFailedSite(item)}
											>
												禁用
											</Button>
										</div>
									</div>
								))
							)}
						</div>
						<DialogFooter>
							<Button size="sm" type="button" onClick={closeTaskReport}>
								关闭
							</Button>
							<Button
								size="sm"
								type="button"
								variant="danger"
								disabled={
									failedItems.length === 0 ||
									isActionPending("site:disableFailedAll")
								}
								onClick={onDisableAllFailedSites}
							>
								{isActionPending("site:disableFailedAll")
									? "禁用中..."
									: "禁用全部失败站点"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			);
		}
		if (activeReportTask === "verify-disabled") {
			if (
				!verifyDisabledTask ||
				verifyDisabledTask.kind !== "verify-disabled"
			) {
				return null;
			}
			return (
				<Dialog open={Boolean(activeReportTask)} onClose={closeTaskReport}>
					<DialogContent class="max-w-4xl" aria-modal="true">
						<DialogHeader>
							<div>
								<DialogTitle>检查停用渠道</DialogTitle>
								<DialogDescription>
									最后记录 {formatTaskTime(verifyDisabledTask.runs_at)}。
								</DialogDescription>
							</div>
							<Button size="sm" type="button" onClick={closeTaskReport}>
								关闭
							</Button>
						</DialogHeader>
						<div class="mt-3 max-h-[55vh] space-y-4 overflow-y-auto">
							<div class="space-y-2">
								<p class="text-[11px] font-semibold text-[color:var(--app-ink-muted)]">
									已自动启用
								</p>
								{recoveredItems.length === 0 ? (
									<p class="text-xs text-[color:var(--app-ink-muted)]">
										本次无自动启用。
									</p>
								) : (
									recoveredItems.map((item) => (
										<div
											class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] gap-3 rounded-xl border border-white/60 bg-white/80 px-4 py-3"
											key={item.site_id}
										>
											<div class="min-w-0">
												<p class="truncate text-sm font-semibold text-[color:var(--app-ink)]">
													{item.site_name}
												</p>
												<p class="text-[11px] text-[color:var(--app-ink-muted)]">
													已自动启用
												</p>
											</div>
											<div class="min-w-0">
												<p class="text-[11px] font-semibold text-[color:var(--app-ink-muted)]">
													结果
												</p>
												<p class="mt-1 text-xs text-[color:var(--app-ink)]">
													{item.message}
												</p>
											</div>
										</div>
									))
								)}
							</div>
							<div class="space-y-2">
								<p class="text-[11px] font-semibold text-[color:var(--app-ink-muted)]">
									仍未恢复
								</p>
								{stillFailedRecoveryItems.length === 0 ? (
									<p class="text-xs text-[color:var(--app-ink-muted)]">
										本次已全部恢复。
									</p>
								) : (
									stillFailedRecoveryItems.map((item) => (
										<div
											class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] gap-3 rounded-xl border border-white/60 bg-white/80 px-4 py-3"
											key={item.site_id}
										>
											<div class="min-w-0">
												<p class="truncate text-sm font-semibold text-[color:var(--app-ink)]">
													{item.site_name}
												</p>
												<p class="text-[11px] text-[color:var(--app-ink-muted)]">
													仍未恢复
												</p>
											</div>
											<div class="min-w-0">
												<p class="text-[11px] font-semibold text-[color:var(--app-ink-muted)]">
													问题
												</p>
												<p class="mt-1 text-xs text-[color:var(--app-ink)]">
													{getPrimaryVerificationIssue(item)}
												</p>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</DialogContent>
				</Dialog>
			);
		}
		if (!refreshTask || refreshTask.kind !== "refresh-active") {
			return null;
		}
		const items = [...refreshTask.report.items].sort((left, right) => {
			if (left.status === right.status) {
				return left.site_name.localeCompare(right.site_name);
			}
			return left.status === "failed" ? -1 : 1;
		});
		return (
			<Dialog open={Boolean(activeReportTask)} onClose={closeTaskReport}>
				<DialogContent class="max-w-4xl" aria-modal="true">
					<DialogHeader>
						<div>
							<DialogTitle>更新启用渠道</DialogTitle>
							<DialogDescription>
								最后记录 {formatTaskTime(refreshTask.runs_at)}。
							</DialogDescription>
						</div>
						<Button size="sm" type="button" onClick={closeTaskReport}>
							关闭
						</Button>
					</DialogHeader>
					<div class="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
						{items.length === 0 ? (
							<p class="text-xs text-[color:var(--app-ink-muted)]">
								当前没有启用渠道可更新。
							</p>
						) : (
							items.map((item: SiteChannelRefreshItem) => (
								<div
									class="grid gap-3 rounded-xl border border-white/60 bg-white/80 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]"
									key={item.site_id}
								>
									<div class="min-w-0">
										<p class="truncate text-sm font-semibold text-[color:var(--app-ink)]">
											{item.site_name}
										</p>
										<p class="text-[11px] text-[color:var(--app-ink-muted)]">
											{item.status === "failed" ? "失败" : "完成"}
										</p>
									</div>
									<div class="space-y-1">
										<p class="text-xs text-[color:var(--app-ink)]">
											{item.message}
										</p>
										<p class="text-[11px] text-[color:var(--app-ink-muted)]">
											{item.models.length > 0
												? `${item.models.length} 个模型`
												: "未更新模型"}
										</p>
									</div>
									<div class="flex justify-end">
										<Button
											size="sm"
											type="button"
											class="h-8 px-3 text-xs"
											disabled={isActionPending(`site:refresh:${item.site_id}`)}
											onClick={() =>
												onRefreshSite(
													pagedSites.find(
														(site) => site.id === item.site_id,
													) ?? {
														id: item.site_id,
														name: item.site_name,
														base_url: "",
														weight: 1,
														status: "active",
														site_type: "new-api",
														call_tokens: [],
													},
												)
											}
										>
											重新更新
										</Button>
									</div>
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>
		);
	};
	return (
		<div class="space-y-5">
			<div class="app-panel animate-fade-up space-y-4">
				<div class="flex items-start gap-3">
					<div class="min-w-0 flex-1">
						<h3 class="app-title text-lg">站点管理</h3>
						<p class="app-subtitle">
							统一维护调用令牌、系统令牌与站点类型，并支持签到、检查、恢复与更新。
						</p>
					</div>
					<div class="ml-auto flex max-w-full flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-1">
						<div class="shrink-0">
							<ColumnPicker
								columns={siteColumnOptions}
								value={visibleColumns}
								onChange={updateVisibleColumns}
							/>
						</div>
						{siteTaskButtons.map((task) => {
							const pending =
								task.kind === "checkin"
									? isCheckinAll
									: task.kind === "verify-active"
										? isVerifyingAll
										: task.kind === "verify-disabled"
											? isRecoveryEvaluate
											: isRefreshingAll;
							return (
								<div
									class="flex shrink-0 items-center gap-1.5 rounded-full border border-white/70 bg-white/72 px-1.5 py-1 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
									key={task.kind}
								>
									<Button
										class="h-8 whitespace-nowrap rounded-full px-3 text-xs"
										size="sm"
										type="button"
										disabled={pending}
										onClick={() => runTask(task.kind)}
									>
										{pending ? task.pendingLabel : task.label}
									</Button>
									<button
										class={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] leading-none ${
											taskReports[task.kind]
												? `${getTaskStatusClass(task.kind)} transition-colors hover:brightness-[0.98]`
												: `${getTaskStatusClass(task.kind)} cursor-default`
										}`}
										type="button"
										disabled={!taskReports[task.kind]}
										onClick={() => openTaskReport(task.kind)}
									>
										{getTaskStatusText(task.kind)}
									</button>
								</div>
							);
						})}
						<Button
							class="h-9 shrink-0 px-4 text-xs"
							size="sm"
							variant="primary"
							type="button"
							onClick={onCreate}
						>
							新增站点
						</Button>
					</div>
				</div>
				<Card variant="compact" class="app-toolbar-card space-y-3 p-4">
					<div class="flex flex-wrap items-center gap-3">
						<div class="app-search w-full sm:w-72">
							<span class="app-search__icon" aria-hidden="true">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<title>搜索</title>
									<circle cx="11" cy="11" r="7" />
									<path d="M20 20l-3.5-3.5" />
								</svg>
							</span>
							<input
								class="app-search__input"
								placeholder="搜索站点名称或 URL"
								value={localSearch}
								onInput={(event) =>
									setLocalSearch(
										(event.currentTarget as HTMLInputElement).value,
									)
								}
							/>
						</div>
						<div class="flex flex-wrap items-center gap-2 md:hidden">
							{sortableColumns.map((column) => (
								<button
									class={`app-button app-focus h-8 px-3 text-[11px] ${
										siteSort.key === column.key ? "app-button-primary" : ""
									}`}
									key={column.key}
									type="button"
									onClick={() => toggleSort(column.key)}
								>
									{column.label} {sortIndicator(column.key)}
								</button>
							))}
						</div>
					</div>
				</Card>
				<div>
					<div class="app-mobile-stack space-y-3 md:hidden">
						{pagedSites.length === 0 ? (
							<Card class="text-center text-sm text-[color:var(--app-ink-muted)]">
								<p>暂无站点，请先创建。</p>
								<Button
									class="mt-4 h-9 px-4 text-xs"
									size="sm"
									variant="primary"
									type="button"
									onClick={onCreate}
								>
									新增站点
								</Button>
							</Card>
						) : (
							pagedSites.map((site) => {
								const isActive = site.status === "active";
								const isToday = site.last_checkin_date === today;
								const message = isToday ? site.last_checkin_message : null;
								const canCheckin = site.site_type === "new-api";
								const checkinDisabled = !canCheckin;
								const systemReady = Boolean(
									site.system_token && site.system_userid,
								);
								const callTokenCount = site.call_tokens?.length ?? 0;
								const verifyPending = isActionPending(`site:verify:${site.id}`);
								const checkinPending = isActionPending(
									`site:checkin:${site.id}`,
								);
								const refreshPending = isActionPending(
									`site:refresh:${site.id}`,
								);
								const togglePending = isActionPending(`site:toggle:${site.id}`);
								const deletePending = isActionPending(`site:delete:${site.id}`);
								return (
									<Card
										class={`p-4 ${
											editingSite?.id === site.id
												? "bg-[rgba(10,132,255,0.12)]"
												: ""
										}`}
										key={site.id}
									>
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0">
												<p class="truncate text-sm font-semibold text-[color:var(--app-ink)]">
													{site.name}
												</p>
												<p class="truncate text-xs text-[color:var(--app-ink-muted)]">
													{site.base_url}
												</p>
												{site.verification && (
													<p class="mt-1 truncate text-[11px] text-[color:var(--app-ink-muted)]">
														最近验证：
														{getVerificationVerdictLabel(
															site.verification.verdict,
														)}
													</p>
												)}
											</div>
											<Chip
												class="text-[10px] uppercase tracking-widest"
												variant={isActive ? "success" : "muted"}
											>
												{isActive ? "启用" : "禁用"}
											</Chip>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs text-[color:var(--app-ink-muted)]">
											<span>类型</span>
											<span class="font-semibold text-[color:var(--app-ink)]">
												{getSiteTypeLabel(site.site_type)}
											</span>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs text-[color:var(--app-ink-muted)]">
											<span>权重</span>
											<span class="font-semibold text-[color:var(--app-ink)]">
												{site.weight}
											</span>
										</div>
										<div class="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--app-ink-muted)]">
											<Card variant="compact">
												<p>系统令牌</p>
												<p class="mt-1 truncate font-semibold text-[color:var(--app-ink)]">
													{systemReady ? "已配置" : "未配置"}
												</p>
											</Card>
											<Card variant="compact">
												<p>调用令牌</p>
												<p class="mt-1 font-semibold text-[color:var(--app-ink)]">
													{callTokenCount > 0 ? `${callTokenCount} 个` : "-"}
												</p>
											</Card>
											{site.site_type === "new-api" && (
												<Card variant="compact">
													<p>自动签到</p>
													<p class="mt-1 font-semibold text-[color:var(--app-ink)]">
														{site.checkin_enabled ? "已开启" : "已关闭"}
													</p>
												</Card>
											)}
											<Card variant="compact">
												<p>今日签到</p>
												<p class="mt-1 font-semibold text-[color:var(--app-ink)]">
													{getSiteCheckinLabel(site, today)}
												</p>
												{message &&
													site.site_type === "new-api" &&
													site.checkin_enabled && (
														<p class="mt-1 truncate text-[11px] text-[color:var(--app-ink-muted)]">
															{message}
														</p>
													)}
											</Card>
										</div>
										<div class="mt-3 grid grid-cols-2 gap-2">
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												disabled={verifyPending}
												onClick={() => onVerify(site.id)}
											>
												{verifyPending ? "验证中..." : "验证"}
											</Button>
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												disabled={checkinPending || checkinDisabled}
												title={
													checkinDisabled ? "仅 new-api 支持签到" : undefined
												}
												onClick={() => {
													if (!canCheckin) {
														return;
													}
													onCheckin(site);
												}}
											>
												{checkinPending ? "签到中..." : "签到"}
											</Button>
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												disabled={refreshPending || !isActive}
												title={!isActive ? "仅启用渠道可更新" : undefined}
												onClick={() => onRefreshSite(site)}
											>
												{refreshPending ? "更新中..." : "更新渠道"}
											</Button>
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												disabled={togglePending}
												onClick={() => onToggle(site.id, site.status)}
											>
												{togglePending
													? "处理中..."
													: isActive
														? "禁用"
														: "启用"}
											</Button>
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												type="button"
												onClick={() => onEdit(site)}
											>
												编辑
											</Button>
											<Button
												class="h-9 w-full px-3 text-xs"
												size="sm"
												variant="ghost"
												type="button"
												disabled={deletePending}
												onClick={() => onDelete(site)}
											>
												{deletePending ? "删除中..." : "删除"}
											</Button>
										</div>
									</Card>
								);
							})
						)}
					</div>
					<div class="app-surface app-list-shell hidden overflow-hidden md:block">
						<div
							class="app-list-header grid gap-3 px-4 py-3 text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
							style={`grid-template-columns: ${siteGridTemplate};`}
						>
							{sortableColumns
								.filter((column) => visibleColumnSet.has(column.key))
								.map((column) => {
									const tooltip = columnTooltips[column.key];
									return (
										<div key={column.key}>
											<button
												class="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--app-ink-muted)] hover:text-[color:var(--app-ink)]"
												type="button"
												onClick={() => toggleSort(column.key)}
											>
												{tooltip ? (
													<Tooltip content={tooltip} class="inline-flex">
														<span>{column.label}</span>
													</Tooltip>
												) : (
													<span>{column.label}</span>
												)}
												<span class="text-[10px]">
													{sortIndicator(column.key)}
												</span>
											</button>
										</div>
									);
								})}
							{visibleColumnSet.has("actions") && <div>操作</div>}
						</div>
						{pagedSites.length === 0 ? (
							<div class="app-list-empty px-4 py-10 text-center text-sm text-[color:var(--app-ink-muted)]">
								<p>暂无站点，请先创建。</p>
								<Button
									class="mt-4 h-9 px-4 text-xs"
									size="sm"
									variant="primary"
									type="button"
									onClick={onCreate}
								>
									新增站点
								</Button>
							</div>
						) : (
							<div class="app-list-body divide-y divide-white/60">
								{pagedSites.map((site) => {
									const isActive = site.status === "active";
									const canCheckin = site.site_type === "new-api";
									const checkinDisabled = !canCheckin;
									const callTokenCount = site.call_tokens?.length ?? 0;
									const verifyPending = isActionPending(
										`site:verify:${site.id}`,
									);
									const checkinPending = isActionPending(
										`site:checkin:${site.id}`,
									);
									const refreshPending = isActionPending(
										`site:refresh:${site.id}`,
									);
									const togglePending = isActionPending(
										`site:toggle:${site.id}`,
									);
									const deletePending = isActionPending(
										`site:delete:${site.id}`,
									);
									return (
										<div
											class={`app-list-row grid items-center gap-3 px-4 py-4 text-sm ${
												editingSite?.id === site.id
													? "bg-[rgba(10,132,255,0.08)]"
													: ""
											}`}
											key={site.id}
											style={`grid-template-columns: ${siteGridTemplate};`}
										>
											{visibleColumnSet.has("name") && (
												<div class="flex min-w-0 flex-col">
													<span class="truncate font-semibold text-[color:var(--app-ink)]">
														{site.name}
													</span>
													<span
														class="truncate text-xs text-[color:var(--app-ink-muted)]"
														title={site.base_url}
													>
														{site.base_url}
													</span>
													{site.verification && (
														<span class="truncate text-[11px] text-[color:var(--app-ink-muted)]">
															最近验证：
															{getVerificationVerdictLabel(
																site.verification.verdict,
															)}
														</span>
													)}
												</div>
											)}
											{visibleColumnSet.has("type") && (
												<div class="text-xs font-semibold text-[color:var(--app-ink)]">
													{getSiteTypeLabel(site.site_type)}
												</div>
											)}
											{visibleColumnSet.has("status") && (
												<div>
													<Chip
														variant={isActive ? "success" : "muted"}
														class="text-xs"
													>
														{isActive ? "启用" : "禁用"}
													</Chip>
												</div>
											)}
											{visibleColumnSet.has("weight") && (
												<div class="text-xs font-semibold text-[color:var(--app-ink)]">
													{site.weight}
												</div>
											)}
											{visibleColumnSet.has("tokens") && (
												<div class="text-xs text-[color:var(--app-ink-muted)]">
													{callTokenCount > 0 ? `${callTokenCount} 个` : "-"}
												</div>
											)}
											{visibleColumnSet.has("checkin_enabled") && (
												<div class="text-xs text-[color:var(--app-ink-muted)]">
													{site.site_type === "new-api"
														? site.checkin_enabled
															? "已开启"
															: "已关闭"
														: "-"}
												</div>
											)}
											{visibleColumnSet.has("checkin") && (
												<div class="text-xs text-[color:var(--app-ink-muted)]">
													{getSiteCheckinLabel(site, today)}
												</div>
											)}
											{visibleColumnSet.has("actions") && (
												<div class="flex flex-wrap gap-2">
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														disabled={verifyPending}
														onClick={() => onVerify(site.id)}
													>
														{verifyPending ? "验证中..." : "验证"}
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														disabled={checkinPending || checkinDisabled}
														title={
															checkinDisabled
																? "仅 new-api 支持签到"
																: undefined
														}
														onClick={() => {
															if (!canCheckin) {
																return;
															}
															onCheckin(site);
														}}
													>
														{checkinPending ? "签到中..." : "签到"}
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														disabled={refreshPending || !isActive}
														title={!isActive ? "仅启用渠道可更新" : undefined}
														onClick={() => onRefreshSite(site)}
													>
														{refreshPending ? "更新中..." : "更新渠道"}
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														disabled={togglePending}
														onClick={() => onToggle(site.id, site.status)}
													>
														{togglePending
															? "处理中..."
															: isActive
																? "禁用"
																: "启用"}
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														type="button"
														onClick={() => onEdit(site)}
													>
														编辑
													</Button>
													<Button
														class="h-9 px-3 text-xs"
														size="sm"
														variant="ghost"
														type="button"
														disabled={deletePending}
														onClick={() => onDelete(site)}
													>
														{deletePending ? "删除中..." : "删除"}
													</Button>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
				<div class="app-pagination-bar flex flex-col gap-3 text-xs text-[color:var(--app-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-xs text-[color:var(--app-ink-muted)]">
							共 {siteTotal} 条 · {displayPages} 页
						</span>
						<Pagination
							page={sitePage}
							totalPages={siteTotalPages}
							items={pageItems}
							onPageChange={onPageChange}
						/>
					</div>
					<div class="app-page-size-control">
						<span class="app-page-size-control__label">每页</span>
						<div class="app-page-size-control__chips">
							{pageSizeOptions.map((size) => (
								<button
									class={`app-page-size-chip ${
										sitePageSize === size ? "app-page-size-chip--active" : ""
									}`}
									key={size}
									type="button"
									onClick={() => onPageSizeChange(size)}
								>
									{size}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
			{renderTaskReportDialog()}
			{isSiteModalOpen && (
				<Dialog open={isSiteModalOpen} onClose={onCloseModal}>
					<DialogContent
						aria-labelledby="site-modal-title"
						aria-modal="true"
						class="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden"
					>
						<DialogHeader>
							<div>
								<DialogTitle id="site-modal-title">
									{isEditing ? "编辑站点" : "新增站点"}
								</DialogTitle>
								<DialogDescription>
									{isEditing
										? `正在编辑：${editingSite?.name ?? ""}`
										: "填写站点信息并保存。"}
								</DialogDescription>
							</div>
							<Button size="sm" type="button" onClick={onCloseModal}>
								关闭
							</Button>
						</DialogHeader>
						<form
							class="mt-4 grid min-h-0 gap-4 overflow-y-auto pr-1"
							onSubmit={onSubmit}
						>
							<Card class="p-4">
								<p class="text-xs font-semibold uppercase tracking-widest text-[color:var(--app-ink-muted)]">
									基础信息
								</p>
								<div class="mt-3 grid gap-4 md:grid-cols-2">
									<div>
										<label
											class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
											for="site-name"
										>
											名称
										</label>
										<Input
											id="site-name"
											name="name"
											value={siteForm.name}
											required
											onInput={(event) =>
												onFormChange({
													name: (event.currentTarget as HTMLInputElement).value,
												})
											}
										/>
									</div>
									<div>
										<label
											class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
											for="site-type"
										>
											站点类型
										</label>
										<Select
											id="site-type"
											name="site_type"
											value={siteForm.site_type}
											onChange={(event) =>
												onFormChange({
													site_type: (event.currentTarget as HTMLSelectElement)
														.value as Site["site_type"],
												})
											}
										>
											<option value="new-api">new-api</option>
											<option value="done-hub">done-hub</option>
											<option value="subapi">subapi</option>
											<option value="openai">openai</option>
											<option value="anthropic">Anthropic</option>
											<option value="gemini">gemini</option>
										</Select>
									</div>
								</div>
								<div class="mt-4">
									<label
										class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
										for="site-base"
									>
										基础 URL{isOfficialType ? "（可留空）" : ""}
									</label>
									<Input
										id="site-base"
										name="base_url"
										placeholder="https://api.example.com"
										value={siteForm.base_url}
										required={!isOfficialType}
										onInput={(event) =>
											onFormChange({
												base_url: (event.currentTarget as HTMLInputElement)
													.value,
											})
										}
									/>
								</div>
								<div class="mt-4 grid gap-4 md:grid-cols-2">
									<div>
										<label
											class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
											for="site-weight"
										>
											权重
										</label>
										<Input
											id="site-weight"
											name="weight"
											type="number"
											min="1"
											value={siteForm.weight}
											onInput={(event) =>
												onFormChange({
													weight: Number(
														(event.currentTarget as HTMLInputElement).value ||
															0,
													),
												})
											}
										/>
									</div>
									<div>
										<label
											class="mb-1.5 block text-xs uppercase tracking-widest text-[color:var(--app-ink-muted)]"
											for="site-status"
										>
											站点状态
										</label>
										<Select
											id="site-status"
											name="status"
											value={siteForm.status}
											onChange={(event) =>
												onFormChange({
													status: (event.currentTarget as HTMLSelectElement)
														.value,
												})
											}
										>
											<option value="active">启用</option>
											<option value="disabled">禁用</option>
										</Select>
									</div>
								</div>
							</Card>
							<Card class="p-4">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<p class="text-xs font-semibold uppercase tracking-widest text-[color:var(--app-ink-muted)]">
										调用令牌
									</p>
									<Button
										class="h-8 px-3 text-[11px]"
										size="sm"
										type="button"
										onClick={addCallToken}
									>
										新增令牌
									</Button>
								</div>
								<p class="mt-2 text-xs text-[color:var(--app-ink-muted)]">
									用于实际调用，系统会按顺序选择可用令牌。
								</p>
								<div class="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
									{siteForm.call_tokens.map((token, index) => (
										<Card
											variant="compact"
											class="px-3 py-3"
											key={`${token.id ?? "new"}-${index}`}
										>
											<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
												<Input
													class="text-xs"
													placeholder="备注名"
													value={token.name}
													onInput={(event) =>
														updateCallToken(index, {
															name: (event.currentTarget as HTMLInputElement)
																.value,
														})
													}
												/>
												<Input
													class="text-xs"
													placeholder="调用令牌"
													value={token.api_key}
													onInput={(event) =>
														updateCallToken(index, {
															api_key: (event.currentTarget as HTMLInputElement)
																.value,
														})
													}
												/>
											</div>
											<div class="mt-2 flex items-center justify-end">
												<button
													class="text-[11px] font-semibold text-[color:var(--app-ink-muted)] transition-colors hover:text-[color:var(--app-danger)] disabled:cursor-not-allowed disabled:opacity-50"
													type="button"
													disabled={siteForm.call_tokens.length <= 1}
													onClick={() => removeCallToken(index)}
												>
													删除此令牌
												</button>
											</div>
										</Card>
									))}
								</div>
							</Card>
							{needsSystemToken && (
								<Card class="p-4">
									<p class="text-xs font-semibold uppercase tracking-widest text-[color:var(--app-ink-muted)]">
										系统令牌与签到
									</p>
									<div class="mt-3 grid gap-3 md:grid-cols-2">
										<Input
											placeholder="系统令牌"
											value={siteForm.system_token}
											onInput={(event) =>
												onFormChange({
													system_token: (
														event.currentTarget as HTMLInputElement
													).value,
												})
											}
										/>
										<Input
											placeholder="User ID"
											value={siteForm.system_userid}
											onInput={(event) =>
												onFormChange({
													system_userid: (
														event.currentTarget as HTMLInputElement
													).value,
												})
											}
										/>
									</div>
									<div class="mt-3 grid gap-3 md:grid-cols-2">
										{isNewApi && (
											<div class="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/70 px-3 py-2">
												<div>
													<p class="text-xs font-semibold uppercase tracking-widest text-[color:var(--app-ink-muted)]">
														自动签到
													</p>
													<p class="text-xs text-[color:var(--app-ink-muted)]">
														启用后按计划自动执行。
													</p>
												</div>
												<Switch
													checked={Boolean(siteForm.checkin_enabled)}
													onToggle={(next) =>
														onFormChange({ checkin_enabled: next })
													}
												/>
											</div>
										)}
										<Input
											placeholder={
												isNewApi ? "签到地址（可选）" : "外部签到地址（可选）"
											}
											value={siteForm.checkin_url}
											onInput={(event) =>
												onFormChange({
													checkin_url: (event.currentTarget as HTMLInputElement)
														.value,
												})
											}
										/>
									</div>
								</Card>
							)}
							<DialogFooter>
								<Button size="sm" type="button" onClick={onCloseModal}>
									取消
								</Button>
								<Button
									size="sm"
									variant="primary"
									type="submit"
									disabled={isSubmitting}
								>
									{isSubmitting
										? "保存中..."
										: isEditing
											? "保存修改"
											: "创建站点"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
};
