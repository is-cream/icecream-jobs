---
name: "icecream-jobs-install"
description: "Build the icecream-jobs application from its shared source repo as a Muse web artifact. Use when the user hands you the icecream-jobs repo (or a folder with its source) and asks to install, set up, or build it."
---

# Icecream Jobs Install

## Purpose

Turn the shared `icecream-jobs` source repo into a working Muse web
artifact (TypeScript space): a job-application tracker with a dashboard,
calendar view, and questionnaire tab. The repo ships with placeholder data —
customize it for the user, then build through the artifact builder.

## Workflow

1. **Inspect the source.** Confirm the repo has `client/`, `server/src/`,
   `drizzle/`, and `space.json`. If anything is missing, stop and tell the
   user what's absent.

2. **Customize for the user.** Ask the user for:
   - Their resume in Markdown → replaces `RESUME_TEXT` in
     `server/src/resume-data.ts`.
   - Their application history (or nothing — the app works empty) → replaces
     the example rows in `server/src/seed-data.ts`. Each row needs: company,
     title, reqId, date (YYYY-MM-DD or null), statusRaw, status
     (`applied` | `blocked`), location, url, coverLetter (full text or null),
     letterNote, notes.
   - Optionally, starter questionnaire entries → edit `SEED_QUESTIONS` in
     `server/src/actions.ts`.

3. **PII check before building.** Grep the customized source for the user's
   name, email, phone, and address appearing anywhere they shouldn't (e.g.
   hardcoded in comments or example data). The user's own data belongs only
   in `resume-data.ts`, `seed-data.ts`, and the runtime database — never in
   code comments or placeholder text.

4. **Build as a web artifact.** Use the artifact builder (plan → build →
   audit → submit flow) to create a TypeScript-space web artifact from the
   source. Do not hand-edit build output; do not run the build manually.

5. **Verify.** After building, open the artifact and confirm: the dashboard
   loads, the calendar renders, the questionnaire tab lists the seed
   questions, and the resume viewer shows the user's resume.

## Output Contract

- A working `icecream-jobs` web artifact in the user's Library.
- The user's data lives only in their artifact's database and the two data
  files — nothing personal is left in shared or example code.

## Operating Rules

- Never ship the repo's placeholder resume or example applications as if
  they were the user's data.
- Never copy one user's customized data files into another user's build.
- If the user wants to share their customized app with someone else, point
  them at the clean-repo workflow: scrub `resume-data.ts` and `seed-data.ts`
  back to placeholders, verify with grep, then share the source.
- The artifact's runtime database (`app.db`) is per-user and never shared.
