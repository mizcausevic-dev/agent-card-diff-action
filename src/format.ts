import type { AgentCardDiff, ChangeReason } from "./types.js";

const REASON_LABEL: Record<ChangeReason, string> = {
  "card-version-changed": "Card schema version changed",
  "agent-version-changed": "Agent version changed",
  "agent-name-changed": "Agent name changed",
  "agent-provider-changed": "Agent provider changed",
  "agent-description-changed": "Agent description changed",
  "primary-purpose-changed": "Primary purpose changed",
  "max-context-tokens-decreased": "Max context tokens decreased",
  "max-context-tokens-increased": "Max context tokens increased",
  "memory-persistence-escalated": "Memory persistence escalated",
  "memory-persistence-relaxed": "Memory persistence relaxed",
  "autonomy-escalated": "Autonomy level escalated",
  "autonomy-relaxed": "Autonomy level relaxed",
  "model-added": "Model added",
  "model-removed": "Model removed",
  "tool-added": "Tool added",
  "tool-removed": "Tool removed",
  "refusal-category-added": "Refusal category added",
  "refusal-category-removed": "Refusal category removed",
  "evaluation-added": "Evaluation added",
  "evaluation-removed": "Evaluation removed",
  "deployment-changed": "Deployment metadata changed",
  "incident-response-uri-removed": "Incident response URI removed",
  "incident-response-uri-added": "Incident response URI added"
};

/** Render the diff as a GitHub-flavored Markdown summary. */
export function toMarkdown(diff: AgentCardDiff): string {
  if (diff.changes.length === 0) {
    return `**No changes.** Agent cards are equivalent.`;
  }
  const lines: string[] = [];
  lines.push(diff.breaking ? `## Agent card diff (**BREAKING**)` : `## Agent card diff`);
  lines.push(``);
  lines.push(`| change | detail |`);
  lines.push(`|---|---|`);
  for (const c of diff.changes) {
    const label = REASON_LABEL[c.reason] ?? c.reason;
    lines.push(`| ${label} | ${c.detail ?? ""} |`);
  }
  return lines.join("\n");
}

/** One-line summary suitable for CI logs. */
export function toSummary(diff: AgentCardDiff): string {
  if (diff.changes.length === 0) return "no changes";
  const breaking = diff.breaking ? "BREAKING " : "";
  return `${breaking}${diff.changes.length} change${diff.changes.length === 1 ? "" : "s"}`;
}
