#!/usr/bin/env python3
"""
Daily job scrape — Thailand (Bangkok) + remote worldwide.

Runs all enabled portal CLIs from search-queries.md, deduplicates against
seen_jobs.json and job_search_tracker.csv, and marks new jobs with quick fit.

Usage:
  python3 scripts/daily_scrape.py
  python3 scripts/daily_scrape.py --dry-run

After running, invoke /rank in Cursor to score new jobs (status: new).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEEN_FILE = ROOT / "job_scraper" / "seen_jobs.json"
TRACKER_FILE = ROOT / "job_search_tracker.csv"

CORE_SKILLS = [
    "react",
    "next.js",
    "nextjs",
    "typescript",
    "node",
    "nestjs",
    "full stack",
    "fullstack",
    "frontend",
    "backend",
    "javascript",
    "software engineer",
    "api",
]

# (cli_path_relative, argv_suffix_list)
SEARCHES: list[tuple[str, list[str]]] = [
    # --- Thailand / Bangkok ---
    (".agents/skills/linkedin-search/cli/src/cli.ts", ["search", "-q", "full stack engineer", "-l", "Bangkok, Thailand", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/linkedin-search/cli/src/cli.ts", ["search", "-q", "senior software engineer", "-l", "Bangkok, Thailand", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/linkedin-search/cli/src/cli.ts", ["search", "-q", "frontend engineer react", "-l", "Bangkok, Thailand", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/linkedin-search/cli/src/cli.ts", ["search", "-q", "node.js developer", "-l", "Bangkok, Thailand", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/freehire-search/cli/src/cli.ts", ["search", "-q", "full stack", "--country", "TH", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/freehire-search/cli/src/cli.ts", ["search", "-q", "react", "--country", "TH", "--category", "frontend", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/freehire-search/cli/src/cli.ts", ["search", "-q", "backend", "--country", "TH", "--category", "backend", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/jobsdb-search/cli/src/cli.ts", ["search", "-q", "software engineer", "-l", "Bangkok", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/jobsdb-search/cli/src/cli.ts", ["search", "-q", "full stack", "-l", "Bangkok", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/jobsdb-search/cli/src/cli.ts", ["search", "-q", "react developer", "-l", "Bangkok", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/jobsdb-search/cli/src/cli.ts", ["search", "-q", "frontend engineer", "-l", "Bangkok", "--jobage", "14", "--limit", "15", "--format", "json"]),
    # --- Remote worldwide ---
    (".agents/skills/linkedin-search/cli/src/cli.ts", ["search", "-q", "full stack engineer", "-l", "Remote", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/linkedin-search/cli/src/cli.ts", ["search", "-q", "senior frontend react", "-l", "Remote", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/linkedin-search/cli/src/cli.ts", ["search", "-q", "software engineer", "-l", "Remote", "--remote", "remote", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/freehire-search/cli/src/cli.ts", ["search", "-q", "full stack", "--remote", "remote", "--region", "global,apac", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/freehire-search/cli/src/cli.ts", ["search", "-q", "react", "--remote", "remote", "--category", "frontend", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/freehire-search/cli/src/cli.ts", ["search", "-q", "backend engineer", "--remote", "remote", "--category", "backend", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/jobsdb-search/cli/src/cli.ts", ["search", "-q", "software engineer", "-l", "Remote", "--remote", "remote", "--jobage", "14", "--limit", "15", "--format", "json"]),
    (".agents/skills/jobsdb-search/cli/src/cli.ts", ["search", "-q", "developer", "-l", "Remote", "--remote", "remote", "--jobage", "14", "--limit", "15", "--format", "json"]),
]


def portal_from_path(cli_path: str) -> str:
    parts = Path(cli_path).parts
    for i, p in enumerate(parts):
        if p == "skills" and i + 1 < len(parts):
            return parts[i + 1]
    return "unknown"


def load_seen() -> dict:
    if SEEN_FILE.exists():
        return json.loads(SEEN_FILE.read_text())
    return {"seen": {}}


def load_tracker_keys() -> set[str]:
    keys: set[str] = set()
    if not TRACKER_FILE.exists():
        return keys
    lines = TRACKER_FILE.read_text().strip().splitlines()
    if len(lines) < 2:
        return keys
    header = [h.strip() for h in lines[0].split(",")]
    try:
        ci = header.index("company")
        ri = header.index("role")
    except ValueError:
        return keys
    for line in lines[1:]:
        cols = line.split(",")
        if len(cols) > max(ci, ri):
            keys.add(f"{cols[ci].strip()}|{cols[ri].strip()}".lower())
    return keys


def quick_fit(title: str, desc: str = "") -> str:
    text = f"{title} {desc}".lower()
    hits = sum(1 for s in CORE_SKILLS if s in text)
    if hits >= 2 or any(x in text for x in ("full stack", "fullstack", "next.js", "nestjs", "react")):
        return "high"
    if hits >= 1:
        return "medium"
    return "low"


def run_cli(cli_rel: str, args: list[str]) -> tuple[list[dict], str | None]:
    cmd = ["bun", "run", str(ROOT / cli_rel), *args]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        if r.returncode != 0:
            return [], (r.stderr or r.stdout or "unknown error")[:200]
        data = json.loads(r.stdout)
        return data.get("results", []), None
    except json.JSONDecodeError as e:
        return [], f"JSON parse error: {e}"
    except Exception as e:
        return [], str(e)


def key_for(job: dict) -> str:
    url = job.get("url") or ""
    if url:
        return url
    return f"{job.get('company', '')}|{job.get('title', '')}".lower()


def main() -> int:
    parser = argparse.ArgumentParser(description="Daily Thailand + remote job scrape")
    parser.add_argument("--dry-run", action="store_true", help="Search only; do not write seen_jobs.json")
    args = parser.parse_args()

    today = date.today().isoformat()
    state = load_seen()
    seen = state.setdefault("seen", {})
    tracker_keys = load_tracker_keys()

    pool: dict[str, dict] = {}
    errors: list[tuple[str, str]] = []

    for cli_rel, search_args in SEARCHES:
        portal = portal_from_path(cli_rel)
        results, err = run_cli(cli_rel, search_args)
        if err:
            errors.append((portal, err))
            continue
        for r in results:
            k = key_for(r)
            if not k:
                continue
            if k not in pool:
                pool[k] = {**r, "portal": portal}

    new_jobs: list[dict] = []
    skipped_seen = 0
    skipped_tracker = 0

    for k, job in pool.items():
        company = (job.get("company") or "").strip()
        title = (job.get("title") or "").strip()
        tracker_key = f"{company}|{title}".lower()
        if tracker_key in tracker_keys:
            skipped_tracker += 1
            continue
        if k in seen:
            skipped_seen += 1
            continue
        fit = quick_fit(title, job.get("description") or "")
        entry = {
            "title": title,
            "company": company or None,
            "url": job.get("url"),
            "first_seen": today,
            "fit": fit,
            "status": "new",
            "portal": job.get("portal"),
            "location": job.get("location"),
            "date": job.get("date"),
        }
        if not args.dry_run:
            seen[k] = entry
        new_jobs.append(entry)

    if not args.dry_run:
        state["seen"] = seen
        SEEN_FILE.write_text(json.dumps(state, indent=2) + "\n")

    by_fit = Counter(j["fit"] for j in new_jobs)
    by_portal = Counter(j["portal"] for j in new_jobs)

    print(f"## Daily Scrape — {today}\n")
    print(f"Queries: {len(SEARCHES)} | Unique in pool: {len(pool)}")
    print(f"New jobs: {len(new_jobs)} (high {by_fit.get('high', 0)}, medium {by_fit.get('medium', 0)}, low {by_fit.get('low', 0)})")
    print(f"Skipped (already seen): {skipped_seen} | Skipped (in tracker): {skipped_tracker}")
    if by_portal:
        print(f"By portal: {dict(by_portal)}")
    if errors:
        print("\nErrors:")
        for portal, msg in errors:
            print(f"  - {portal}: {msg}")
    if new_jobs:
        print("\nTop new high-fit jobs:")
        for j in sorted([x for x in new_jobs if x["fit"] == "high"], key=lambda x: x.get("title", ""))[:10]:
            print(f"  - {j['title']} @ {j['company']} [{j['portal']}]")
            print(f"    {j['url']}")
    if new_jobs and not args.dry_run:
        print(f"\nNext step: run `/rank` in Cursor to score {len(new_jobs)} new job(s).")
    elif args.dry_run:
        print("\n(dry-run — seen_jobs.json not updated)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
