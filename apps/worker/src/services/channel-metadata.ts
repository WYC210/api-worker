import { safeJsonParse } from "../utils/json";
import {
	type EndpointOverrides,
	parseSiteMetadata,
	type SiteType,
} from "./site-metadata";

export type ProviderType = "openai" | "anthropic" | "gemini";

export type ChannelMetadata = {
	site_type: SiteType;
	endpoint_overrides: EndpointOverrides;
	model_mapping: Record<string, string>;
	header_overrides: Record<string, string>;
	query_overrides: Record<string, string>;
};

function normalizeMapping(value: unknown): Record<string, string> {
	if (!value) {
		return {};
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			return {};
		}
		const parsed = safeJsonParse<Record<string, unknown> | null>(trimmed, null);
		return normalizeMapping(parsed);
	}
	if (typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	const output: Record<string, string> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry === undefined || entry === null) {
			continue;
		}
		output[String(key)] = String(entry);
	}
	return output;
}

function readMetadataObject(
	raw: string | null | undefined,
): Record<string, unknown> {
	return safeJsonParse<Record<string, unknown>>(raw, {});
}

export function parseChannelMetadata(
	raw: string | null | undefined,
): ChannelMetadata {
	const base = readMetadataObject(raw);
	const site = parseSiteMetadata(raw);
	return {
		site_type: site.site_type,
		endpoint_overrides: site.endpoint_overrides,
		model_mapping: normalizeMapping(base.model_mapping),
		header_overrides: normalizeMapping(
			base.header_override ?? base.header_overrides ?? base.headers,
		),
		query_overrides: normalizeMapping(
			base.query_override ?? base.query_overrides ?? base.query,
		),
	};
}

export function resolveProvider(siteType: SiteType): ProviderType {
	if (siteType === "anthropic") {
		return "anthropic";
	}
	if (siteType === "gemini") {
		return "gemini";
	}
	return "openai";
}

export function resolveMappedModel(
	modelMapping: Record<string, string>,
	model: string | null,
): string | null {
	if (!model) {
		return modelMapping["*"] ?? null;
	}
	return modelMapping[model] ?? modelMapping["*"] ?? model;
}
