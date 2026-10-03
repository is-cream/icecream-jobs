# Icecream Jobs

A job-application tracker **plus the autonomous application engine**: dashboard with match ratings, a calendar view of
applications by day, a questionnaire tab — and a `job-application` skill that teaches the user's Muse agent to find
roles, tailor cover letters, fill applications, and submit them.

## What's in here

- `client/` — React frontend (Mantine UI)
- `server/src/` — server actions (`actions.ts`), database schema (`schema.ts`),
  seed data (`seed-data.ts`), resume text (`resume-data.ts`)
- `drizzle/` — SQL migrations
- `space.json` — artifact manifest
- `skills/job-application/` — the autonomous-apply skill: discovery workflow,
  applicant profile template, search config template, cover-letter guide, and
  the portal-questionnaire helper script
- `skills/icecream-jobs-install/` — install skill for the recipient's Muse

## Make it yours

1. **Resume**: replace `RESUME_TEXT` in `server/src/resume-data.ts` with your
   own resume in Markdown.
2. **Seed applications**: replace the example rows in
   `server/src/seed-data.ts` with your own history (or leave the array empty
   and add applications through the app's UI).
3. **Example questions**: the starter questions in `server/src/actions.ts`
   (`SEED_QUESTIONS`) are placeholders — edit or delete them.
4. **Applicant profile**: fill in `skills/job-application/applicant-profile.json`
   — every `UNKNOWN` field must be answered by you, never invented by the agent.
5. **Search config**: fill in `skills/job-application/job-search-config.json` —
   your TC floor, target companies/levels/locations, and standing form answers.

## Build it in Muse

Hand this folder to your Muse assistant and ask it to build it as a
TypeScript-space web artifact (the `icecream-jobs-install` skill walks through
the steps). Then install the `job-application` skill so the agent can apply to
jobs autonomously. No manual installation needed.

## Notes

- No personal data ships in this repo. The database starts empty; everything
  is yours once you load your own data.
- Requires `bun` to build (your Muse assistant handles this).
