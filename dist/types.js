// Diff two A2A Agent Cards. The schema lives at
// https://github.com/mizcausevic-dev/agent-cards-spec (agent-card.schema.json).
// We model the subset relevant to breaking-change classification.
/**
 * Breaking from a *consumer* point of view — these changes can invalidate the
 * trust assumptions a downstream operator made about the agent. Autonomy
 * escalation, memory escalation, tool/model removal, and removal of an
 * incident-response URI on an autonomous agent are the classic ones.
 */
export const BREAKING_REASONS = new Set([
    "autonomy-escalated",
    "memory-persistence-escalated",
    "tool-removed",
    "model-removed",
    "refusal-category-removed",
    "max-context-tokens-decreased",
    "incident-response-uri-removed"
]);
