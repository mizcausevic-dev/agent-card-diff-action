// Diff two A2A Agent Cards. The schema lives at
// https://github.com/mizcausevic-dev/agent-cards-spec (agent-card.schema.json).
// We model the subset relevant to breaking-change classification.

export type AutonomyLevel = "assistive" | "supervised" | "autonomous";
export type MemoryPersistence = "none" | "session" | "persistent";

export interface AgentMeta {
  id: string;
  name: string;
  version: string;
  provider: string;
  description: string;
  homepage?: string;
}

export interface ModelUse {
  model: string;
  role?: string;
  [key: string]: unknown;
}

export type SideEffectClass = "read" | "mutating" | "external" | "destructive";

export interface ToolUse {
  name: string;
  side_effects: SideEffectClass;
  mcp_tool_card_uri?: string;
  [key: string]: unknown;
}

export interface Capabilities {
  primary_purpose: string;
  models_used: ModelUse[];
  tools: ToolUse[];
  max_context_tokens: number;
  memory_persistence: MemoryPersistence;
  autonomy_level: AutonomyLevel;
  prompts_used?: string[];
}

export type RefusalBehavior =
  | "refuse_silently"
  | "refuse_and_explain"
  | "escalate_to_human"
  | "redirect_to_alternative";

export interface RefusalCategory {
  category: string;
  behavior: RefusalBehavior;
  example_prompts?: string[];
  [key: string]: unknown;
}

export interface Evaluation {
  suite: string;
  result_uri: string;
  ran_at: string;
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Deployment {
  environment?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SafetyPosture {
  incident_response_uri?: string;
  [key: string]: unknown;
}

export interface AgentCard {
  agent_card_version: string;
  agent: AgentMeta;
  capabilities: Capabilities;
  refusal_taxonomy?: RefusalCategory[];
  evaluations?: Evaluation[];
  deployment: Deployment;
  safety_posture: SafetyPosture;
}

export type ChangeReason =
  | "card-version-changed"
  | "agent-version-changed"
  | "agent-name-changed"
  | "agent-provider-changed"
  | "agent-description-changed"
  | "primary-purpose-changed"
  | "max-context-tokens-decreased"
  | "max-context-tokens-increased"
  | "memory-persistence-escalated"
  | "memory-persistence-relaxed"
  | "autonomy-escalated"
  | "autonomy-relaxed"
  | "model-added"
  | "model-removed"
  | "tool-added"
  | "tool-removed"
  | "refusal-category-added"
  | "refusal-category-removed"
  | "evaluation-added"
  | "evaluation-removed"
  | "deployment-changed"
  | "incident-response-uri-removed"
  | "incident-response-uri-added";

/**
 * Breaking from a *consumer* point of view — these changes can invalidate the
 * trust assumptions a downstream operator made about the agent. Autonomy
 * escalation, memory escalation, tool/model removal, and removal of an
 * incident-response URI on an autonomous agent are the classic ones.
 */
export const BREAKING_REASONS: ReadonlySet<ChangeReason> = new Set([
  "autonomy-escalated",
  "memory-persistence-escalated",
  "tool-removed",
  "model-removed",
  "refusal-category-removed",
  "max-context-tokens-decreased",
  "incident-response-uri-removed"
]);

export interface DiffEntry {
  reason: ChangeReason;
  detail?: string;
}

export interface AgentCardDiff {
  changes: DiffEntry[];
  breaking: boolean;
  added: { tools: string[]; models: string[]; refusalCategories: string[]; evaluations: string[] };
  removed: { tools: string[]; models: string[]; refusalCategories: string[]; evaluations: string[] };
}

export interface DiffOptions {
  /** Treat an *additional* required field on safety_posture as breaking. Default false. */
  strict?: boolean;
}
