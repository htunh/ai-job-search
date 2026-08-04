# /daily - Scrape Thailand + Remote Jobs, Then Rank

Run the full daily job-search pipeline: scrape new postings (Bangkok + remote worldwide), then batch-rank them.

## What this does

1. **Scrape** — Thailand (Bangkok) + remote worldwide across LinkedIn, FreeHire, and JobsDB (see `search-queries.md`)
2. **Rank** — Score all jobs with `status: new` in `seen_jobs.json` using the full fit framework

## Step 1: Run the scrape script

```bash
python3 scripts/daily_scrape.py
```

If `bun` is missing, fall back to the full `/scrape` skill workflow instead (agent-driven portal CLIs + WebSearch).

## Step 2: Rank new jobs

Immediately after scrape, run the **`/rank`** command workflow on all jobs with `status: new`.

Use the candidate profile and `04-job-evaluation.md` scoring rules. Apply the Thai-language hard filter and visa/sponsorship flags.

Present the ranked shortlist (top 5 by default) and ask which jobs to `/apply` to.

## Step 3: Summary

Report:
- How many new jobs were scraped (Thailand vs remote breakdown if possible)
- How many were ranked vs expired/unfetched
- Top 5 actionable shortlist with links
- Reminder: applications already in `job_search_tracker.csv` are excluded from scrape results

## Step 4: Write daily shortlist (for email / phone)

Write a phone-friendly summary to:

```
job_scraper/daily_shortlist_YYYY-MM-DD.md
```

Format (example):

```markdown
# Daily Job Shortlist — YYYY-MM-DD

Found X new jobs (Y ranked). Top 5:

1. **Score 86** — Role at Company (Bangkok) — https://...
2. ...
```

This file is **gitignored** (personal data). Do not commit it.

If `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` are set in the automation environment, run:

```bash
python3 scripts/email_daily_shortlist.py
```

## Git rules (automations — CRITICAL)

**Never commit or push personal job data to GitHub.** The fork may be public.

| File | Git? |
|------|------|
| `job_scraper/seen_jobs.json` | NO — local/cloud only |
| `job_scraper/daily_shortlist_*.md` | NO |
| `job_scraper/rank_*.json` | NO |
| `job_search_tracker.csv` | NO |
| `cv/main_*`, `cover_letters/cover_*` | NO |
| `documents/applications/**` | NO |
| `.claude/skills/job-application-assistant/01-candidate-profile.md` | NO (personal fork only) |

Automations must **not** run `git commit` or `git push`. Disable the "Open Pull Request" tool if offered.

Delivery options (pick one):

| Method | How |
|--------|-----|
| **Gmail** | Write `daily_shortlist_*.md`, run `email_daily_shortlist.py` (set App Password in automation secrets) |
| **Cursor web** | Read run output at cursor.com/automations |
| **Local pull** | Mac runs `/daily` manually; data never leaves your machine |

## Scheduling (optional)

To run this every day automatically, choose one:

| Method | How |
|--------|-----|
| **Cursor Automation** | Automations → daily cron. Prompt: "Run /daily — scrape, rank, write daily_shortlist markdown, email via scripts/email_daily_shortlist.py. Do NOT git commit or push." |
| **Cursor Loop** | `/loop 1d /daily` (fires while Cursor is open) |
| **macOS cron** | `0 9 * * * cd /path/to/ai-job-search && python3 scripts/daily_scrape.py` then open Cursor and run `/rank` |
| **Manual** | Each morning: type `/daily` in chat |
