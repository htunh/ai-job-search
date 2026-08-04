---
name: jobsdb-search
version: 1.0.0
description: >
  Use this skill to search live job listings on JobsDB Thailand (th.jobsdb.com)
  — Thailand's largest job board — or to look up a specific posting. Covers Bangkok
  and other Thai cities, plus remote roles. Trigger phrases: JobsDB Thailand jobs,
  หางาน JobsDB, งาน Bangkok software engineer, Thailand job board search, remote
  jobs Thailand, developer jobs Bangkok, full stack engineer Thailand, frontend
  jobs JobsDB, look up this JobsDB posting.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/jobsdb-search/cli/src/cli.ts *)
---

# JobsDB Thailand Search Skill

Search live job listings from **[JobsDB Thailand](https://th.jobsdb.com)** — the
country's largest job board (part of SEEK). No authentication, no API key, and
**zero runtime dependencies** — it runs with just `bun`.

> This skill queries JobsDB's public JSON search API and parses job detail pages
> for full descriptions. It is scoped to the Thailand market (`siteKey=TH-TH`).

## ⚠️ Personal use only

JobsDB's `robots.txt` disallows `/api/jobsearch/` and `*/job/` for automated
access. Use this skill for your own job search with **low request volume** — do
not use it commercially or for bulk data collection. You are responsible for
compliance with JobsDB/SEEK's terms of service.

## When to use this skill

- Search for software / tech / engineering roles in Bangkok or other Thai cities
- Find remote-eligible roles posted on JobsDB (`-l "Remote"` or `--remote remote`)
- Look up a specific JobsDB posting by ID or URL for the full job description

## Commands

### Search job listings

```bash
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search [-q "<keywords>"] [-l "<location>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (job title, skill, or role).
- `--location <text>` / `-l <text>` — location filter, e.g. `Bangkok`, `Remote`.
- `--jobage <days>` — posted within N days (maps to `dateRange`: 1, 3, 7, 14, 30).
- `--remote <mode>` — `remote` | `hybrid` | `onsite`. Filter by workplace type.
- `--page <n>` — 1-indexed page. Default 1.
- `--limit <n>` / `-n <n>` — cap results emitted (client-side).
- `--format json|table|plain` — default `json`.

Search results include a short description (teaser + bullet points). For the
full job description, use the `detail` command.

### Fetch full job detail

```bash
bun run .agents/skills/jobsdb-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric ID from a `search` result. You may also pass a full
`https://th.jobsdb.com/th/job/{id}` URL.

## Usage examples

```bash
# Software engineer roles in Bangkok, last 14 days
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "software engineer" -l "Bangkok" --jobage 14 --format table

# Full-stack roles, hybrid only
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "full stack" -l "Bangkok" --remote hybrid --limit 10 --format table

# Remote tech roles
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "developer" -l "Remote" --remote remote --jobage 7 --format table

# Frontend / React roles
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "react developer" -l "Bangkok" --jobage 14 --format table

# Full details for a specific job
bun run .agents/skills/jobsdb-search/cli/src/cli.ts detail 93650946 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use; includes short description per hit |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each
result carries at least `id`, `title`, `company`, `location`, `date`, `url`
(missing values are `null`). All errors are written to **stderr** as
`{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data is from JobsDB Thailand's public search API — no credentials required.
- `id` in search results is a numeric string — pass it as-is to `detail`.
- `date` is the `listingDate` ISO timestamp from the API.
- For English-first employers, prefer listings with English titles/descriptions;
  many Thai-local postings require Thai language skills.
- See `url-reference.md` for endpoint documentation and parsing anchors.
