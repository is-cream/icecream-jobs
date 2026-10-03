#!/usr/bin/env python3
"""Add a job application question to the icecream-jobs portal questionnaire.

Usage: python3 add_portal_question.py --db /path/to/app.db \
    --context "Company req 123" \
    --question "Are you willing to relocate?" --kind choice \
    --options '["Yes","No"]' [--answer "No"]

This is the ONLY way to add questions — never insert into the DB manually.
Every question asked in chat MUST also go through this script.
"""
import argparse
import sqlite3
import sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True,
                    help="Path to the icecream-jobs app.db")
    ap.add_argument("--context", required=True,
                    help="e.g. 'Acme Corp File & Block Storage (req 123)'")
    ap.add_argument("--question", required=True)
    ap.add_argument("--kind", choices=["choice", "text"], default="text")
    ap.add_argument("--options", default="[]",
                    help='JSON array, e.g. \'["Yes","No"]\'')
    ap.add_argument("--answer", default=None,
                    help="If already answered, the answer text")
    args = ap.parse_args()

    status = "answered" if args.answer else "pending"
    now = "strftime('%s','now')"

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO questions
            (context, question, kind, options, status, answer,
             created_at, answered_at)
            VALUES (?, ?, ?, ?, ?, ?, {now},
                    {'NULL' if not args.answer else now})""",
        (args.context, args.question, args.kind, args.options,
         status, args.answer))
    qid = cur.lastrowid
    conn.commit()
    conn.close()
    print(f"Added question id={qid} status={status}")

if __name__ == "__main__":
    main()
