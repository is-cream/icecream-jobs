// Actions for icecream jobs: the application ledger.
//
// Data originates from ./seed-data.ts (normalized application rows).
// `importApplications` loads those rows into the DB (deduped, safe to
// re-run); every other write is the user's own editing in the UI
// (match ratings, corrections, manual entries).

import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedApplications } from "./seed-data";
import { RESUME_TEXT } from "./resume-data";

const EXAMPLE_CONTEXT =
  "Acme Corp — Staff Software Engineer, req ACME-12345";

const SEED_QUESTIONS: Array<{
  context: string;
  question: string;
  kind: "choice" | "text";
  options: string[];
}> = [
  {
    context: EXAMPLE_CONTEXT,
    question:
      "What is your preferred interview programming language?",
    kind: "choice",
    options: ["TypeScript", "Python", "Go"],
  },
  {
    context: EXAMPLE_CONTEXT,
    question: "Are you willing to work on a hybrid schedule?",
    kind: "choice",
    options: ["Yes", "No"],
  },
];

async function ensureSeedQuestions(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const existing = await db.select().from(schema.questions);
  const have = new Set(existing.map((q) => q.question));
  const missing = SEED_QUESTIONS.filter((s) => !have.has(s.question));
  if (missing.length > 0) {
    await db.insert(schema.questions).values(
      missing.map((s) => ({
        context: s.context,
        question: s.question,
        kind: s.kind,
        options: JSON.stringify(s.options),
        status: "pending" as const,
        answer: null,
      })),
    );
  }
}

const questionRow = z.object({
  id: z.number(),
  context: z.string(),
  question: z.string(),
  kind: z.enum(["choice", "text"]),
  options: z.array(z.string()),
  status: z.enum(["pending", "answered"]),
  answer: z.string().nullable(),
  createdAt: z.string(),
  answeredAt: z.string().nullable(),
});

type QuestionRow = z.infer<typeof questionRow>;

function toQuestionRow(r: typeof schema.questions.$inferSelect): QuestionRow {
  let options: string[] = [];
  try {
    const parsed: unknown = JSON.parse(r.options || "[]");
    if (Array.isArray(parsed)) options = parsed.map(String);
  } catch {
    options = [];
  }
  return {
    id: r.id,
    context: r.context,
    question: r.question,
    kind: r.kind,
    options,
    status: r.status,
    answer: r.answer,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null,
  };
}

const matchEnum = z.enum(["great", "ok", "weak", "unrated"]);
const statusEnum = z.enum(["applied", "blocked"]);

const applicationRow = z.object({
  id: z.number(),
  company: z.string(),
  title: z.string(),
  reqId: z.string(),
  date: z.string().nullable(),
  statusRaw: z.string(),
  status: statusEnum,
  location: z.string().nullable(),
  url: z.string().nullable(),
  coverLetter: z.string().nullable(),
  letterNote: z.string().nullable(),
  match: matchEnum,
  notes: z.string().nullable(),
});

type ApplicationRow = z.infer<typeof applicationRow>;

function toRow(r: typeof schema.applications.$inferSelect): ApplicationRow {
  return {
    id: r.id,
    company: r.company,
    title: r.title,
    reqId: r.reqId,
    date: r.date,
    statusRaw: r.statusRaw,
    status: r.status,
    location: r.location,
    url: r.url,
    coverLetter: r.coverLetter,
    letterNote: r.letterNote,
    match: r.match,
    notes: r.notes,
  };
}

const editableFields = {
  company: z.string().min(1),
  title: z.string().min(1),
  reqId: z.string().default(""),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  statusRaw: z.string().default(""),
  status: statusEnum.default("applied"),
  location: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  match: matchEnum.default("unrated"),
  notes: z.string().nullable().default(null),
};

export const Actions = {
  listApplications: defineAction({
    request: z.object({}),
    response: z.object({ applications: z.array(applicationRow) }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.applications)
        .orderBy(asc(schema.applications.company), asc(schema.applications.title));
      return { applications: rows.map(toRow) };
    },
  }),

  importApplications: defineAction({
    request: z.object({}),
    response: z.object({ inserted: z.number(), total: z.number() }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const existing = await db.select().from(schema.applications);
      const key = (company: string, reqId: string, title: string, date: string | null) =>
        reqId
          ? `${company.toLowerCase()}|${reqId}`
          : `${company.toLowerCase()}|${title.toLowerCase()}|${date ?? ""}`;
      const byKey = new Map(
        existing.map((r) => [key(r.company, r.reqId, r.title, r.date), r]),
      );
      const fresh = seedApplications.filter(
        (s) => !byKey.has(key(s.company, s.reqId, s.title, s.date)),
      );
      if (fresh.length > 0) {
        await db.insert(schema.applications).values(
          fresh.map((s) => ({
            company: s.company,
            title: s.title,
            reqId: s.reqId,
            date: s.date,
            statusRaw: s.statusRaw,
            status: s.status,
            location: s.location,
            url: s.url,
            coverLetter: s.coverLetter,
            letterNote: s.letterNote,
            notes: s.notes,
          })),
        );
      }
      // Backfill / refresh documents on rows that already exist: the seed
      // carries each application's full cover-letter text, and older rows
      // predate it (some stored only a PDF filename in cover_letter). Only
      // the document fields are touched — the user's match ratings, edits, and
      // notes are never overwritten.
      for (const s of seedApplications) {
        if (!s.coverLetter) continue;
        const row = byKey.get(key(s.company, s.reqId, s.title, s.date));
        if (
          row &&
          (row.coverLetter !== s.coverLetter || row.letterNote !== s.letterNote)
        ) {
          await db
            .update(schema.applications)
            .set({ coverLetter: s.coverLetter, letterNote: s.letterNote })
            .where(eq(schema.applications.id, row.id));
        }
      }
      ctx.invalidateQueries();
      return { inserted: fresh.length, total: existing.length + fresh.length };
    },
  }),

  /* The user's resume, baked in at build time from ./resume-data.ts.
   * The client opens it in the same full-screen in-app document viewer as
   * the cover letters — no download, no external app. */
  getResume: defineAction({
    request: z.object({}),
    response: z.object({ title: z.string(), text: z.string() }),
    async handler() {
      return { title: "Resume", text: RESUME_TEXT };
    },
  }),

  addApplication: defineAction({
    request: z.object(editableFields),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const result = await db
        .insert(schema.applications)
        .values({ ...args, coverLetter: null, letterNote: null })
        .returning({ id: schema.applications.id });
      const inserted = result[0];
      if (!inserted) throw new Error("addApplication: insert returned no rows");
      ctx.invalidateQueries();
      return { id: inserted.id };
    },
  }),

  updateApplication: defineAction({
    request: z.object({ id: z.number().int().positive(), ...editableFields }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const { id, ...fields } = args;
      await db
        .update(schema.applications)
        .set(fields)
        .where(eq(schema.applications.id, id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  setMatch: defineAction({
    request: z.object({ id: z.number().int().positive(), match: matchEnum }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.applications)
        .set({ match: args.match })
        .where(eq(schema.applications.id, args.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteApplication: defineAction({
    request: z.object({ id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.applications)
        .where(eq(schema.applications.id, args.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  /* ---------- Questionnaire ----------
   * Questions are DATA, not code: the assistant adds and resolves them
   * through these actions, so nothing here needs a rebuild or redeploy.
   * Pending questions surface in the Questionnaire tab; answering (in the
   * app via answerQuestion, or in chat via resolveQuestion) moves them to
   * the Answered history and out of the pending list. */

  listQuestions: defineAction({
    request: z.object({}),
    response: z.object({
      questions: z.array(questionRow),
      pendingCount: z.number(),
    }),
    async handler(ctx) {
      await ensureSeedQuestions(ctx);
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.questions)
        .orderBy(desc(schema.questions.createdAt), desc(schema.questions.id));
      const questions = rows.map(toQuestionRow);
      // Pending first, then answered (history), newest first within each.
      questions.sort((a, b) =>
        a.status === b.status ? 0 : a.status === "pending" ? -1 : 1,
      );
      return {
        questions,
        pendingCount: questions.filter((q) => q.status === "pending").length,
      };
    },
  }),

  addQuestion: defineAction({
    request: z.object({
      context: z.string().default(""),
      question: z.string().min(1),
      kind: z.enum(["choice", "text"]).default("text"),
      options: z.array(z.string()).default([]),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const result = await db
        .insert(schema.questions)
        .values({
          context: args.context,
          question: args.question,
          kind: args.kind,
          options: JSON.stringify(args.kind === "choice" ? args.options : []),
          status: "pending",
          answer: null,
        })
        .returning({ id: schema.questions.id });
      const inserted = result[0];
      if (!inserted) throw new Error("addQuestion: insert returned no rows");
      ctx.invalidateQueries();
      return { id: inserted.id };
    },
  }),

  answerQuestion: defineAction({
    request: z.object({
      id: z.number().int().positive(),
      answer: z.string().min(1),
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.questions)
        .set({ status: "answered", answer: args.answer, answeredAt: new Date() })
        .where(eq(schema.questions.id, args.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  resolveQuestion: defineAction({
    request: z.object({
      id: z.number().int().positive(),
      answer: z.string().min(1),
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.questions)
        .set({ status: "answered", answer: args.answer, answeredAt: new Date() })
        .where(eq(schema.questions.id, args.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),
} satisfies ActionsModule;
