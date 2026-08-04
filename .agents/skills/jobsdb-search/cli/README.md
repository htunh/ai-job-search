# jobsdb-cli

Search JobsDB Thailand (`th.jobsdb.com`) job listings via the public JSON search API and fetch full descriptions from job detail pages.

## Setup

```bash
bun install
```

## Usage

```bash
bun run src/cli.ts search -q "software engineer" -l "Bangkok" --jobage 14 --format table
bun run src/cli.ts detail 93650946 --format plain
```

## Personal use only

JobsDB's `robots.txt` disallows `/api/jobsearch/` and `*/job/`. Use this CLI for your own job search with low request volume.

## Tests

```bash
bun run test
bun run typecheck
```
