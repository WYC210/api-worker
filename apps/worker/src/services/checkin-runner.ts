import type { D1Database } from "@cloudflare/workers-types";
import { beijingDateString } from "../utils/time";
import { listChannels, updateChannelCheckinResult } from "./channel-repo";
import {
	type CheckinResultItem,
	type CheckinSummary,
	runCheckin,
	summarizeCheckin,
} from "./checkin";
import { parseSiteMetadata } from "./site-metadata";

export type CheckinRunResult = {
	results: CheckinResultItem[];
	summary: CheckinSummary;
	runsAt: string;
};

export async function runCheckinAll(
	db: D1Database,
	now: Date = new Date(),
): Promise<CheckinRunResult> {
	const channelRows = await listChannels(db, { orderBy: "created_at" });
	const results: CheckinResultItem[] = [];
	const today = beijingDateString(now);

	for (const channel of channelRows) {
		if (channel.status !== "active") {
			continue;
		}
		const metadata = parseSiteMetadata(channel.metadata_json);
		if (metadata.site_type !== "new-api") {
			continue;
		}
		const rawEnabled = channel.checkin_enabled ?? 0;
		const checkinEnabled =
			typeof rawEnabled === "boolean" ? rawEnabled : Number(rawEnabled) === 1;
		if (!checkinEnabled) {
			continue;
		}
		const alreadyChecked =
			channel.last_checkin_date === today &&
			(channel.last_checkin_status === "success" ||
				channel.last_checkin_status === "skipped");
		if (alreadyChecked) {
			results.push({
				id: channel.id,
				name: channel.name,
				status: "skipped",
				message: channel.last_checkin_message ?? "今日已签到",
				checkin_date: channel.last_checkin_date ?? today,
			});
			continue;
		}
		const result = await runCheckin({
			id: channel.id,
			name: channel.name,
			base_url: String(channel.base_url),
			checkin_url: channel.checkin_url ?? null,
			system_token: channel.system_token ?? null,
			system_userid: channel.system_userid ?? null,
		});
		const checkinDate = result.checkin_date ?? today;
		await updateChannelCheckinResult(db, channel.id, {
			last_checkin_date: checkinDate,
			last_checkin_status: result.status,
			last_checkin_message: result.message,
			last_checkin_at: now.toISOString(),
		});
		results.push({ ...result, checkin_date: checkinDate });
	}

	return {
		results,
		summary: summarizeCheckin(results),
		runsAt: now.toISOString(),
	};
}
