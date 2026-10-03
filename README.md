# Icecream Jobs

An **autonomous agentic job-application workflow**: your Muse agent finds matching roles, tailors a cover letter per
role, fills each application, and submits it — asking you only when a question or blocker genuinely needs your input.
A tracker dashboard (match ratings, calendar view, questionnaire tab) records everything it does, so you can watch the
pipeline work.

The tracker is the scoreboard. The agent is the player.

By [Debajyoti Saikia](https://deb0.com).

## How it works

1. You fill in your applicant profile and search config once (`skills/job-application/`).
2. Your Muse agent discovers roles across job portals, dedupes against what it already applied to, and vets unfamiliar
   companies before touching them.
3. For each qualifying role it writes a tailored cover letter, fills the application with your fixed resume, and
   submits when complete — logging every application to the tracker.
4. Anything it can't answer goes to you in chat **and** to the tracker's questionnaire tab, both at the same time.

## What's in here

- `skills/job-application/` — the autonomous-apply skill: discovery workflow,
  applicant profile template, search config template, cover-letter guide, and
  the portal-questionnaire helper script
- `client/` — React frontend (Mantine UI): dashboard, calendar, questionnaire
- `server/src/` — server actions (`actions.ts`), database schema (`schema.ts`),
  seed data (`seed-data.ts`), resume text (`resume-data.ts`)
- `drizzle/` — SQL migrations
- `space.json` — artifact manifest
- `skills/icecream-jobs-install/` — install skill for your Muse assistant

## Make it yours

1. **Applicant profile**: fill in `skills/job-application/applicant-profile.json`
   — every `UNKNOWN` field must be answered by you, never invented by the agent.
2. **Search config**: fill in `skills/job-application/job-search-config.json` —
   your TC floor, target companies/levels/locations, and standing form answers.
3. **Resume**: replace `RESUME_TEXT` in `server/src/resume-data.ts` with your
   own resume in Markdown.
4. **Seed applications**: replace the example rows in
   `server/src/seed-data.ts` with your own history (or leave the array empty
   and add applications through the app's UI).
5. **Example questions**: the starter questions in `server/src/actions.ts`
   (`SEED_QUESTIONS`) are placeholders — edit or delete them.

## Build it in Muse

Hand this folder to your Muse assistant and ask it to build it as a
TypeScript-space web artifact (the `icecream-jobs-install` skill walks through
the steps). Then install the `job-application` skill so the agent can apply to
jobs autonomously. No manual installation needed.

## New to Muse?

Check out Muse, your personal AI agent. Redeem my code in Settings within 48 hours of joining and we'll both get
1 billion Muse tokens.

Code: **GWIYVI**
https://muse.ai/join

## Notes

- No personal data ships in this repo. The database starts empty; everything
  is yours once you load your own data.
- Requires `bun` to build (your Muse assistant handles this).
