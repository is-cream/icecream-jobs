// Seed data for icecream-jobs.
//
// Replace this file's contents with your own application history, or leave
// the array empty and add applications through the app's UI / import action.
// Each row needs: company, title, reqId, date (YYYY-MM-DD or null),
// statusRaw (the original status text), status ("applied" | "blocked"),
// location, url, coverLetter (full text or null), letterNote, notes.
//
// To generate this file from a JSON log, normalize your records into the
// SeedApplication shape below. Dedupe on (company, reqId) when importing.

export type SeedApplication = {
  company: string;
  title: string;
  reqId: string;
  date: string | null;
  statusRaw: string;
  status: "applied" | "blocked";
  location: string | null;
  url: string | null;
  coverLetter: string | null;
  letterNote: string | null;
  notes: string | null;
};

export const seedApplications: SeedApplication[] = [
  // Example rows — delete these and add your own, or start empty.
  {
    "company": "Acme Corp",
    "title": "Staff Software Engineer, Infrastructure",
    "reqId": "ACME-12345",
    "date": "2026-10-01",
    "statusRaw": "Application Received",
    "status": "applied",
    "location": "Seattle, WA",
    "url": null,
    "coverLetter": null,
    "letterNote": null,
    "notes": null,
  },
  {
    "company": "Globex",
    "title": "Principal Engineer, Distributed Systems",
    "reqId": "GX-9876",
    "date": "2026-10-02",
    "statusRaw": "Applied",
    "status": "applied",
    "location": "Remote",
    "url": null,
    "coverLetter": null,
    "letterNote": null,
    "notes": null,
  },
];
