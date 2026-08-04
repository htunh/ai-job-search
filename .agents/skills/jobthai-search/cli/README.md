# jobthai-cli

Search [JobThai](https://www.jobthai.com) job listings from the command line.

## Setup

```bash
cd .agents/skills/jobthai-search/cli && bun install
```

## Usage

```bash
bun run src/cli.ts search -q "react" -l "Bangkok" --jobage 14 --format table
bun run src/cli.ts detail 1939404 --format plain
```

## Data source

Public GraphQL API at `https://api.jobthai.com/v1/graphql`. See `../url-reference.md` for field documentation.

## Tests

```bash
bun run test
bun run typecheck
```

Personal use only — keep request volume low.
