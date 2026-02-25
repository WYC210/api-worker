import type {
	DurableObjectNamespace,
	DurableObjectState,
} from "@cloudflare/workers-types";
import type { Bindings } from "../env";
import {
	beijingDateString,
	computeBeijingScheduleTime,
	computeNextBeijingRun,
} from "../utils/time";
import { runCheckinAll } from "./checkin-runner";
import { getCheckinScheduleTime } from "./settings";

const SCHEDULER_NAME = "checkin-scheduler";
const LAST_RUN_DATE_KEY = "last_run_date";

export const getCheckinSchedulerStub = (namespace: DurableObjectNamespace) =>
	namespace.get(namespace.idFromName(SCHEDULER_NAME));

export const shouldRunCheckin = (
	now: Date,
	scheduleTime: string,
	lastRunDate: string | null,
) => {
	const today = beijingDateString(now);
	if (lastRunDate && lastRunDate === today) {
		return false;
	}
	const scheduledAt = computeBeijingScheduleTime(now, scheduleTime);
	return now.getTime() >= scheduledAt.getTime();
};

export const shouldResetLastRun = (currentTime: string, nextTime: string) =>
	currentTime !== nextTime;

export const computeNextAlarmAt = (
	now: Date,
	scheduleTime: string,
	reset: boolean,
) => {
	if (!reset) {
		return computeNextBeijingRun(now, scheduleTime);
	}
	const scheduledAt = computeBeijingScheduleTime(now, scheduleTime);
	if (now.getTime() >= scheduledAt.getTime()) {
		return new Date(now.getTime() + 1000);
	}
	return scheduledAt;
};

type RescheduleResult = {
	nextRunAt: string | null;
};

export class CheckinScheduler {
	private state: DurableObjectState;
	private env: Bindings;

	constructor(state: DurableObjectState, env: Bindings) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === "POST" && url.pathname === "/reschedule") {
			let reset = false;
			try {
				const payload = (await request.json()) as { reset?: boolean };
				reset = Boolean(payload?.reset);
			} catch {
				reset = false;
			}
			const result = await this.reschedule(new Date(), reset);
			return new Response(JSON.stringify({ ok: true, ...result }), {
				headers: { "Content-Type": "application/json" },
			});
		}
		if (request.method === "GET" && url.pathname === "/status") {
			const lastRunDate =
				(await this.state.storage.get<string>(LAST_RUN_DATE_KEY)) ?? null;
			return new Response(
				JSON.stringify({
					ok: true,
					last_run_date: lastRunDate,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}
		return new Response("Not Found", { status: 404 });
	}

	async alarm(): Promise<void> {
		await this.handleAlarm();
	}

	private async handleAlarm(): Promise<void> {
		const now = new Date();
		const scheduleTime = await getCheckinScheduleTime(this.env.DB);
		const lastRunDate =
			(await this.state.storage.get<string>(LAST_RUN_DATE_KEY)) ?? null;
		if (shouldRunCheckin(now, scheduleTime, lastRunDate)) {
			await runCheckinAll(this.env.DB, now);
			await this.state.storage.put(LAST_RUN_DATE_KEY, beijingDateString(now));
		}
		await this.reschedule(now);
	}

	private async reschedule(
		now: Date = new Date(),
		reset = false,
	): Promise<RescheduleResult> {
		const scheduleTime = await getCheckinScheduleTime(this.env.DB);
		if (reset) {
			await this.state.storage.delete(LAST_RUN_DATE_KEY);
		}
		const nextRun = computeNextAlarmAt(now, scheduleTime, reset);
		await this.state.storage.setAlarm(nextRun.getTime());
		return { nextRunAt: nextRun.toISOString() };
	}
}
