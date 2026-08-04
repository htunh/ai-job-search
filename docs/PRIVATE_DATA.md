# Keeping personal job data off GitHub

Your fork may be **public**. Job state, CVs, tracker rows, and profile files are personal — keep them local or in email, not in git history.

## What stays private (gitignored)

- `job_scraper/seen_jobs.json` — all scraped/ranked jobs
- `job_scraper/daily_shortlist_*.md` — daily email summaries
- `job_scraper/rank_*.json` — rank artifacts
- `job_search_tracker.csv` — applications log
- `cv/main_*`, `cover_letters/cover_*` — tailored applications
- `documents/applications/**` — application archives

## Fix: stop tracking `seen_jobs.json`

If automation already committed this file, remove it from git (keeps your local copy):

```bash
git rm --cached job_scraper/seen_jobs.json
git commit -m "chore: stop tracking personal job state (gitignored)"
git push origin master
```

Old commits may still contain job data in history. For a public repo, assume that data was exposed; rotate if sensitive.

## Daily automation without git push

**Cursor Automation prompt (recommended):**

```
Run /daily — scrape Thailand + remote jobs, rank new postings, show top 5.

Then:
1. Write job_scraper/daily_shortlist_YYYY-MM-DD.md (phone-friendly top 5 with scores and URLs)
2. Run: python3 scripts/email_daily_shortlist.py
3. Do NOT git commit, git push, or open a PR

Never modify or commit: seen_jobs.json, job_search_tracker.csv, cv/, cover_letters/, documents/applications/
```

**Automation secrets** (Cursor automation env / secrets UI):

- `GMAIL_ADDRESS` — your Gmail
- `GMAIL_APP_PASSWORD` — [Google App Password](https://myaccount.google.com/apppasswords) (not your login password)

**Disable** the "Open Pull Request" tool on the automation.

## Pull upstream without losing personal files

```bash
# Save personal work
git stash push -u -m "personal" -- \
  job_scraper/seen_jobs.json \
  job_search_tracker.csv \
  .claude/skills/job-application-assistant/ \
  CLAUDE.md cv/ cover_letters/

git pull origin master
git stash pop
```

If stash pop conflicts on profile files, keep **your** version:

```bash
git checkout --ours .claude/skills/job-application-assistant/01-candidate-profile.md
# repeat for other conflicted personal files
```

## Gmail vs other options

| Option | Pros | Cons |
|--------|------|------|
| **Email shortlist** (`email_daily_shortlist.py`) | Inbox on phone, no public repo | Needs App Password in automation secrets |
| **cursor.com/automations** | No setup | Manual check each morning |
| **Local `/daily` on Mac** | Nothing leaves your machine | Mac must run it |

`/gmail-sync` reads application *replies* from Gmail; `email_daily_shortlist.py` *sends* the daily top-5 to you.
