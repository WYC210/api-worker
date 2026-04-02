#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = {
	worker: {
		localSource: "apps/worker/wrangler.toml",
		remoteSource: "apps/worker/.wrangler.remote.toml",
		localOutput: "apps/worker/.wrangler.local.no-hot-cache.toml",
		remoteOutput: "apps/worker/.wrangler.remote.no-hot-cache.toml",
	},
	"attempt-worker": {
		localSource: "apps/attempt-worker/wrangler.toml",
		remoteSource: "apps/attempt-worker/.wrangler.remote.toml",
		localOutput: "apps/attempt-worker/.wrangler.local.no-hot-cache.toml",
		remoteOutput: "apps/attempt-worker/.wrangler.remote.no-hot-cache.toml",
	},
};

const parseArgs = () => {
	const args = process.argv.slice(2);
	let only = "all";
	let remote = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--only") {
			const value = args[index + 1];
			if (value) {
				only = value;
				index += 1;
			}
			continue;
		}
		if (arg === "--remote") {
			remote = true;
		}
	}

	let selectedTargets;
	if (only === "all") {
		selectedTargets = ["worker", "attempt-worker"];
	} else if (only === "worker" || only === "attempt-worker") {
		selectedTargets = [only];
	} else {
		throw new Error("--only 仅支持 worker / attempt-worker / all");
	}

	return { selectedTargets, remote };
};

const resolvePath = (relativePath) => path.join(ROOT, relativePath);

const stripKvNamespacesBlock = (source) => {
	const lines = source.split(/\r?\n/u);
	const output = [];
	let skipping = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!skipping && trimmed === "[[kv_namespaces]]") {
			skipping = true;
			continue;
		}
		if (skipping) {
			if (trimmed.startsWith("[")) {
				skipping = false;
				output.push(line);
			}
			continue;
		}
		output.push(line);
	}

	return `${output.join("\n").replace(/\n+$/u, "")}\n`;
};

const main = async () => {
	const { selectedTargets, remote } = parseArgs();

	for (const target of selectedTargets) {
		const config = TARGETS[target];
		const sourceRelativePath = remote
			? config.remoteSource
			: config.localSource;
		const outputRelativePath = remote
			? config.remoteOutput
			: config.localOutput;
		const sourcePath = resolvePath(sourceRelativePath);
		const outputPath = resolvePath(outputRelativePath);

		let sourceText = "";
		try {
			sourceText = await readFile(sourcePath, "utf8");
		} catch (error) {
			if (remote) {
				throw new Error(
					`未找到 ${sourceRelativePath}，请先运行 prepare:remote-config`,
				);
			}
			throw error;
		}

		const noHotConfig = stripKvNamespacesBlock(sourceText);
		await writeFile(outputPath, noHotConfig, "utf8");
		console.log(`✅ 已生成 ${outputRelativePath}`);
	}
};

main().catch((error) => {
	console.error(`❌ no-hot 配置生成失败: ${error.message}`);
	process.exit(1);
});
