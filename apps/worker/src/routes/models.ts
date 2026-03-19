import { Hono } from "hono";
import type { AppEnv } from "../env";
import { listModelEntriesWithFallback } from "../services/channel-model-capabilities";
import { listActiveChannels } from "../services/channel-repo";
import { getCacheConfig } from "../services/settings";
import { withApiCache } from "../utils/cache";

const models = new Hono<AppEnv>();

/**
 * Returns aggregated models from all channels.
 */
models.get("/", async (c) => {
	const cacheConfig = await getCacheConfig(c.env.DB, c.env.CACHE_VERSION_STORE);
	return withApiCache(
		c,
		{
			namespace: "models",
			version: cacheConfig.version_models,
			ttlSeconds: cacheConfig.models_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const channels = await listActiveChannels(c.env.DB);
			const entries = await listModelEntriesWithFallback(
				c.env.DB,
				channels.map((channel) => ({
					id: channel.id,
					name: channel.name,
					models_json: channel.models_json,
				})),
			);

			const map = new Map<
				string,
				{ id: string; channels: { id: string; name: string }[] }
			>();
			for (const entry of entries) {
				const existing = map.get(entry.id) ?? { id: entry.id, channels: [] };
				existing.channels.push({
					id: entry.channelId,
					name: entry.channelName,
				});
				map.set(entry.id, existing);
			}

			return c.json({
				models: Array.from(map.values()),
			});
		},
	);
});

export default models;
