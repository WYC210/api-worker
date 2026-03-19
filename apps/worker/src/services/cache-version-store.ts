import type {
	DurableObjectNamespace,
	DurableObjectState,
	DurableObjectStub,
} from "@cloudflare/workers-types";

const STORE_NAME = "cache-version-store";
const DEFAULT_CACHE_VERSION = 1;

export const ALL_CACHE_VERSION_SCOPES = [
	"dashboard",
	"usage",
	"models",
	"tokens",
	"channels",
	"call_tokens",
	"settings",
] as const;

export type CacheVersionScope = (typeof ALL_CACHE_VERSION_SCOPES)[number];

type CacheVersionRecord = Record<CacheVersionScope, number>;

type VersionsResponse = {
	ok: boolean;
	versions: Partial<Record<CacheVersionScope, number>>;
};

const SCOPE_SET = new Set<string>(ALL_CACHE_VERSION_SCOPES);

function normalizeVersion(value: unknown, fallback = DEFAULT_CACHE_VERSION): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}
	return Math.floor(parsed);
}

function normalizeScopes(scopes: unknown): CacheVersionScope[] {
	if (!Array.isArray(scopes)) {
		return [];
	}
	const unique = new Set<CacheVersionScope>();
	for (const raw of scopes) {
		const scope = String(raw).trim() as CacheVersionScope;
		if (SCOPE_SET.has(scope)) {
			unique.add(scope);
		}
	}
	return Array.from(unique);
}

export const getCacheVersionStoreStub = (namespace: DurableObjectNamespace) =>
	namespace.get(namespace.idFromName(STORE_NAME));

export async function readCacheVersionsFromStore(
	namespace: DurableObjectNamespace,
	scopes: CacheVersionScope[],
	fallback: CacheVersionRecord,
): Promise<CacheVersionRecord> {
	const stub = getCacheVersionStoreStub(namespace);
	const url = new URL("https://cache-version-store/versions");
	url.searchParams.set("scopes", scopes.join(","));
	const response = await stub.fetch(url.toString());
	if (!response.ok) {
		throw new Error(`cache_version_read_failed:${response.status}`);
	}
	const payload = (await response.json()) as VersionsResponse;
	const versions = payload.versions ?? {};
	const resolved = { ...fallback };
	for (const scope of scopes) {
		const fromStore = normalizeVersion(versions[scope], fallback[scope]);
		// Never regress below DB fallback during rollout.
		resolved[scope] = Math.max(fromStore, fallback[scope]);
	}
	return resolved;
}

export async function bumpCacheVersionsInStore(
	namespace: DurableObjectNamespace,
	scopes: CacheVersionScope[],
): Promise<void> {
	const stub: DurableObjectStub = getCacheVersionStoreStub(namespace);
	const response = await stub.fetch("https://cache-version-store/bump", {
		method: "POST",
		body: JSON.stringify({ scopes }),
	});
	if (!response.ok) {
		throw new Error(`cache_version_bump_failed:${response.status}`);
	}
}

export class CacheVersionStore {
	private readonly state: DurableObjectState;

	constructor(state: DurableObjectState) {
		this.state = state;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === "GET" && url.pathname === "/versions") {
			const scopes = normalizeScopes(
				(url.searchParams.get("scopes") ?? "")
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean),
			);
			const targetScopes =
				scopes.length > 0 ? scopes : [...ALL_CACHE_VERSION_SCOPES];
			const versions = await this.readVersions(targetScopes);
			return this.json({
				ok: true,
				versions,
			});
		}
		if (request.method === "POST" && url.pathname === "/bump") {
			let scopes: CacheVersionScope[] = [];
			try {
				const payload = (await request.json()) as { scopes?: unknown };
				scopes = normalizeScopes(payload?.scopes);
			} catch {
				return new Response("Invalid payload", { status: 400 });
			}
			if (scopes.length === 0) {
				return this.json({ ok: true, versions: {} });
			}
			const versions = await this.bumpVersions(scopes);
			return this.json({
				ok: true,
				versions,
			});
		}
		return new Response("Not Found", { status: 404 });
	}

	private async readVersions(
		scopes: CacheVersionScope[],
	): Promise<Partial<Record<CacheVersionScope, number>>> {
		const entries = await Promise.all(
			scopes.map(async (scope) => {
				const stored = await this.state.storage.get<number>(scope);
				return [scope, normalizeVersion(stored)] as const;
			}),
		);
		return Object.fromEntries(entries);
	}

	private async bumpVersions(
		scopes: CacheVersionScope[],
	): Promise<Partial<Record<CacheVersionScope, number>>> {
		const versions: Partial<Record<CacheVersionScope, number>> = {};
		for (const scope of scopes) {
			const current = await this.state.storage.get<number>(scope);
			const next = normalizeVersion(current) + 1;
			await this.state.storage.put(scope, next);
			versions[scope] = next;
		}
		return versions;
	}

	private json(payload: unknown): Response {
		return new Response(JSON.stringify(payload), {
			headers: { "Content-Type": "application/json" },
		});
	}
}
