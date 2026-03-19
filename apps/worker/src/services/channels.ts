import { extractModels } from "./channel-models";
import type { ChannelRecord } from "./channel-types";
import { createWeightedOrderIndicesViaWasm } from "../wasm/core";

export type { ModelEntry } from "./channel-models";
export type { ChannelRecord } from "./channel-types";
export { extractModels };

/**
 * Returns channels in a weighted random order.
 */
export function createWeightedOrder(
	channels: ChannelRecord[],
): ChannelRecord[] {
	const pool = channels.map((channel) => ({
		...channel,
		weight: Math.max(1, Number(channel.weight) || 1),
	}));
	const wasmOrder = createWeightedOrderIndicesViaWasm(
		pool.map((channel) => channel.weight),
	);
	if (!wasmOrder || wasmOrder.length !== pool.length) {
		throw new Error("Invalid weighted order from wasm");
	}
	const mapped = wasmOrder
		.map((index) => pool[index])
		.filter((item): item is ChannelRecord & { weight: number } => Boolean(item));
	if (mapped.length !== pool.length) {
		throw new Error("Weighted order index out of range");
	}
	return mapped;
}
