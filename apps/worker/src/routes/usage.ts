import { Hono } from "hono";
import type { AppEnv } from "../env";
import { getCacheConfig, getRetentionDays } from "../services/settings";
import { pruneUsageLogs } from "../services/usage";
import { withApiCache } from "../utils/cache";

const usage = new Hono<AppEnv>();

/**
 * Lists usage logs with filters.
 */
usage.get("/", async (c) => {
	const cacheConfig = await getCacheConfig(c.env.DB, c.env.CACHE_VERSION_STORE);
	return withApiCache(
		c,
		{
			namespace: "usage",
			version: cacheConfig.version_usage,
			ttlSeconds: cacheConfig.usage_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const query = c.req.query();
			const filters: string[] = [];
			const params: Array<string | number> = [];

			if (query.from) {
				filters.push("usage_logs.created_at >= ?");
				params.push(query.from);
			}
			if (query.to) {
				filters.push("usage_logs.created_at <= ?");
				params.push(query.to);
			}
			if (query.model) {
				const model = String(query.model).trim();
				if (model) {
					filters.push("usage_logs.model LIKE ? COLLATE NOCASE");
					params.push(`%${model}%`);
				}
			}
			if (query.channel_id) {
				filters.push("usage_logs.channel_id = ?");
				params.push(query.channel_id);
			}
			if (query.token_id) {
				filters.push("usage_logs.token_id = ?");
				params.push(query.token_id);
			}
			if (query.channel_ids) {
				const channelIds = String(query.channel_ids)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (channelIds.length > 0) {
					const placeholders = channelIds.map(() => "?").join(", ");
					filters.push(`usage_logs.channel_id IN (${placeholders})`);
					params.push(...channelIds);
				}
			}
			if (query.token_ids) {
				const tokenIds = String(query.token_ids)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (tokenIds.length > 0) {
					const placeholders = tokenIds.map(() => "?").join(", ");
					filters.push(`usage_logs.token_id IN (${placeholders})`);
					params.push(...tokenIds);
				}
			}
			if (query.models) {
				const models = String(query.models)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (models.length > 0) {
					const placeholders = models.map(() => "?").join(", ");
					filters.push(`usage_logs.model IN (${placeholders})`);
					params.push(...models);
				}
			}
			if (query.statuses) {
				const statuses = String(query.statuses)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (statuses.length > 0) {
					const numericStatuses = statuses
						.map((item) => Number(item))
						.filter((value) => !Number.isNaN(value));
					const textStatuses = statuses.filter((item) =>
						Number.isNaN(Number(item)),
					);
					const statusFilters: string[] = [];
					if (numericStatuses.length > 0) {
						const placeholders = numericStatuses.map(() => "?").join(", ");
						statusFilters.push(
							`usage_logs.upstream_status IN (${placeholders})`,
						);
						params.push(...numericStatuses);
					}
					if (textStatuses.length > 0) {
						const placeholders = textStatuses.map(() => "?").join(", ");
						statusFilters.push(`usage_logs.status IN (${placeholders})`);
						params.push(...textStatuses);
					}
					if (statusFilters.length > 0) {
						filters.push(`(${statusFilters.join(" OR ")})`);
					}
				}
			}
			if (query.channel) {
				const channel = String(query.channel).trim();
				if (channel) {
					filters.push("channels.name LIKE ? COLLATE NOCASE");
					params.push(`%${channel}%`);
				}
			}
			if (query.token) {
				const token = String(query.token).trim();
				if (token) {
					filters.push("tokens.name LIKE ? COLLATE NOCASE");
					params.push(`%${token}%`);
				}
			}
			if (query.status) {
				const rawStatus = String(query.status).trim();
				if (rawStatus) {
					const numericStatus = Number(rawStatus);
					if (Number.isNaN(numericStatus)) {
						filters.push("usage_logs.status LIKE ? COLLATE NOCASE");
						params.push(`%${rawStatus}%`);
					} else {
						filters.push("usage_logs.upstream_status = ?");
						params.push(numericStatus);
					}
				}
			}

			const rawLimit = Number(query.limit ?? 50);
			const normalizedLimit = Number.isNaN(rawLimit)
				? 50
				: Math.floor(rawLimit);
			const limit = Math.min(Math.max(normalizedLimit, 1), 200);
			const rawOffset = Number(query.offset ?? 0);
			const normalizedOffset = Number.isNaN(rawOffset)
				? 0
				: Math.max(0, Math.floor(rawOffset));

			const whereSql =
				filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
			const baseSql =
				"FROM usage_logs LEFT JOIN channels ON channels.id = usage_logs.channel_id LEFT JOIN tokens ON tokens.id = usage_logs.token_id";

			const retention = await getRetentionDays(c.env.DB);
			await pruneUsageLogs(c.env.DB, retention);

			const countRow = await c.env.DB.prepare(
				`SELECT COUNT(*) as total ${baseSql} ${whereSql}`,
			)
				.bind(...params)
				.first<{ total: number }>();
			const total = Number(countRow?.total ?? 0);

			const listSql = `SELECT usage_logs.*, channels.name as channel_name, tokens.name as token_name ${baseSql} ${whereSql} ORDER BY usage_logs.created_at DESC LIMIT ? OFFSET ?`;
			const result = await c.env.DB.prepare(listSql)
				.bind(...params, limit, normalizedOffset)
				.all();
			return c.json({
				logs: result.results ?? [],
				total,
				limit,
				offset: normalizedOffset,
			});
		},
	);
});

export default usage;
