import { safeJsonParse } from "../utils/json";
import { normalizeBaseUrl } from "../utils/url";

export type SiteType =
	| "new-api"
	| "done-hub"
	| "subapi"
	| "openai"
	| "anthropic"
	| "gemini";

export type EndpointOverrides = {
	chat_url?: string | null;
	image_url?: string | null;
	embedding_url?: string | null;
};

export type SiteMetadata = {
	site_type: SiteType;
	endpoint_overrides: EndpointOverrides;
};

const DEFAULT_SITE_TYPE: SiteType = "new-api";

const normalizeOverride = (value: unknown): string | null => {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	return normalizeBaseUrl(trimmed);
};

export function parseSiteMetadata(
	raw: string | null | undefined,
): SiteMetadata {
	const parsed = safeJsonParse<Record<string, unknown>>(raw, {});
	const rawType = parsed.site_type;
	const site_type =
		rawType === "done-hub" ||
		rawType === "new-api" ||
		rawType === "subapi" ||
		rawType === "openai" ||
		rawType === "anthropic" ||
		rawType === "gemini"
			? (rawType as SiteType)
			: rawType === "custom"
				? "subapi"
				: DEFAULT_SITE_TYPE;
	const overrides =
		parsed.endpoint_overrides && typeof parsed.endpoint_overrides === "object"
			? (parsed.endpoint_overrides as Record<string, unknown>)
			: {};
	return {
		site_type,
		endpoint_overrides: {
			chat_url: normalizeOverride(overrides.chat_url),
			image_url: normalizeOverride(overrides.image_url),
			embedding_url: normalizeOverride(overrides.embedding_url),
		},
	};
}

export function buildSiteMetadata(
	existing: string | null | undefined,
	updates: {
		site_type?: SiteType;
		endpoint_overrides?: EndpointOverrides | null;
	},
): string | null {
	const base = safeJsonParse<Record<string, unknown>>(existing, {});
	if (updates.site_type) {
		base.site_type = updates.site_type;
	}
	if (updates.endpoint_overrides) {
		base.endpoint_overrides = {
			chat_url: normalizeOverride(updates.endpoint_overrides.chat_url),
			image_url: normalizeOverride(updates.endpoint_overrides.image_url),
			embedding_url: normalizeOverride(
				updates.endpoint_overrides.embedding_url,
			),
		};
	}
	return Object.keys(base).length > 0 ? JSON.stringify(base) : null;
}
