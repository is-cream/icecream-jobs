# Icecream Jobs

A job-application tracker: dashboard with match ratings, a calendar view of
applications by day, and a questionnaire tab for application questions.

## What's in here

- `client/` — React frontend (Mantine UI)
- `server/src/` — server actions (`actions.ts`), database schema (`schema.ts`),
  seed data (`seed-data.ts`), resume text (`resume-data.ts`)
- `drizzle/` — SQL migrations
- `space.json` — artifact manifest

## Make it yours

1. **Resume**: replace `RESUME_TEXT` in `server/src/resume-data.ts` with your
   own resume in Markdown.
2. **Seed applications**: replace the example rows in
   `server/src/seed-data.ts` with your own history (or leave the array empty
   and add applications through the app's UI).
3. **Example questions**: the starter questions in `server/src/actions.ts`
   (`SEED_QUESTIONS`) are placeholders — edit or delete them.

## Build it in Muse

Hand this folder to your Muse assistant and ask it to build it as a
TypeScript-space web artifact. The assistant will handle the build, audit,
and publish steps. No manual installation needed — the app (frontend,
backend, and database) runs inside Muse.

## Notes

- No personal data ships in this repo. The database starts empty; everything
  is yours once you load your own data.
- Requires `bun` to build (your Muse assistant handles this).
