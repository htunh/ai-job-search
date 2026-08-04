---
name: jobthai-search
version: 1.0.0
description: >
  Use this skill to search live job listings on JobThai (jobthai.com) — Thailand's
  major Thai/English job board — or to look up a specific posting. Covers Bangkok
  and other Thai provinces. Trigger phrases: JobThai jobs, หางาน JobThai, งาน
  Bangkok software engineer, หางาน โปรแกรมเมอร์, Thailand job board search,
  developer jobs Bangkok, full stack engineer Thailand, frontend jobs JobThai,
  look up this JobThai posting.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/jobthai-search/cli/src/cli.ts *)
---

# JobThai Search Skill

Search live job listings from **[JobThai](https://www.jobthai.com)** — one of
Thailand's largest job boards (Thai and English). No authentication, no API key,
and **zero runtime dependencies** — it runs with just `bun`.

> This skill queries JobThai's public GraphQL API (`api.jobthai.com/v1/graphql`).
> It is scoped to the Thailand market.

## ⚠️ Personal use only

JobThai's listings are accessed via their public website API. Use this skill for
your own job search with **low request volume** — do not use it commercially or
for bulk data collection. You are responsible for compliance with JobThai's
terms of service.

## When to use this skill

- Search for software / tech / engineering roles in Bangkok or other Thai provinces
- Filter by IT category (`--jobtype 10`) or engineering (`--jobtype 7`)
- Find remote (`--remote remote`) or hybrid (`--remote hybrid`) roles
- Look up a specific JobThai posting by ID or URL for the full job description

## Commands

### Search job listings

```bash
bun run .agents/skills/jobthai-search/cli/src/cli.ts search [-q "<keywords>"] [-l "<location>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (job title, skill, or role).
- `--location <text>` / `-l <text>` — province filter: `Bangkok`, `01`, `Chiang Mai`, etc.
- `--jobage <days>` — client-side filter on `updatedAt` (API has no server-side recency param).
- `--remote <mode>` — `remote` (WFH) or `hybrid`.
- `--jobtype <id>` — category ID: `10` = IT/Computer, `7` = Engineering.
- `--lang <en|th>` — result language (default `en`).
- `--page <n>` — 1-indexed page (~20 results per page). Default 1.
- `--limit <n>` / `-n <n>` — cap results emitted (client-side).
- `--format json|table|plain` — default `json`.

Search results include title, company, location, date, and salary when available.
For the full job description, use the `detail` command.

### Fetch full job detail

```bash
bun run .agents/skills/jobthai-search/cli/src/cli.ts detail <id|url> [--format json|plain] [--lang en|th]
```

`id` is the numeric ID from a `search` result. You may also pass a full
`https://www.jobthai.com/en/job/{id}` URL.

## Usage examples

```bash
# React roles in Bangkok, last 14 days
bun run .agents/skills/jobthai-search/cli/src/cli.ts search -q "react" -l "Bangkok" --jobage 14 --format table

# IT category software engineer roles
bun run .agents/skills/jobthai-search/cli/src/cli.ts search -q "software engineer" -l "01" --jobtype 10 --format table

# Remote / WFH developer roles
bun run .agents/skills/jobthai-search/cli/src/cli.ts search -q "developer" --remote remote --jobage 7 --format table

# Thai-language search
bun run .agents/skills/jobthai-search/cli/src/cli.ts search -q "โปรแกรมเมอร์" -l "Bangkok" --lang th --format table

# Full details for a specific job
bun run .agents/skills/jobthai-search/cli/src/cli.ts detail 1939404 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each
result carries at least `id`, `title`, `company`, `location`, `date`, `url`
(missing values are `null`). All errors are written to **stderr** as
`{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data is from JobThai's public GraphQL API — no credentials required.
- `province` codes: `01` = Bangkok, `10` = Chiang Mai, `99` = Overseas.
- `--jobage` filters client-side on `updatedAt` after the API returns results.
- Many postings require Thai language; prioritize English-titled listings for foreign nationals.
- See `url-reference.md` for endpoint documentation and parsing anchors.
