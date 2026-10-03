// Drizzle schema for this space — one row per job application.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  reqId: text("req_id").notNull().default(""),
  // Plain calendar date YYYY-MM-DD (America/Los_Angeles); null = undated log row.
  date: text("date"),
  // Original status text from the log / as edited.
  statusRaw: text("status_raw").notNull().default(""),
  // Normalized: "applied" counts toward the applied totals; "blocked" never submitted.
  status: text("status", { enum: ["applied", "blocked"] })
    .notNull()
    .default("applied"),
  location: text("location"),
  url: text("url"),
  // The cover letter's FULL text (from its .md source in Deb's files);
  // null = no letter was written for this application, so no link is shown.
  coverLetter: text("cover_letter"),
  // Provenance for coverLetter: the source .md filename, e.g.
  // "Cover_Letter_Databricks_Backend.md". Null when coverLetter is null.
  letterNote: text("letter_note"),
  // User-owned match rating — the source log records none, so rows start unrated.
  match: text("match", { enum: ["great", "ok", "weak", "unrated"] })
    .notNull()
    .default("unrated"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // e.g. "Acme Corp — Staff Software Engineer (req 12345)"
  context: text("context").notNull().default(""),
  question: text("question").notNull(),
  kind: text("kind", { enum: ["choice", "text"] }).notNull().default("text"),
  // JSON-encoded string array of options for kind="choice"; "[]" otherwise.
  options: text("options").notNull().default("[]"),
  status: text("status", { enum: ["pending", "answered"] })
    .notNull()
    .default("pending"),
  answer: text("answer"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  answeredAt: integer("answered_at", { mode: "timestamp_ms" }),
});
