---
framework_version: 1.0.0
---

# Agent Guidelines: AI Job Search

This workspace is structured to manage job search activities, scraper tools, CVs, cover letters, and interview preparation.

## Thin-Pointer Design (Single Source of Truth)

To prevent duplication and configuration drift across different AI agent frameworks (Claude Code, Google Antigravity, Codex, Cursor, Gemini CLI, etc.), this workspace uses a unified thin-pointer design. All agent runtimes should load the canonical specifications and candidate profiles from the files and directories below:

1. **Personal Candidate Profile:**
   - The candidate profile, contact details, education, and target preferences are defined in [CLAUDE.md](CLAUDE.md) and the individual profile methodology files under [.claude/skills/job-application-assistant/](.claude/skills/job-application-assistant/) (specifically `01-*.md` etc.).
2. **Canonical Workflow Specifications:**
   - The step-by-step instructions and triggers for tasks (setup, scrape, rank, apply, upskill, interview) are defined in the [.claude/](.claude/) directory (specifically under `.claude/skills/` and `.claude/commands/`).
   - Do not duplicate these rules or specifications. Treat `.claude/` files as the single source of truth.
3. **Portal Search Skills:**
   - Job-portal search CLIs live under [.agents/skills/](.agents/skills/) in the portable Agent Skills format (with a `SKILL.md` per portal). Codex and Antigravity discover these automatically; the `/scrape` workflow in [.claude/skills/job-scraper/](.claude/skills/job-scraper/) orchestrates them.

## Cursor Cloud specific instructions

This repo has three independent toolchains. The canonical command reference is [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — mirror it rather than duplicating commands here. The startup update script only refreshes the Bun CLI deps (`bun install` per portal); the language/LaTeX toolchains below are baked into the VM snapshot.

- **`python` is not on PATH — use `python3`.** Python 3.12 and `pyyaml` come from the base image (apt `python3-yaml`), so no pip step is needed.
- **Bun** lives at `~/.bun/bin/bun` (installer also added it to `~/.bashrc`). If `bun` isn't found in a non-interactive shell, call it by that full path.
- **Services / how to run them** (all run from the repo root unless noted):
  - Python tools: tests `python3 -m unittest discover -s tests -t . -v`; skill lint `python3 tools/lint_skills.py`; security guards `python3 tools/security_guards.py`; PDF check `python3 tools/verify_pdf.py <pdf> --min-chars 100`.
  - Portal CLIs (8 under `.agents/skills/<portal>-search/cli`): `bun run typecheck` and `bun test` inside each dir; a live search is `bun run .agents/skills/<portal>-search/cli/src/cli.ts search ...` (see each portal's `SKILL.md`). `linkedin-search` is personal-use-only per its ToS — do not CI-automate live LinkedIn requests.
  - LaTeX docs: CV `cd cv && lualatex -interaction=nonstopmode main_example.tex` (run twice for layout); cover letter `cd cover_letters && xelatex -interaction=nonstopmode cover_example.tex`. Expected: CV = 2 pages, cover letter = 1 page.
- **LaTeX toolchain gotcha:** the CV template needs a *newer* `moderncv` than Ubuntu's TeX Live 2023 ships — it requires `\firstnamestyle`/`\lastnamestyle` and pulls in `fontawesome6`. CI uses `texlive/texlive:latest`; this VM instead has apt TeX Live 2023 plus newer `moderncv` (v2.6.1), `fontawesome6`, `fontawesome5`, and `academicons` installed from CTAN into `TEXMFHOME` (`~/texmf`). Do **not** install `texlive-fonts-extra` from apt to get these — it is a 599 MB download that is extremely slow on this mirror; fetch the individual packages from CTAN into `~/texmf` and run `mktexlsr ~/texmf` instead.
- **Known pre-existing failure (not an environment issue):** `python3 tools/security_guards.py` fails on `master` because `.gitignore` contains the negation `!**/job_scraper/.gitkeep`, which is not listed in `ALLOWED_IGNORE_NEGATIONS` in `tools/security_guards.py`. This also fails `tests/test_security_guards.py::RealRepoTests::test_guards_pass_on_this_repo` (the rest of the suite passes). Fixing it means adding that entry to the allowlist in a code change, out of scope for environment setup.
