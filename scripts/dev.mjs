#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUN_CMD = (() => {
	if (process.env.BUN_BIN && existsSync(process.env.BUN_BIN)) {
		return process.env.BUN_BIN;
	}
	const npmExec = process.env.npm_execpath;
	if (npmExec?.toLowerCase().includes("bun")) {
		return npmExec;
	}
	if (process.env.BUN_INSTALL) {
		const candidate = path.join(
			process.env.BUN_INSTALL,
			"bin",
			process.platform === "win32" ? "bun.exe" : "bun",
		);
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return "bun";
})();

const scriptPath = fileURLToPath(import.meta.url);
const stateDir = path.join(process.cwd(), ".dev");
const statePath = path.join(stateDir, "dev-runner.json");
const logPath = path.join(stateDir, "dev-runner.log");

const rawArgs = process.argv.slice(2);
const daemonMode = rawArgs.includes("--_daemon");
const backgroundMode = rawArgs.includes("--bg");
const statusMode = rawArgs.includes("--status");
const stopMode = rawArgs.includes("--stop");

const isRemote = rawArgs.includes("--cloud-db");
const disableHotCache = rawArgs.includes("--no-hot-cache");
const skipAttemptWorker = rawArgs.includes("--no-attempt-worker");
const skipUi = rawArgs.includes("--no-ui");
const buildUi = rawArgs.includes("--build-ui");
const skipUiBuild = rawArgs.includes("--skip-ui-build");

const children = new Map();
let shuttingDown = false;

const printSync = (message) => {
	writeSync(1, `${message}\n`);
};

const ensureStateDir = () => {
	mkdirSync(stateDir, { recursive: true });
};

const readState = () => {
	if (!existsSync(statePath)) {
		return null;
	}
	try {
		return JSON.parse(readFileSync(statePath, "utf8"));
	} catch {
		return null;
	}
};

const removeState = () => {
	if (!existsSync(statePath)) {
		return;
	}
	try {
		unlinkSync(statePath);
	} catch {
		// ignore stale state cleanup errors
	}
};

const isPidRunning = (pid) => {
	if (typeof pid !== "number" || Number.isNaN(pid)) {
		return false;
	}
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

const readLiveState = () => {
	const state = readState();
	if (!state) {
		return null;
	}
	if (!isPidRunning(state.pid)) {
		removeState();
		return null;
	}
	return state;
};

const writeState = (state) => {
	ensureStateDir();
	writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
};

const killTree = async (pid) =>
	new Promise((resolve, reject) => {
		if (process.platform === "win32") {
			const child = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
				stdio: "ignore",
			});
			child.on("error", reject);
			child.on("exit", (code) => {
				if (code === 0 || code === 128) {
					resolve();
					return;
				}
				reject(new Error(`taskkill 退出码 ${code ?? 1}`));
			});
			return;
		}
		try {
			process.kill(-pid, "SIGTERM");
			resolve();
		} catch {
			try {
				process.kill(pid, "SIGTERM");
				resolve();
			} catch (error) {
				reject(error);
			}
		}
	});

const shutdown = (code = 0) => {
	if (shuttingDown) {
		return;
	}
	shuttingDown = true;
	for (const child of children.values()) {
		if (!child.killed) {
			child.kill("SIGINT");
		}
	}
	if (daemonMode) {
		removeState();
	}
	process.exit(code);
};

const runOnce = (command, args, name) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: "inherit" });
		child.on("error", (error) => {
			if (error.code === "ENOENT") {
				reject(
					new Error(
						"未找到 Bun，请确认已安装并配置 PATH，或设置 BUN_BIN 指向 bun 可执行文件。",
					),
				);
				return;
			}
			reject(new Error(`执行 ${name} 失败: ${error.message}`));
		});
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`执行 ${name} 失败，退出码 ${code ?? 1}`));
		});
	});

const runBunScript = (name, args) =>
	runOnce(BUN_CMD, ["run", name, ...args], name);

const prepareConfigs = async () => {
	if (isRemote) {
		await runBunScript("prepare:remote-config", ["--", "--only", "worker"]);
		if (!skipAttemptWorker) {
			await runBunScript("prepare:remote-config", [
				"--",
				"--only",
				"attempt-worker",
			]);
		}
	}
	if (disableHotCache) {
		const baseArgs = isRemote ? ["--", "--remote"] : ["--"];
		await runBunScript("prepare:no-hot-cache-config", [
			...baseArgs,
			"--only",
			"worker",
		]);
		if (!skipAttemptWorker) {
			await runBunScript("prepare:no-hot-cache-config", [
				...baseArgs,
				"--only",
				"attempt-worker",
			]);
		}
	}
};

const prepareUiBuild = async () => {
	if (!buildUi || skipUiBuild) {
		return;
	}
	await runBunScript("build:ui", []);
};

const buildCommands = () => {
	const commands = [];
	if (!skipAttemptWorker) {
		commands.push({
			name: "attempt-worker",
			cmd: BUN_CMD,
			args: ["--cwd", "apps/attempt-worker", isRemote ? "dev:remote" : "dev"],
		});
	}
	commands.push({
		name: "worker",
		cmd: BUN_CMD,
		args: [
			"--cwd",
			"apps/worker",
			isRemote
				? disableHotCache
					? "dev:remote:no-hot-cache"
					: "dev:remote"
				: disableHotCache
					? "dev:no-hot-cache"
					: "dev",
		],
	});
	if (!skipUi) {
		commands.push({
			name: "ui",
			cmd: BUN_CMD,
			args: ["--filter", "api-worker-ui", "dev", "--", "--port", "4173"],
		});
	}
	return commands;
};

const startLongRunningCommands = (commands) => {
	for (const command of commands) {
		const child = spawn(command.cmd, command.args, { stdio: "inherit" });
		children.set(command.name, child);
		child.on("error", (error) => {
			if (error.code === "ENOENT") {
				console.error(
					"❌ 未找到 Bun，请确认已安装并配置 PATH，或设置 BUN_BIN 指向 bun 可执行文件。",
				);
				shutdown(1);
				return;
			}
			console.error(`❌ 启动 ${command.name} 失败: ${error.message}`);
			shutdown(1);
		});
		child.on("exit", (code) => {
			if (shuttingDown) {
				return;
			}
			if (code && code !== 0) {
				shutdown(code);
				return;
			}
			const allExited = Array.from(children.values()).every(
				(item) => item.exitCode !== null,
			);
			if (allExited) {
				shutdown(0);
			}
		});
	}
};

const printStatus = () => {
	const state = readLiveState();
	if (!state) {
		console.log("ℹ️ 后台 dev 未运行。");
		console.log(`日志文件: ${logPath}`);
		return;
	}
	console.log("✅ 后台 dev 正在运行。");
	console.log(`PID: ${state.pid}`);
	console.log(`启动时间: ${state.startedAt}`);
	console.log(`参数: ${state.args.join(" ") || "(无)"}`);
	console.log(`日志文件: ${state.logPath}`);
};

const stopBackground = async () => {
	const state = readLiveState();
	if (!state) {
		console.log("ℹ️ 后台 dev 未运行，无需停止。");
		return;
	}
	await killTree(state.pid);
	removeState();
	console.log(`✅ 已停止后台 dev（PID ${state.pid}）。`);
};

const startBackground = () => {
	const current = readLiveState();
	if (current) {
		printSync(`ℹ️ 后台 dev 已在运行（PID ${current.pid}）。`);
		printSync(`日志文件: ${current.logPath}`);
		return;
	}

	ensureStateDir();
	const cleanArgs = rawArgs.filter(
		(arg) => arg !== "--bg" && arg !== "--_daemon",
	);
	const stdoutFd = openSync(logPath, "a");
	const stderrFd = openSync(logPath, "a");
	const child = spawn(
		process.execPath,
		[scriptPath, ...cleanArgs, "--_daemon"],
		{
			detached: true,
			stdio: ["ignore", stdoutFd, stderrFd],
			windowsHide: true,
			cwd: process.cwd(),
			env: process.env,
		},
	);
	closeSync(stdoutFd);
	closeSync(stderrFd);
	child.unref();

	writeState({
		pid: child.pid,
		args: cleanArgs,
		startedAt: new Date().toISOString(),
		logPath,
	});
	printSync(`✅ 已后台启动 dev（PID ${child.pid}）。`);
	printSync(`日志文件: ${logPath}`);
	printSync(`查看状态: bun run dev -- --status`);
	printSync(`停止服务: bun run dev -- --stop`);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => {
	if (daemonMode) {
		removeState();
	}
});

const main = async () => {
	const actionCount = [backgroundMode, statusMode, stopMode].filter(
		Boolean,
	).length;
	if (actionCount > 1) {
		throw new Error("--bg / --status / --stop 只能三选一");
	}

	if (statusMode) {
		printStatus();
		return;
	}

	if (stopMode) {
		await stopBackground();
		return;
	}

	if (backgroundMode && !daemonMode) {
		startBackground();
		return;
	}

	if (daemonMode) {
		writeState({
			pid: process.pid,
			args: rawArgs.filter((arg) => arg !== "--_daemon"),
			startedAt: new Date().toISOString(),
			logPath,
		});
	}

	await prepareUiBuild();
	await prepareConfigs();
	const commands = buildCommands();
	startLongRunningCommands(commands);
};

main().catch((error) => {
	console.error(`❌ 启动前准备失败: ${error.message}`);
	process.exit(1);
});
