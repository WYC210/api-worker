import type { D1Database } from "@cloudflare/workers-types";
import type { CheckinResultItem, CheckinSummary } from "./checkin";
import type { SiteVerificationBatchResult } from "./site-verification";
import { nowIso } from "../utils/time";

export type SiteTaskKind =
	| "checkin"
	| "verify-active"
	| "verify-disabled"
	| "refresh-active";

export type SiteChannelRefreshItem = {
	site_id: string;
	site_name: string;
	status: "success" | "failed";
	message: string;
	models: string[];
};

export type SiteChannelRefreshBatchReport = {
	summary: {
		total: number;
		success: number;
		failed: number;
	};
	items: SiteChannelRefreshItem[];
	runs_at: string;
};

export type SiteTaskReportState =
	| {
			kind: "checkin";
			runs_at: string;
			summary: CheckinSummary;
			items: CheckinResultItem[];
	  }
	| {
			kind: "verify-active" | "verify-disabled";
			runs_at: string;
			report: SiteVerificationBatchResult;
	  }
	| {
			kind: "refresh-active";
			runs_at: string;
			report: SiteChannelRefreshBatchReport;
	  };

export type SiteTaskReportMap = Partial<
	Record<SiteTaskKind, SiteTaskReportState>
>;

const SITE_TASK_REPORT_SETTING_KEYS: Record<SiteTaskKind, string> = {
	checkin: "site_task_report_checkin",
	"verify-active": "site_task_report_verify_active",
	"verify-disabled": "site_task_report_verify_disabled",
	"refresh-active": "site_task_report_refresh_active",
};

const SITE_TASK_KINDS = Object.keys(
	SITE_TASK_REPORT_SETTING_KEYS,
) as SiteTaskKind[];

const SITE_TASK_KIND_BY_SETTING_KEY = new Map<string, SiteTaskKind>(
	SITE_TASK_KINDS.map((kind) => [SITE_TASK_REPORT_SETTING_KEYS[kind], kind]),
);

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseSiteTaskReport(
	kind: SiteTaskKind,
	value: string,
): SiteTaskReportState | null {
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!isRecord(parsed) || parsed.kind !== kind) {
			return null;
		}
		if (
			typeof parsed.runs_at !== "string" ||
			parsed.runs_at.trim().length === 0
		) {
			return null;
		}
		return parsed as SiteTaskReportState;
	} catch {
		return null;
	}
}

async function upsertSetting(
	db: D1Database,
	key: string,
	value: string,
): Promise<void> {
	await db
		.prepare(
			"INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
		)
		.bind(key, value, nowIso())
		.run();
}

export async function listSiteTaskReports(
	db: D1Database,
): Promise<SiteTaskReportMap> {
	const keys = SITE_TASK_KINDS.map(
		(kind) => SITE_TASK_REPORT_SETTING_KEYS[kind],
	);
	if (keys.length === 0) {
		return {};
	}
	const placeholders = keys.map(() => "?").join(", ");
	const result = await db
		.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`)
		.bind(...keys)
		.all<{ key: string; value: string }>();
	const reports: SiteTaskReportMap = {};
	for (const row of result.results ?? []) {
		const kind = SITE_TASK_KIND_BY_SETTING_KEY.get(String(row.key));
		if (!kind) {
			continue;
		}
		const report = parseSiteTaskReport(kind, String(row.value ?? ""));
		if (!report) {
			continue;
		}
		reports[kind] = report;
	}
	return reports;
}

export async function saveSiteTaskReport(
	db: D1Database,
	report: SiteTaskReportState,
): Promise<void> {
	await upsertSetting(
		db,
		SITE_TASK_REPORT_SETTING_KEYS[report.kind],
		JSON.stringify(report),
	);
}
