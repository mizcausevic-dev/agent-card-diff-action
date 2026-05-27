import { BREAKING_REASONS } from "./types.js";
const AUTONOMY_RANK = {
    assistive: 0,
    supervised: 1,
    autonomous: 2
};
const MEMORY_RANK = {
    none: 0,
    session: 1,
    persistent: 2
};
/** Diff two AgentCards; classify each change and flag whether the overall set is breaking. */
export function diffAgentCards(previous, next, _opts = {}) {
    assertCard(previous, "previous");
    assertCard(next, "next");
    const changes = [];
    const push = (reason, detail) => {
        const entry = { reason };
        if (detail !== undefined)
            entry.detail = detail;
        changes.push(entry);
    };
    if (previous.agent_card_version !== next.agent_card_version) {
        push("card-version-changed", `${previous.agent_card_version} → ${next.agent_card_version}`);
    }
    if (previous.agent.version !== next.agent.version) {
        push("agent-version-changed", `${previous.agent.version} → ${next.agent.version}`);
    }
    if (previous.agent.name !== next.agent.name) {
        push("agent-name-changed", `${previous.agent.name} → ${next.agent.name}`);
    }
    if (previous.agent.provider !== next.agent.provider) {
        push("agent-provider-changed", `${previous.agent.provider} → ${next.agent.provider}`);
    }
    if (previous.agent.description !== next.agent.description) {
        push("agent-description-changed");
    }
    if (previous.capabilities.primary_purpose !== next.capabilities.primary_purpose) {
        push("primary-purpose-changed");
    }
    const ctxDelta = next.capabilities.max_context_tokens - previous.capabilities.max_context_tokens;
    if (ctxDelta < 0) {
        push("max-context-tokens-decreased", `${previous.capabilities.max_context_tokens} → ${next.capabilities.max_context_tokens}`);
    }
    else if (ctxDelta > 0) {
        push("max-context-tokens-increased", `${previous.capabilities.max_context_tokens} → ${next.capabilities.max_context_tokens}`);
    }
    const memDelta = MEMORY_RANK[next.capabilities.memory_persistence] - MEMORY_RANK[previous.capabilities.memory_persistence];
    if (memDelta > 0) {
        push("memory-persistence-escalated", `${previous.capabilities.memory_persistence} → ${next.capabilities.memory_persistence}`);
    }
    else if (memDelta < 0) {
        push("memory-persistence-relaxed", `${previous.capabilities.memory_persistence} → ${next.capabilities.memory_persistence}`);
    }
    const autDelta = AUTONOMY_RANK[next.capabilities.autonomy_level] - AUTONOMY_RANK[previous.capabilities.autonomy_level];
    if (autDelta > 0) {
        push("autonomy-escalated", `${previous.capabilities.autonomy_level} → ${next.capabilities.autonomy_level}`);
    }
    else if (autDelta < 0) {
        push("autonomy-relaxed", `${previous.capabilities.autonomy_level} → ${next.capabilities.autonomy_level}`);
    }
    const tools = diffNamedSet(previous.capabilities.tools, next.capabilities.tools, "name");
    for (const t of tools.added)
        push("tool-added", t);
    for (const t of tools.removed)
        push("tool-removed", t);
    const models = diffNamedSet(previous.capabilities.models_used, next.capabilities.models_used, "model");
    for (const m of models.added)
        push("model-added", m);
    for (const m of models.removed)
        push("model-removed", m);
    const refusals = diffNamedSet(previous.refusal_taxonomy ?? [], next.refusal_taxonomy ?? [], "category");
    for (const c of refusals.added)
        push("refusal-category-added", c);
    for (const c of refusals.removed)
        push("refusal-category-removed", c);
    const evals = diffNamedSet(previous.evaluations ?? [], next.evaluations ?? [], "suite");
    for (const e of evals.added)
        push("evaluation-added", e);
    for (const e of evals.removed)
        push("evaluation-removed", e);
    if (!shallowEqual(previous.deployment, next.deployment))
        push("deployment-changed");
    const prevUri = previous.safety_posture.incident_response_uri;
    const nextUri = next.safety_posture.incident_response_uri;
    if (prevUri && !nextUri)
        push("incident-response-uri-removed");
    if (!prevUri && nextUri)
        push("incident-response-uri-added", nextUri);
    const breaking = changes.some((c) => BREAKING_REASONS.has(c.reason));
    return {
        changes,
        breaking,
        added: {
            tools: tools.added,
            models: models.added,
            refusalCategories: refusals.added,
            evaluations: evals.added
        },
        removed: {
            tools: tools.removed,
            models: models.removed,
            refusalCategories: refusals.removed,
            evaluations: evals.removed
        }
    };
}
function diffNamedSet(prev, next, nameKey) {
    const prevNames = new Set(prev.map((x) => String(x[nameKey])));
    const nextNames = new Set(next.map((x) => String(x[nameKey])));
    const added = [...nextNames].filter((n) => !prevNames.has(n));
    const removed = [...prevNames].filter((n) => !nextNames.has(n));
    return { added: added.sort(), removed: removed.sort() };
}
function shallowEqual(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
        if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null))
            return false;
    }
    return true;
}
function assertCard(card, side) {
    if (!card || typeof card !== "object")
        throw new Error(`${side} must be an AgentCard object`);
    if (!card.agent || typeof card.agent !== "object")
        throw new Error(`${side}.agent is required`);
    if (!card.capabilities || typeof card.capabilities !== "object") {
        throw new Error(`${side}.capabilities is required`);
    }
    if (!card.deployment || !card.safety_posture) {
        throw new Error(`${side}.deployment and ${side}.safety_posture are required`);
    }
}
