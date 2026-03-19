import { safeJsonParse } from "../utils/json";
import {
	adaptChatJsonViaWasm,
	adaptSseLineViaWasm,
	geminiUsageTokensViaWasm,
	mapFinishReasonViaWasm,
} from "../wasm/core";
import type { ProviderType } from "./provider-transform";

type AdaptOptions = {
	response: Response;
	upstreamProvider: ProviderType;
	downstreamProvider: ProviderType;
	model: string | null;
	isStream: boolean;
};

type AdapterFn = (options: AdaptOptions) => Promise<Response>;

function mapOpenAiFinishReasonToAnthropic(
	reason: unknown,
): "end_turn" | "max_tokens" | "tool_use" | "stop_sequence" | null {
	const mapped = mapFinishReasonViaWasm("openai_to_anthropic", reason);
	return mapped === "end_turn" ||
		mapped === "max_tokens" ||
		mapped === "tool_use" ||
		mapped === "stop_sequence"
		? mapped
		: null;
}

function mapAnthropicStopReasonToOpenAi(
	reason: unknown,
): "stop" | "length" | "tool_calls" | "stop_sequence" | null {
	const mapped = mapFinishReasonViaWasm("anthropic_to_openai", reason);
	return mapped === "stop" ||
		mapped === "length" ||
		mapped === "tool_calls" ||
		mapped === "stop_sequence"
		? mapped
		: null;
}

function openAiContentToText(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}
	if (!Array.isArray(content)) {
		return "";
	}
	return content
		.map((part) => {
			if (typeof part === "string") {
				return part;
			}
			if (part && typeof part === "object") {
				const record = part as Record<string, unknown>;
				if (typeof record.text === "string") {
					return record.text;
				}
			}
			return "";
		})
		.join("");
}

function anthropicContentToText(content: unknown): string {
	if (!Array.isArray(content)) {
		return "";
	}
	return content
		.map((part) => {
			if (!part || typeof part !== "object") {
				return "";
			}
			const record = part as Record<string, unknown>;
			if (record.type === "text" && typeof record.text === "string") {
				return record.text;
			}
			return "";
		})
		.join("");
}

function geminiCandidateText(payload: Record<string, unknown>): string {
	const candidates = Array.isArray(payload.candidates)
		? (payload.candidates as Record<string, unknown>[])
		: [];
	const firstCandidate = candidates[0] ?? {};
	const content =
		firstCandidate.content && typeof firstCandidate.content === "object"
			? (firstCandidate.content as Record<string, unknown>)
			: {};
	const parts = Array.isArray(content.parts)
		? (content.parts as Record<string, unknown>[])
		: [];
	return parts
		.map((part) => (typeof part.text === "string" ? part.text : ""))
		.join("");
}

function geminiFinishReason(payload: Record<string, unknown>): string | null {
	const candidates = Array.isArray(payload.candidates)
		? (payload.candidates as Record<string, unknown>[])
		: [];
	const firstCandidate = candidates[0] ?? {};
	return typeof firstCandidate.finishReason === "string"
		? firstCandidate.finishReason
		: null;
}

function geminiUsageTokens(payload: Record<string, unknown>): {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
} {
	const usage = geminiUsageTokensViaWasm(payload);
	return usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function mapGeminiFinishReasonToOpenAi(
	reason: unknown,
): "stop" | "length" | "tool_calls" | "stop_sequence" | null {
	const mapped = mapFinishReasonViaWasm("gemini_to_openai", reason);
	return mapped === "stop" ||
		mapped === "length" ||
		mapped === "tool_calls" ||
		mapped === "stop_sequence"
		? mapped
		: null;
}

function mapGeminiFinishReasonToAnthropic(
	reason: unknown,
): "end_turn" | "max_tokens" | "tool_use" | "stop_sequence" | null {
	const mapped = mapFinishReasonViaWasm("gemini_to_anthropic", reason);
	return mapped === "end_turn" ||
		mapped === "max_tokens" ||
		mapped === "tool_use" ||
		mapped === "stop_sequence"
		? mapped
		: null;
}

function mapOpenAiFinishReasonToGemini(
	reason: unknown,
): "STOP" | "MAX_TOKENS" | "STOP_SEQUENCE" | "TOOL_CALL" | null {
	const mapped = mapFinishReasonViaWasm("openai_to_gemini", reason);
	return mapped === "STOP" ||
		mapped === "MAX_TOKENS" ||
		mapped === "STOP_SEQUENCE" ||
		mapped === "TOOL_CALL"
		? mapped
		: null;
}

function mapAnthropicStopReasonToGemini(
	reason: unknown,
): "STOP" | "MAX_TOKENS" | "STOP_SEQUENCE" | "TOOL_CALL" | null {
	const mapped = mapFinishReasonViaWasm("anthropic_to_gemini", reason);
	return mapped === "STOP" ||
		mapped === "MAX_TOKENS" ||
		mapped === "STOP_SEQUENCE" ||
		mapped === "TOOL_CALL"
		? mapped
		: null;
}

function extractOpenAiDeltaText(delta: unknown): string {
	if (!delta || typeof delta !== "object") {
		return "";
	}
	const record = delta as Record<string, unknown>;
	return openAiContentToText(record.content);
}

function writeSseEvent(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	event: string,
	data: Record<string, unknown>,
): void {
	controller.enqueue(encoder.encode(`event: ${event}\n`));
	controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

function writeOpenAiSseChunk(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	data: Record<string, unknown>,
): void {
	controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

function parseJsonFromStreamLine(line: string): Record<string, unknown> | null {
	const trimmed = line.trim();
	if (!trimmed) {
		return null;
	}
	const payload = trimmed.startsWith("data:")
		? trimmed.slice(5).trim()
		: trimmed;
	if (!payload || payload === "[DONE]") {
		return null;
	}
	return safeJsonParse<Record<string, unknown> | null>(payload, null);
}

function writeGeminiChunk(
	controller: ReadableStreamDefaultController<Uint8Array>,
	encoder: TextEncoder,
	data: Record<string, unknown>,
): void {
	controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
}

async function adaptOpenAiJsonToAnthropic(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid OpenAI JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"openai_to_anthropic",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: openai_to_anthropic");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

function adaptOpenAiSseToAnthropic(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const messageId = `msg_${Date.now()}`;
	let buffer = "";
	let started = false;
	let stopped = false;
	let outputTokens = 0;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex).trim();
						buffer = buffer.slice(newlineIndex + 1);
						if (!line.startsWith("data:")) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const payload = line.slice(5).trim();
						if (!payload) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (payload === "[DONE]") {
							break;
						}
						const parsed = safeJsonParse<Record<string, unknown> | null>(
							payload,
							null,
						);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (!started) {
							started = true;
							writeSseEvent(controller, encoder, "message_start", {
								type: "message_start",
								message: {
									id: messageId,
									type: "message",
									role: "assistant",
									model: options.model ?? "",
									content: [],
									stop_reason: null,
									stop_sequence: null,
									usage: {
										input_tokens: 0,
										output_tokens: 0,
									},
								},
							});
							writeSseEvent(controller, encoder, "content_block_start", {
								type: "content_block_start",
								index: 0,
								content_block: { type: "text", text: "" },
							});
						}

						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"openai",
							"anthropic",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: openai_to_anthropic");
						}
						if (typeof wasmLine.outputTokens === "number") {
							outputTokens = wasmLine.outputTokens;
						}
						const deltaText = typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (deltaText) {
							writeSseEvent(controller, encoder, "content_block_delta", {
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text: deltaText },
							});
						}

						const stopReason =
							typeof wasmLine.stopReason === "string" ? wasmLine.stopReason : null;
						if (stopReason && !stopped) {
							stopped = true;
							writeSseEvent(controller, encoder, "content_block_stop", {
								type: "content_block_stop",
								index: 0,
							});
							writeSseEvent(controller, encoder, "message_delta", {
								type: "message_delta",
								delta: { stop_reason: stopReason, stop_sequence: null },
								usage: { output_tokens: outputTokens },
							});
							writeSseEvent(controller, encoder, "message_stop", {
								type: "message_stop",
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (started && !stopped) {
					writeSseEvent(controller, encoder, "content_block_stop", {
						type: "content_block_stop",
						index: 0,
					});
					writeSseEvent(controller, encoder, "message_delta", {
						type: "message_delta",
						delta: { stop_reason: "end_turn", stop_sequence: null },
						usage: { output_tokens: outputTokens || 0 },
					});
					writeSseEvent(controller, encoder, "message_stop", {
						type: "message_stop",
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});

	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, {
		status: options.response.status,
		headers,
	});
}

async function adaptAnthropicJsonToOpenAi(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Anthropic JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"anthropic_to_openai",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: anthropic_to_openai");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

function adaptAnthropicSseToOpenAi(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const completionId = `chatcmpl_${Date.now()}`;
	const created = Math.floor(Date.now() / 1000);
	let buffer = "";
	let started = false;
	let stopSent = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const rawLine = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const line = rawLine.trim();
						if (!line.startsWith("data:")) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const payload = line.slice(5).trim();
						if (!payload || payload === "[DONE]") {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const parsed = safeJsonParse<Record<string, unknown> | null>(
							payload,
							null,
						);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"anthropic",
							"openai",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: anthropic_to_openai");
						}
						const eventType =
							typeof wasmLine.eventType === "string" ? wasmLine.eventType : "";
						if (!started && eventType === "message_start") {
							started = true;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: { role: "assistant" },
										finish_reason: null,
									},
								],
							});
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (eventType === "content_block_delta") {
							const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
							if (text) {
								writeOpenAiSseChunk(controller, encoder, {
									id: completionId,
									object: "chat.completion.chunk",
									created,
									model: options.model ?? "",
									choices: [
										{
											index: 0,
											delta: { content: text },
											finish_reason: null,
										},
									],
								});
							}
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (eventType === "message_delta" && !stopSent) {
							const finishReason =
								typeof wasmLine.finishReason === "string"
									? wasmLine.finishReason
									: null;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: {},
										finish_reason: finishReason,
									},
								],
							});
							stopSent = true;
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});

	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, {
		status: options.response.status,
		headers,
	});
}

async function adaptGeminiJsonToOpenAi(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Gemini JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"gemini_to_openai",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: gemini_to_openai");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

async function adaptGeminiJsonToAnthropic(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Gemini JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"gemini_to_anthropic",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: gemini_to_anthropic");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

async function adaptOpenAiJsonToGemini(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid OpenAI JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"openai_to_gemini",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: openai_to_gemini");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

async function adaptAnthropicJsonToGemini(
	options: AdaptOptions,
): Promise<Response> {
	const payload = (await options.response
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!payload) {
		throw new Error("Invalid Anthropic JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"anthropic_to_gemini",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: anthropic_to_gemini");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}

function adaptGeminiSseToOpenAi(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const completionId = `chatcmpl_${Date.now()}`;
	const created = Math.floor(Date.now() / 1000);
	let buffer = "";
	let started = false;
	let stopped = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"gemini",
							"openai",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: gemini_to_openai");
						}
						if (!started) {
							started = true;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: { role: "assistant" },
										finish_reason: null,
									},
								],
							});
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (text) {
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{ index: 0, delta: { content: text }, finish_reason: null },
								],
							});
						}
						const finishReason =
							typeof wasmLine.finishReason === "string"
								? wasmLine.finishReason
								: null;
						if (finishReason && !stopped) {
							stopped = true;
							writeOpenAiSseChunk(controller, encoder, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});

	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}

function adaptGeminiSseToAnthropic(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const messageId = `msg_${Date.now()}`;
	let buffer = "";
	let started = false;
	let stopped = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"gemini",
							"anthropic",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: gemini_to_anthropic");
						}
						if (!started) {
							started = true;
							writeSseEvent(controller, encoder, "message_start", {
								type: "message_start",
								message: {
									id: messageId,
									type: "message",
									role: "assistant",
									model: options.model ?? "",
									content: [],
									stop_reason: null,
									stop_sequence: null,
									usage: { input_tokens: 0, output_tokens: 0 },
								},
							});
							writeSseEvent(controller, encoder, "content_block_start", {
								type: "content_block_start",
								index: 0,
								content_block: { type: "text", text: "" },
							});
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (text) {
							writeSseEvent(controller, encoder, "content_block_delta", {
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text },
							});
						}
						const stopReason =
							typeof wasmLine.stopReason === "string" ? wasmLine.stopReason : null;
						if (stopReason && !stopped) {
							stopped = true;
							writeSseEvent(controller, encoder, "content_block_stop", {
								type: "content_block_stop",
								index: 0,
							});
							writeSseEvent(controller, encoder, "message_delta", {
								type: "message_delta",
								delta: { stop_reason: stopReason, stop_sequence: null },
								usage: {
									output_tokens:
										typeof wasmLine.outputTokens === "number"
											? wasmLine.outputTokens
											: 0,
								},
							});
							writeSseEvent(controller, encoder, "message_stop", {
								type: "message_stop",
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (started && !stopped) {
					writeSseEvent(controller, encoder, "content_block_stop", {
						type: "content_block_stop",
						index: 0,
					});
					writeSseEvent(controller, encoder, "message_delta", {
						type: "message_delta",
						delta: { stop_reason: "end_turn", stop_sequence: null },
						usage: { output_tokens: 0 },
					});
					writeSseEvent(controller, encoder, "message_stop", {
						type: "message_stop",
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});

	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}

function adaptOpenAiSseToGemini(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	let buffer = "";
	let lastFinishReason: string | null = null;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"openai",
							"gemini",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: openai_to_gemini");
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						const finishReason =
							typeof wasmLine.finishReason === "string"
								? wasmLine.finishReason
								: null;
						if (finishReason) {
							lastFinishReason = finishReason;
						}
						if (text || finishReason) {
							writeGeminiChunk(controller, encoder, {
								candidates: [
									{
										content: {
											role: "model",
											parts: text ? [{ text }] : [],
										},
										finishReason: finishReason ?? undefined,
									},
								],
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (!lastFinishReason) {
					writeGeminiChunk(controller, encoder, {
						candidates: [
							{ content: { role: "model", parts: [] }, finishReason: "STOP" },
						],
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}

function adaptAnthropicSseToGemini(options: AdaptOptions): Response {
	if (!options.response.body) {
		return options.response;
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	let buffer = "";
	let lastFinishReason: string | null = null;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"anthropic",
							"gemini",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: anthropic_to_gemini");
						}
						const eventType =
							typeof wasmLine.eventType === "string" ? wasmLine.eventType : "";
						if (eventType === "content_block_delta") {
							const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
							if (text) {
								writeGeminiChunk(controller, encoder, {
									candidates: [
										{
											content: { role: "model", parts: [{ text }] },
										},
									],
								});
							}
						}
						if (eventType === "message_delta") {
							lastFinishReason =
								(typeof wasmLine.finishReason === "string"
									? wasmLine.finishReason
									: null) ??
								lastFinishReason;
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				writeGeminiChunk(controller, encoder, {
					candidates: [
						{
							content: { role: "model", parts: [] },
							finishReason: lastFinishReason ?? "STOP",
						},
					],
				});
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}

const adapters: Record<string, AdapterFn> = {
	"openai->anthropic": async (options) => {
		if (options.isStream) {
			return adaptOpenAiSseToAnthropic(options);
		}
		return adaptOpenAiJsonToAnthropic(options);
	},
	"openai->gemini": async (options) => {
		if (options.isStream) {
			return adaptOpenAiSseToGemini(options);
		}
		return adaptOpenAiJsonToGemini(options);
	},
	"anthropic->openai": async (options) => {
		if (options.isStream) {
			return adaptAnthropicSseToOpenAi(options);
		}
		return adaptAnthropicJsonToOpenAi(options);
	},
	"anthropic->gemini": async (options) => {
		if (options.isStream) {
			return adaptAnthropicSseToGemini(options);
		}
		return adaptAnthropicJsonToGemini(options);
	},
	"gemini->openai": async (options) => {
		if (options.isStream) {
			return adaptGeminiSseToOpenAi(options);
		}
		return adaptGeminiJsonToOpenAi(options);
	},
	"gemini->anthropic": async (options) => {
		if (options.isStream) {
			return adaptGeminiSseToAnthropic(options);
		}
		return adaptGeminiJsonToAnthropic(options);
	},
};

export async function adaptChatResponse(
	options: AdaptOptions,
): Promise<Response> {
	if (options.upstreamProvider === options.downstreamProvider) {
		return options.response;
	}
	const key = `${options.upstreamProvider}->${options.downstreamProvider}`;
	const adapter = adapters[key];
	if (!adapter) {
		return options.response;
	}
	return adapter(options);
}
