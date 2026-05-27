import type { AgentCardDiff } from "./types.js";
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
    postComment?: (args: {
        token: string;
        repo: string;
        issueNumber: number;
        body: string;
    }) => Promise<void>;
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
export declare function run(env: RunnerEnv): Promise<RunnerResult>;
