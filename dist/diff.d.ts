import { type AgentCard, type AgentCardDiff, type DiffOptions } from "./types.js";
/** Diff two AgentCards; classify each change and flag whether the overall set is breaking. */
export declare function diffAgentCards(previous: AgentCard, next: AgentCard, _opts?: DiffOptions): AgentCardDiff;
