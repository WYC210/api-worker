import { Hono } from "hono";
import type { AppEnv } from "../env";
import { getCacheConfig } from "../services/settings";
import { withApiCache } from "../utils/cache";

const dashboard = new Hono<AppEnv>();

function buildDateFilters(query: Record<string, string>) {
	let sql = " WHERE 1=1";
	const params: Array<string> = [];
	const channelIds = (query.channel_ids ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	const tokenIds = (query.token_ids ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	if (query.from) {
		sql += " AND usage_logs.created_at >= ?";
		params.push(query.from);
	}
	if (query.to) {
		sql += " AND usage_logs.created_at <= ?";
		params.push(query.to);
	}
	if (query.model) {
		sql += " AND usage_logs.model LIKE ? COLLATE NOCASE";
		params.push(`%${query.model}%`);
	}
	if (channelIds.length > 0) {
		sql += ` AND usage_logs.channel_id IN (${channelIds
			.map(() => "?")
			.join(",")})`;
		params.push(...channelIds);
	}
	if (tokenIds.length > 0) {
		sql += ` AND usage_logs.token_id IN (${tokenIds.map(() => "?").join(",")})`;
		params.push(...tokenIds);
	}
	return { sql, params };
}

/**
 * Returns aggregated usage metrics.
 */
dashboard.get("/", async (c) => {
	const cacheConfig = await getCacheConfig(c.env.DB, c.env.CACHE_VERSION_STORE);
	return withApiCache(
		c,
		{
			namespace: "dashboard",
			version: cacheConfig.version_dashboard,
			ttlSeconds: cacheConfig.dashboard_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const query = c.req.query();
			const interval =
				query.interval === "week" || query.interval === "month"
					? query.interval
					: "day";
			const rawLimit = Number(query.limit ?? 30);
			const normalizedLimit = Number.isNaN(rawLimit)
				? 30
				: Math.floor(rawLimit);
			const limit = Math.min(Math.max(normalizedLimit, 1), 366);
			const { sql, params } = buildDateFilters(query);
			const bucketExpression =
				interval === "week"
					? "strftime('%Y-W%W', created_at)"
					: interval === "month"
						? "substr(created_at, 1, 7)"
						: "substr(created_at, 1, 10)";

			const summary = await c.env.DB.prepare(
				`SELECT COUNT(*) as total_requests, COALESCE(SUM(total_tokens), 0) as total_tokens, COALESCE(AVG(latency_ms), 0) as avg_latency, COALESCE(SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END), 0) as total_errors FROM usage_logs${sql}`,
			)
				.bind(...params)
				.first();

			const trend = await c.env.DB.prepare(
				`SELECT ${bucketExpression} as bucket, COUNT(*) as requests, COALESCE(SUM(total_tokens), 0) as tokens FROM usage_logs${sql} GROUP BY bucket ORDER BY bucket ASC LIMIT ?`,
			)
				.bind(...params, limit)
				.all();

			const byModel = await c.env.DB.prepare(
				`SELECT model, COUNT(*) as requests, COALESCE(SUM(total_tokens), 0) as tokens FROM usage_logs${sql} GROUP BY model ORDER BY requests DESC LIMIT 20`,
			)
				.bind(...params)
				.all();

			const byChannel = await c.env.DB.prepare(
				`SELECT channels.id as channel_id, channels.name as channel_name, COUNT(usage_logs.id) as requests, COALESCE(SUM(usage_logs.total_tokens), 0) as tokens FROM usage_logs LEFT JOIN channels ON channels.id = usage_logs.channel_id${sql} GROUP BY channels.id, channels.name ORDER BY requests DESC LIMIT 20`,
			)
				.bind(...params)
				.all();

			const byToken = await c.env.DB.prepare(
				`SELECT tokens.id as token_id, tokens.name as token_name, COUNT(usage_logs.id) as requests, COALESCE(SUM(usage_logs.total_tokens), 0) as tokens FROM usage_logs LEFT JOIN tokens ON tokens.id = usage_logs.token_id${sql} GROUP BY tokens.id, tokens.name ORDER BY requests DESC LIMIT 20`,
			)
				.bind(...params)
				.all();

			return c.json({
				summary: summary ?? {
					total_requests: 0,
					total_tokens: 0,
					avg_latency: 0,
					total_errors: 0,
				},
				trend: trend.results ?? [],
				interval,
				byModel: byModel.results ?? [],
				byChannel: byChannel.results ?? [],
				byToken: byToken.results ?? [],
			});
		},
	);
});

export default dashboard;
