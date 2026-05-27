# agent-card-diff-action

[![CI](https://github.com/mizcausevic-dev/agent-card-diff-action/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/agent-card-diff-action/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)

GitHub Action that **gates PRs touching an A2A AgentCard**. Retrieves the previous version of the card via `git show <base.sha>:<card-path>`, diffs against HEAD via [`agent-card-diff`](https://github.com/mizcausevic-dev/agent-card-diff), posts the structured diff as a PR comment, and **fails the build on breaking changes**.

**First in the per-protocol diff Action quintet** (agent-card / mcp-tool-card / prompt-provenance / evidence-bundle / otel-genai).

Part of the [Kinetic Gain Suite](https://suite.kineticgain.com/).

---

## Usage

```yaml
name: AgentCard gate
on:
  pull_request:
    paths: ["agents/**/*.json"]

jobs:
  agent-card-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # needed so the Action can `git show base.sha:path`
      - uses: mizcausevic-dev/agent-card-diff-action@v0.1-shipped
        with:
          card-path: agents/my-agent.json
          fail-on-breaking: true
```

> **Important:** Your `checkout` step must use `fetch-depth: 0` so the Action can resolve the base SHA. Otherwise the previous version retrieval returns null and the diff is reported as "new card".

## Inputs

| input               | required | default       | description |
|---|---|---|---|
| `card-path`         | ✓        | —             | Path (relative to repo root) to the AgentCard JSON file being changed. |
| `base-sha`          |          | `pull_request.base.sha` | Override the base SHA. |
| `comment-on-pr`     |          | `auto`        | `auto` posts only on `pull_request` events. |
| `fail-on-breaking`  |          | `true`        | Fail when the diff is BREAKING. |
| `fail-on-any-change`|          | `false`       | Fail on ANY diff (frozen-card workflow). |
| `github-token`      |          | `${{ github.token }}` | Token used to post the PR comment. |

## Outputs

| output         | description |
|---|---|
| `breaking`     | `true` iff the diff is BREAKING. |
| `change-count` | Number of changes detected. |
| `new-card`     | `true` iff the file didn't exist at base SHA (newly added card). |

## What it detects

Same change reasons as [`agent-card-diff`](https://github.com/mizcausevic-dev/agent-card-diff) — breaking reasons include `autonomy-level-elevated`, `memory-persistence-elevated`, `tool-side-effects-elevated`, `incident-response-uri-removed`, `refusal-category-removed`, and more.

## How it handles edge cases

- **New card** (file didn't exist at base SHA) → no diff, exits 0, sets `new-card=true`.
- **Malformed previous version** → warns and treats as new card.
- **Card-path doesn't exist on disk** → exits 1 with a clear error.
- **Non-PR context** (push, manual dispatch) → skips PR comment; still emits diff to logs.

## Composes with

- [**`agent-card-diff`**](https://github.com/mizcausevic-dev/agent-card-diff) — the library this wraps.
- [**`agent-card-fleet-summary-action`**](https://github.com/mizcausevic-dev/agent-card-fleet-summary-action) — fleet-level companion (one card vs. fleet across all cards).
- [**`agent-card-stamp`**](https://github.com/mizcausevic-dev/agent-card-stamp) · [**`agent-card-readme-generator`**](https://github.com/mizcausevic-dev/agent-card-readme-generator) — full A2A tool family.
- Sibling diff actions (forthcoming): mcp-tool-card-diff-action · prompt-provenance-diff-action · evidence-bundle-diff-action · otel-genai-diff-action.

## License

[AGPL-3.0-or-later](LICENSE)
