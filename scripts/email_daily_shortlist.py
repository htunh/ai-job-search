#!/usr/bin/env python3
"""
Email today's job shortlist to yourself via Gmail SMTP.

Reads job_scraper/daily_shortlist_YYYY-MM-DD.md (or --file path).
Credentials from environment variables (never commit these):

  GMAIL_ADDRESS=you@gmail.com
  GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # Google App Password, not your login password

Optional:
  GMAIL_TO=you@gmail.com   # defaults to GMAIL_ADDRESS

Usage:
  python3 scripts/email_daily_shortlist.py
  python3 scripts/email_daily_shortlist.py --file job_scraper/daily_shortlist_2026-08-04.md
"""

from __future__ import annotations

import argparse
import html
import os
import re
import smtplib
import sys
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent

URL_RE = re.compile(r"https?://[^\s<>]+")
BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


def load_body(path: Path) -> str:
    if not path.exists():
        print(f"Shortlist file not found: {path}", file=sys.stderr)
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def short_link_label(url: str) -> str:
    host = urlparse(url).netloc.lower().replace("www.", "")
    if "linkedin.com" in host:
        return "View on LinkedIn"
    if "jobsdb.com" in host:
        return "View on JobsDB"
    if "jobthai.com" in host:
        return "View on JobThai"
    if "freehire.me" in host:
        return "View on FreeHire"
    return f"Open link ({host})"


def inline_bold_html(text: str) -> str:
    return BOLD_RE.sub(r"<strong>\1</strong>", html.escape(text))


def linkify_html(text: str) -> str:
    parts: list[str] = []
    last = 0
    for match in URL_RE.finditer(text):
        before = text[last : match.start()]
        if before:
            parts.append(inline_bold_html(before))
        url = match.group(0).rstrip(").,]")
        label = short_link_label(url)
        parts.append(
            f'<a href="{html.escape(url)}" style="color:#1a73e8;text-decoration:none;">'
            f"{html.escape(label)}</a>"
        )
        last = match.end()
    tail = text[last:]
    if tail:
        parts.append(inline_bold_html(tail))
    return "".join(parts)


def markdown_to_plain(md: str) -> str:
    lines: list[str] = []
    for raw in md.splitlines():
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        if line.startswith("# "):
            lines.append(line[2:].strip())
            lines.append("=" * min(40, len(line) - 2))
            continue
        if line.startswith("## "):
            lines.append("")
            lines.append(line[3:].strip().upper())
            lines.append("-" * min(30, len(line) - 3))
            continue
        line = BOLD_RE.sub(r"\1", line)
        url_match = URL_RE.search(line)
        if url_match and url_match.start() > 0:
            head = line[: url_match.start()].rstrip(" —-")
            url = url_match.group(0).rstrip(").,]")
            lines.append(head)
            lines.append(f"  → {short_link_label(url)}")
            continue
        lines.append(line)
    return "\n".join(lines).strip() + "\n"


def markdown_to_html(md: str) -> str:
    blocks: list[str] = []
    in_ol = False
    in_ul = False

    def close_lists() -> None:
        nonlocal in_ol, in_ul
        if in_ol:
            blocks.append("</ol>")
            in_ol = False
        if in_ul:
            blocks.append("</ul>")
            in_ul = False

    for raw in md.splitlines():
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            close_lists()
            blocks.append("<p style='margin:0 0 12px;'>&nbsp;</p>")
            continue

        if stripped.startswith("# "):
            close_lists()
            title = html.escape(stripped[2:].strip())
            blocks.append(
                f"<h1 style='margin:0 0 8px;font-size:20px;font-weight:600;color:#202124;'>{title}</h1>"
            )
            continue

        if stripped.startswith("## "):
            close_lists()
            title = html.escape(stripped[3:].strip())
            blocks.append(
                f"<h2 style='margin:20px 0 8px;font-size:16px;font-weight:600;color:#202124;'>{title}</h2>"
            )
            continue

        ol_match = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if ol_match:
            if in_ul:
                blocks.append("</ul>")
                in_ul = False
            if not in_ol:
                blocks.append("<ol style='margin:0 0 12px;padding-left:22px;'>")
                in_ol = True
            blocks.append(
                "<li style='margin:0 0 10px;line-height:1.45;'>"
                f"{linkify_html(ol_match.group(2))}</li>"
            )
            continue

        if stripped.startswith("- "):
            if in_ol:
                blocks.append("</ol>")
                in_ol = False
            if not in_ul:
                blocks.append("<ul style='margin:0 0 12px;padding-left:22px;'>")
                in_ul = True
            blocks.append(
                "<li style='margin:0 0 6px;line-height:1.45;'>"
                f"{linkify_html(stripped[2:])}</li>"
            )
            continue

        close_lists()
        blocks.append(
            f"<p style='margin:0 0 12px;line-height:1.45;color:#3c4043;'>{linkify_html(stripped)}</p>"
        )

    close_lists()

    body = "\n".join(blocks)
    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#202124;background:#ffffff;">
<div style="max-width:640px;">
{body}
</div>
</body>
</html>"""


def send_email(subject: str, markdown_body: str, to_addr: str, from_addr: str, app_password: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr

    plain = markdown_to_plain(markdown_body)
    html_body = markdown_to_html(markdown_body)

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as server:
        server.login(from_addr, app_password.replace(" ", ""))
        server.sendmail(from_addr, [to_addr], msg.as_string())


def main() -> None:
    parser = argparse.ArgumentParser(description="Email daily job shortlist via Gmail")
    parser.add_argument(
        "--file",
        type=Path,
        help="Path to shortlist markdown (default: job_scraper/daily_shortlist_TODAY.md)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print plain-text email body, do not send")
    parser.add_argument("--html", action="store_true", help="With --dry-run, print HTML instead of plain text")
    args = parser.parse_args()

    today = date.today().isoformat()
    path = args.file or (ROOT / "job_scraper" / f"daily_shortlist_{today}.md")
    body = load_body(path)

    from_addr = os.environ.get("GMAIL_ADDRESS", "").strip()
    app_password = os.environ.get("GMAIL_APP_PASSWORD", "").strip()
    to_addr = os.environ.get("GMAIL_TO", from_addr).strip()

    subject = f"Job shortlist — {today}"

    if args.dry_run:
        print(f"To: {to_addr or '(set GMAIL_ADDRESS)'}")
        print(f"Subject: {subject}")
        print("---")
        print(markdown_to_html(body) if args.html else markdown_to_plain(body))
        return

    if not from_addr or not app_password:
        print(
            "Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD environment variables.\n"
            "Create an App Password: Google Account → Security → 2-Step Verification → App passwords.",
            file=sys.stderr,
        )
        sys.exit(1)

    send_email(subject, body, to_addr, from_addr, app_password)
    print(f"Sent shortlist to {to_addr}")


if __name__ == "__main__":
    main()
