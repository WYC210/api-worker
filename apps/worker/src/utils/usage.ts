import { safeJsonParse } from "./json";
import {
	normalizeUsageViaWasm,
	parseUsageFromJsonViaWasm,
	parseUsageFromSseLineViaWasm,
} from "../wasm/core";

export type NormalizedUsage = {
	totalTokens: number;
	promptTokens: number;
	completionTokens: number;
};

export type StreamUsage = {
	usage: NormalizedUsage | null;
	firstTokenLatencyMs: number | null;
};

export type StreamUsageMode = "full" | "lite" | "off";

export type StreamUsageOptions = {
	mode?: StreamUsageMode;
	maxBytes?: number;
};

const USAGE_HINTS = ['"usage"', '"usageMetadata"', '"usage_metadata"'];

function toNumber(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	const num = Number(value);
	return Number.isFinite(num) ? num : null;
}

function pickNumber(...values: Array<unknown>): number | null {
	for (const value of values) {
		const parsed = toNumber(value);
		if (parsed !== null) {
			return parsed;
		}
	}
	return null;
}

export function normalizeUsage(raw: unknown): NormalizedUsage | null {
	return normalizeUsageViaWasm(raw);
}

export function parseUsageFromJson(payload: unknown): NormalizedUsage | null {
	return parseUsageFromJsonViaWasm(payload);
}

export function parseUsageFromHeaders(
	headers: Headers,
): NormalizedUsage | null {
	const jsonHeader = headers.get("x-usage") ?? headers.get("x-openai-usage");
	if (jsonHeader) {
		const parsed = safeJsonParse<unknown>(jsonHeader, null);
		const normalized = normalizeUsage(parsed);
		if (normalized) {
			return normalized;
		}
	}

	const totalTokens = pickNumber(
		headers.get("x-usage-total-tokens"),
		headers.get("x-openai-usage-total-tokens"),
	);
	const promptTokens = pickNumber(
		headers.get("x-usage-prompt-tokens"),
		headers.get("x-openai-usage-prompt-tokens"),
	);
	const completionTokens = pickNumber(
		headers.get("x-usage-completion-tokens"),
		headers.get("x-openai-usage-completion-tokens"),
	);

	if (
		totalTokens === null &&
		promptTokens === null &&
		completionTokens === null
	) {
		return null;
	}

	return {
		totalTokens: totalTokens ?? (promptTokens ?? 0) + (completionTokens ?? 0),
		promptTokens: promptTokens ?? 0,
		completionTokens: completionTokens ?? 0,
	};
}

export async function parseUsageFromSse(
	response: Response,
	options: StreamUsageOptions = {},
): Promise<StreamUsage> {
	if (!response.body) {
		return { usage: null, firstTokenLatencyMs: null };
	}
	const mode: StreamUsageMode = options.mode ?? "full";
	if (mode === "off") {
		return { usage: null, firstTokenLatencyMs: null };
	}
	const maxBytes =
		typeof options.maxBytes === "number" && options.maxBytes > 0
			? options.maxBytes
			: Number.POSITIVE_INFINITY;
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let usage: NormalizedUsage | null = null;
	const start = Date.now();
	let firstTokenLatencyMs: number | null = null;
	let bytesRead = 0;

	const payloadMayContainUsage = (payload: string): boolean => {
		if (!payload) {
			return false;
		}
		return USAGE_HINTS.some((hint) => payload.includes(hint));
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		bytesRead += value?.byteLength ?? 0;
		if (bytesRead > maxBytes) {
			await reader.cancel();
			break;
		}
		buffer += decoder.decode(value, { stream: true });
		let newlineIndex = buffer.indexOf("\n");
		while (newlineIndex !== -1) {
			const line = buffer.slice(0, newlineIndex).trim();
			buffer = buffer.slice(newlineIndex + 1);
			if (line.startsWith("data:")) {
				const payload = line.slice(5).trim();
				if (payload && payload !== "[DONE]") {
					if (firstTokenLatencyMs === null) {
						firstTokenLatencyMs = Date.now() - start;
					}
					if (mode === "lite" && !payloadMayContainUsage(payload)) {
						newlineIndex = buffer.indexOf("\n");
						continue;
					}
					const wasmCandidate = parseUsageFromSseLineViaWasm(line);
					if (wasmCandidate) {
						usage = wasmCandidate;
						if (mode === "lite") {
							await reader.cancel();
							return { usage, firstTokenLatencyMs };
						}
						newlineIndex = buffer.indexOf("\n");
						continue;
					}
				}
			}
			newlineIndex = buffer.indexOf("\n");
		}
	}

	const remaining = buffer.trim();
	if (remaining.startsWith("data:")) {
		const payload = remaining.slice(5).trim();
		if (payload && payload !== "[DONE]") {
			if (firstTokenLatencyMs === null) {
				firstTokenLatencyMs = Date.now() - start;
			}
			if (mode === "lite" && !payloadMayContainUsage(payload)) {
				return { usage, firstTokenLatencyMs };
			}
			const wasmCandidate = parseUsageFromSseLineViaWasm(remaining);
			if (wasmCandidate) {
				usage = wasmCandidate;
				return { usage, firstTokenLatencyMs };
			}
		}
	}

	return { usage, firstTokenLatencyMs };
}
