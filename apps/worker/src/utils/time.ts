/**
 * Returns the current ISO timestamp.
 */
export function nowIso(): string {
	return new Date().toISOString();
}

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const DEFAULT_SCHEDULE_TIME = "00:10";

/**
 * Adds hours to a date and returns a new Date.
 */
export function addHours(date: Date, hours: number): Date {
	const copy = new Date(date.getTime());
	copy.setHours(copy.getHours() + hours);
	return copy;
}

/**
 * Returns Beijing date string (YYYY-MM-DD).
 */
export function beijingDateString(date: Date = new Date()): string {
	const beijing = new Date(date.getTime() + BEIJING_OFFSET_MS);
	const year = beijing.getUTCFullYear();
	const month = String(beijing.getUTCMonth() + 1).padStart(2, "0");
	const day = String(beijing.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function parseScheduleTime(
	value: string,
): { hour: number; minute: number } | null {
	if (!/^\d{2}:\d{2}$/.test(value)) {
		return null;
	}
	const [hour, minute] = value.split(":").map((part) => Number(part));
	if (
		Number.isNaN(hour) ||
		Number.isNaN(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null;
	}
	return { hour, minute };
}

export function getBeijingDateParts(date: Date = new Date()) {
	const beijing = new Date(date.getTime() + BEIJING_OFFSET_MS);
	return {
		year: beijing.getUTCFullYear(),
		month: beijing.getUTCMonth() + 1,
		day: beijing.getUTCDate(),
		hour: beijing.getUTCHours(),
		minute: beijing.getUTCMinutes(),
	};
}

const DEFAULT_SCHEDULE_PARTS = parseScheduleTime(DEFAULT_SCHEDULE_TIME) ?? {
	hour: 0,
	minute: 10,
};

const resolveScheduleParts = (value: string) =>
	parseScheduleTime(value) ?? DEFAULT_SCHEDULE_PARTS;

export function computeBeijingScheduleTime(
	now: Date,
	scheduleTime: string,
): Date {
	const { year, month, day } = getBeijingDateParts(now);
	const { hour, minute } = resolveScheduleParts(scheduleTime);
	const utcMs =
		Date.UTC(year, month - 1, day, hour, minute, 0) - BEIJING_OFFSET_MS;
	return new Date(utcMs);
}

export function computeNextBeijingRun(now: Date, scheduleTime: string): Date {
	const scheduled = computeBeijingScheduleTime(now, scheduleTime);
	if (now.getTime() < scheduled.getTime()) {
		return scheduled;
	}
	const { year, month, day } = getBeijingDateParts(now);
	const { hour, minute } = resolveScheduleParts(scheduleTime);
	const utcMs =
		Date.UTC(year, month - 1, day + 1, hour, minute, 0) - BEIJING_OFFSET_MS;
	return new Date(utcMs);
}
