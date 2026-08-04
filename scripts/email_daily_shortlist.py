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
import os
import smtplib
import sys
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_body(path: Path) -> str:
    if not path.exists():
        print(f"Shortlist file not found: {path}", file=sys.stderr)
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def send_email(subject: str, body: str, to_addr: str, from_addr: str, app_password: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr

    plain = body
    html = "<pre style='font-family:system-ui,sans-serif;font-size:14px;line-height:1.5'>" + (
        body.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    ) + "</pre>"

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

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
    parser.add_argument("--dry-run", action="store_true", help="Print email body, do not send")
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
        print(body)
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
