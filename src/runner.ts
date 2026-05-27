import { execSync } from "node:child_process";
import { readFileSync, appendFileSync, existsSync } from "node:fs";

import { diffAgentCards } from "./diff.js";
import { toMarkdown } from "./format.js";
import type { AgentCard, AgentCardDiff } from "./types.js";

export interface RunnerEnv {
  inputs: Record<string, string | undefined>;
  GITHUB_OUTPUT?: string;
  GITHUB_EVENT_NAME?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_EVENT_PATH?: string;
  /** Read a file from disk (current HEAD). Defaults to fs.readFileSync. */
  readFile?: (path: string) => string;
  /** Predicate: does this path exist on disk? Defaults to fs.existsSync. */
  exists?: (path: string) => boolean;
  /**
   * Retrieve a file at a given git commit. Returns the file content if the
   * file existed at that commit, or `null` if it didn't (newly added file).
   * Defaults to `git show <sha>:<path>` and treats non-zero exit as "missing".
   */
  gitShow?: (sha: string, path: string) => string | null;
  /** Stubbed PR-comment poster for tests. */
  postComment?: (args: { token: string; repo: string; issueNumber: number; body: string }) => Promise<void>;
  /** Output stream (defaults to process.stdout). */
  write?: (line: string) => void;
}

export interface RunnerResult {
  exitCode: 0 | 1;
  diff: AgentCardDiff | null;
  /** True when the card path didn't exist in the base SHA (newly added card). */
  newCard: boolean;
  commentPosted: boolean;
  reason?: string;
}

const NULL_DIFF: AgentCardDiff = {
  changes: [],
  breaking: false,
  added: { tools: [], models: [], refusalCategories: [], evaluations: [] },
  removed: { tools: [], models: [], refusalCategories: [], evaluations: [] }
};

function defaultGitShow(sha: string, path: string): string | null {
  try {
    return execSync(`git show ${sha}:${path}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

export async function run(env: RunnerEnv): Promise<RunnerResult> {
  const cardPath = required(env.inputs, "card_path");
  const baseShaInput = env.inputs.base_sha ?? "";
  const commentOnPr = env.inputs.comment_on_pr ?? "auto";
  const failOnBreaking = (env.inputs.fail_on_breaking ?? "true").toLowerCase() !== "false";
  const failOnAnyChange = (env.inputs.fail_on_any_change ?? "false").toLowerCase() === "true";
  const token = env.inputs.github_token ?? "";

  const read = env.readFile ?? ((p) => readFileSync(p, "utf8"));
  const exists = env.exists ?? ((p) => existsSync(p));
  const gitShow = env.gitShow ?? defaultGitShow;
  const write = env.write ?? ((line) => process.stdout.write(`${line}\n`));

  if (!exists(cardPath)) {
    write(`::error::card-path "${cardPath}" does not exist on disk.`);
    return { exitCode: 1, diff: null, newCard: false, commentPosted: false, reason: "card-path not found" };
  }

  // Resolve base SHA: explicit input wins, otherwise read from event payload.
  let baseSha = baseShaInput;
  if (!baseSha && env.GITHUB_EVENT_PATH && exists(env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(read(env.GITHUB_EVENT_PATH)) as { pull_request?: { base?: { sha?: string } } };
      baseSha = event.pull_request?.base?.sha ?? "";
    } catch {
      // ignore — fall through
    }
  }

  let prev: AgentCard | null = null;
  let prevRaw: string | null = null;
  if (baseSha) prevRaw = gitShow(baseSha, cardPath);
  if (prevRaw !== null) {
    try {
      prev = JSON.parse(prevRaw) as AgentCard;
    } catch (e) {
      write(`::warning::could not parse previous AgentCard at ${baseSha}:${cardPath} — treating as new card. (${(e as Error).message})`);
      prev = null;
    }
  }

  const nextRaw = read(cardPath);
  const next = JSON.parse(nextRaw) as AgentCard;

  const newCard = prev === null;
  const diff = newCard ? NULL_DIFF : diffAgentCards(prev as AgentCard, next);
  const markdown = newCard
    ? `_New AgentCard at \`${cardPath}\` — no previous version found at base SHA ${baseSha || "(no base SHA)"}._`
    : toMarkdown(diff);

  setOutput(env, "breaking", String(diff.breaking));
  setOutput(env, "change-count", String(diff.changes.length));
  setOutput(env, "new-card", String(newCard));

  write(`\n${markdown}\n`);

  // PR comment is posted whether we have a diff or a new-card notice.
  const isPullRequest = env.GITHUB_EVENT_NAME === "pull_request";
  const wantsComment = commentOnPr === "true" || (commentOnPr === "auto" && isPullRequest);
  let commentPosted = false;
  let reason: string | undefined;

  if (wantsComment) {
    if (!token) {
      reason = "no github-token provided";
    } else if (!env.GITHUB_EVENT_PATH) {
      reason = "no GITHUB_EVENT_PATH";
    } else if (!env.GITHUB_REPOSITORY) {
      reason = "no GITHUB_REPOSITORY";
    } else {
      const event = JSON.parse(read(env.GITHUB_EVENT_PATH)) as { number?: number; pull_request?: { number?: number } };
      const issueNumber = event.number ?? event.pull_request?.number;
      if (!issueNumber) {
        reason = "no PR number in event payload";
      } else {
        const body = `### AgentCard diff — \`${cardPath}\`\n\n${markdown}\n\n_Generated by [agent-card-diff-action](https://github.com/mizcausevic-dev/agent-card-diff-action)._`;
        const poster = env.postComment ?? defaultPostComment;
        await poster({ token, repo: env.GITHUB_REPOSITORY, issueNumber, body });
        commentPosted = true;
      }
    }
  }

  if (!newCard && failOnBreaking && diff.breaking) {
    write(`::error::AgentCard diff is BREAKING — ${diff.changes.length} change(s) detected.`);
    return { exitCode: 1, diff, newCard, commentPosted, reason };
  }
  if (!newCard && failOnAnyChange && diff.changes.length > 0) {
    write(`::error::AgentCard has ${diff.changes.length} change(s) and fail-on-any-change=true.`);
    return { exitCode: 1, diff, newCard, commentPosted, reason };
  }

  return { exitCode: 0, diff, newCard, commentPosted, reason };
}

function required(inputs: Record<string, string | undefined>, name: string): string {
  const v = inputs[name];
  if (!v || v.length === 0) throw new Error(`input "${name}" is required`);
  return v;
}

function setOutput(env: RunnerEnv, key: string, value: string): void {
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function defaultPostComment(args: { token: string; repo: string; issueNumber: number; body: string }): Promise<void> {
  const r = await fetch(`https://api.github.com/repos/${args.repo}/issues/${args.issueNumber}/comments`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${args.token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({ body: args.body })
  });
  if (!r.ok) throw new Error(`GitHub API comment failed: ${r.status} ${await r.text()}`);
}
