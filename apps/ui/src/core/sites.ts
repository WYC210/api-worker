import type { Site } from "./types";
import { getBeijingDateString } from "./utils";

export type SiteSortKey =
	| "name"
	| "type"
	| "status"
	| "weight"
	| "tokens"
	| "checkin_enabled"
	| "checkin";

export type SiteSortDirection = "asc" | "desc";

export type SiteSortState = {
	key: SiteSortKey;
	direction: SiteSortDirection;
};

export type SiteTestStatus = "success" | "failed" | "skipped";

export type SiteTestResult = {
	status: SiteTestStatus;
};

export type SiteTestSummary = {
	total: number;
	success: number;
	failed: number;
	skipped: number;
};

export const SITE_TYPE_LABELS: Record<Site["site_type"], string> = {
	"new-api": "New API",
	"done-hub": "Done Hub",
	subapi: "Sub API",
	openai: "OpenAI",
	anthropic: "Anthropic",
	gemini: "Gemini",
};

export const getSiteTypeLabel = (siteType: Site["site_type"]) =>
	SITE_TYPE_LABELS[siteType] ?? siteType;

export const getSiteStatusLabel = (status: string) =>
	status === "active" ? "启用" : "禁用";

export const summarizeSiteTests = (
	results: SiteTestResult[],
): SiteTestSummary => {
	return results.reduce(
		(acc, item) => {
			acc.total += 1;
			if (item.status === "success") {
				acc.success += 1;
			} else if (item.status === "failed") {
				acc.failed += 1;
			} else {
				acc.skipped += 1;
			}
			return acc;
		},
		{
			total: 0,
			success: 0,
			failed: 0,
			skipped: 0,
		} as SiteTestSummary,
	);
};

export const getSiteCheckinLabel = (site: Site, today?: string) => {
	const shouldShow =
		site.site_type === "new-api" && Boolean(site.checkin_enabled);
	if (!shouldShow) {
		return "-";
	}
	const day = today ?? getBeijingDateString();
	const isToday = site.last_checkin_date === day;
	const status = isToday ? site.last_checkin_status : null;
	if (!status) {
		return "未签到";
	}
	if (status === "success") {
		return "成功";
	}
	if (status === "skipped") {
		return "已签";
	}
	return "签到失败";
};

export const filterSites = (sites: Site[], query: string) => {
	const keyword = query.trim().toLowerCase();
	if (!keyword) {
		return sites;
	}
	return sites.filter((site) => {
		const name = String(site.name ?? "").toLowerCase();
		const url = String(site.base_url ?? "").toLowerCase();
		return name.includes(keyword) || url.includes(keyword);
	});
};

const toSortableText = (value: string) => value.trim().toLowerCase();

const getSortValue = (site: Site, key: SiteSortKey, today: string) => {
	switch (key) {
		case "name":
			return String(site.name ?? "");
		case "type":
			return getSiteTypeLabel(site.site_type);
		case "status":
			return getSiteStatusLabel(site.status);
		case "weight":
			return Number(site.weight ?? 0);
		case "tokens":
			return Number(site.call_tokens?.length ?? 0);
		case "checkin_enabled":
			return site.site_type === "new-api"
				? site.checkin_enabled
					? "已开启"
					: "已关闭"
				: "-";
		case "checkin":
			return getSiteCheckinLabel(site, today);
		default:
			return "";
	}
};

export const sortSites = (sites: Site[], sort: SiteSortState) => {
	const today = getBeijingDateString();
	const items = sites.map((site, index) => {
		const raw = getSortValue(site, sort.key, today);
		const value =
			typeof raw === "number" ? raw : toSortableText(String(raw ?? ""));
		return { site, index, value };
	});
	items.sort((left, right) => {
		if (left.value === right.value) {
			return left.index - right.index;
		}
		if (typeof left.value === "number" && typeof right.value === "number") {
			return sort.direction === "asc"
				? left.value - right.value
				: right.value - left.value;
		}
		const comparison = String(left.value).localeCompare(String(right.value));
		return sort.direction === "asc" ? comparison : -comparison;
	});
	return items.map((item) => item.site);
};
