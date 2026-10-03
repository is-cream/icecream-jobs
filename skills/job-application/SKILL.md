---
name: "job-application"
description: "Apply to jobs on the user's behalf: find matching roles, tailor the cover letter per role, fill each application, and submit when complete — asking the user only when a question or blocker needs their input."
---

# Job Application

## Purpose
Run the user's job applications end to end, per company, reusing their fixed
resume and a tailored cover letter. Discovery → shortlist → tailor → fill →
stage → user confirms → submit.

## Portal questionnaire sync (MANDATORY)
Every question asked to the user in chat about a job application MUST also be
added to the icecream-jobs portal questionnaire tab. This is not optional.

Use the helper script (never raw SQL):
```
python3 <skill-dir>/add_portal_question.py \
  --db /path/to/app.db \
  --context "Company Role (req ID)" \
  --question "The exact question text" \
  --kind choice|text \
  --options '["Yes","No"]' \
  [--answer "the user's answer if already given"]
```

Rules:
- Add the question to the portal AT THE SAME TIME you ask it in chat, not after.
- If the user answers in chat, update the portal with the answer (use the script with --answer, or update the existing row).
- Kind "choice" for dropdowns/multiple-choice, "text" for freeform.
- Context must include company, role, and req ID so the user knows which application it's for.

## Standing config
All durable job-hunting decisions live in `job-search-config.json` in this
skill directory — read it before acting. It is the source of truth for: the
TC floor, per-company apply/skip/watch decisions and reasons, level mapping
source, target domains/levels/locations, standing form answers the user has
already given, and workflow rules. Do not re-derive these from memory — the
config file wins.

## Discovery method (aggregator-first)

Do NOT crawl company career portals one by one as the primary search. Search
the multi-company job portals with the user's criteria and work every company
from one result set.

Sources:
- Indeed, LinkedIn (anonymous search only — never log in), Glassdoor,
  Wellfound, Dice, Built In (user's metro), ZipRecruiter, Handshake,
  CareerBuilder, Hacker News "Who is hiring?" (current month), YC Jobs,
  Simplify
- Company Greenhouse / Lever / Ashby board feeds — for verifying a posting
  is live and for applying, not as the primary search

Pipeline for every search:
1. Search the aggregators with the standing criteria (target level; target
   domains; location scope; TC floor via level mapping — posted base ranges
   are never compared to the floor directly).
2. Dedupe against `seen-postings.json` and `applications.json`. Log every new
   posting to `seen-postings.json` (status `reported`).
3. Apply the fit filters: level gate per company (from
   `job-search-config.json`), location gate, domain fit, and the user's
   exclusions.
4. Approved companies (decision `apply` in the config): write the cover
   letter and apply directly — do NOT wait for per-batch approval once the
   user has given standing authorization.
5. Unfamiliar companies: vet pay/equity/bonus/benefits and company quality,
   then bring to the user ONE company at a time for approval before applying.

Board sweep rule: an aggregator posting is a LEAD, not the target list. Work
each company in this order:
1. Apply the aggregator-found job first (after verifying it live on the
   company's own board).
2. You are now already on that company's board — search the board directly
   for ALL other qualifying roles (same criteria and fit filters) and apply
   to every one that qualifies at approved companies, deduped as usual. At
   unfamiliar companies, the full board sweep feeds the vetting list for the
   user's one-at-a-time approval.
Never leave a company's board having applied to only the surfaced posting
when other qualifying roles are posted there.

## Daily sweeps
A scheduled job runs the aggregator-first discovery every morning: searches
the aggregator sources for NEW postings, diffs against `seen-postings.json`,
logs new postings, vets unfamiliar companies, and reports new qualifying
postings grouped as (A) approved companies — ready to apply, and (B)
unfamiliar companies — with vetting, awaiting the user's approval. The main
agent then runs the group-A applications.

## Workflow
1. **Load profile and config.** Read `applicant-profile.json` AND
   `job-search-config.json` in this skill directory before anything else.
   Fields marked `UNKNOWN` must be asked of the user — never invented.
   Standing answers in the config file are already authorized — never re-ask
   them.
2. **Discover roles.** Aggregator-first (see "Discovery method" above).
   Filter by the user's standing criteria.
3. **Skip already-applied.** Check the portal's "already applied" state and
   the `applications.json` log. Never apply twice to the same requisition.
4. **Vet unfamiliar companies.** For any company not on the user's approved
   target list, report pay (base/bonus/equity benchmarks) and benefits
   first. Proceed only after the user approves that company.
5. **Tailor the cover letter.** Write one per role, following
   `references/cover-letter-guide.md`. No need to ask before tailoring.
   Never modify the resume.
6. **Fill the application.** Resume PDF + tailored cover letter upload; known
   facts from the profile; stop and ask the user about every `UNKNOWN` field.
7. **Submit.** Submit once complete with no open questions (requires the
   user's standing authorization). Ask the user only when a question,
   blocker, or unknown field needs their input.
8. **Log it.** Append `{date, company, req_id, title, location, status}` to
   `applications.json`.

## Output Contract
- Each application ends in exactly one of: submitted (with confirmation
  recorded), staged-awaiting-confirmation, or blocked (reason + what the user
  must do).
- Report back: role, req ID, what was filled, any answers the user supplied,
  and the confirmation status.

## Operating Rules
1. The user's resume PDF is FIXED. Do not edit it for any application.
2. Submit once complete with no open questions — only with the user's
   standing authorization. Ask only when a question, blocker, or unknown
   field needs their input.
3. Never fill an `UNKNOWN` profile field from inference. Ask.
4. The user handles all login/OTP steps. Use saved logins; offer secure
   credential capture when the user offers credentials.
5. Preserve the user's voice in cover letters: authentic, understated, no AI
   filler, no grandiose titles.
6. Remove internal level numbers from all application-facing material.
7. Never buy, pay, publish, or submit job applications without the required
   authorization.
8. Present role shortlists ONE company at a time. Get the user's decision on
   one company's shortlist before presenting the next.
