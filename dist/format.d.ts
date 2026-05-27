import type { AgentCardDiff } from "./types.js";
/** Render the diff as a GitHub-flavored Markdown summary. */
export declare function toMarkdown(diff: AgentCardDiff): string;
/** One-line summary suitable for CI logs. */
export declare function toSummary(diff: AgentCardDiff): string;
