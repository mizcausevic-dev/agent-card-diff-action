# Security Policy

`agent-card-diff-action` reads the AgentCard JSON file at the workflow's checkout HEAD, retrieves the previous version via `git show`, posts a single PR comment via the GitHub API (when run on a pull_request event with a valid token), and writes structured outputs. No remote fetch beyond the GitHub API comment call, no execution of user-supplied code.

The action uses `${{ github.token }}` by default — scoped to the repository where the workflow runs and never persisted. If you provide your own token via the `github-token` input, ensure it has only `pull-requests: write` permissions.

The `git show` invocation runs in a sub-shell with stdout-only piping; the previous file content is parsed as JSON without `eval` or `Function()`.

## Supported versions

Only the latest tagged release is supported.

## Reporting a vulnerability

Please use GitHub Security Advisories for private disclosure:

- [Open a security advisory](https://github.com/mizcausevic-dev/agent-card-diff-action/security/advisories/new)

Do not file public issues for security reports.
