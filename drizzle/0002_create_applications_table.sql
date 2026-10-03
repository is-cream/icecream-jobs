CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  req_id TEXT NOT NULL DEFAULT '',
  date TEXT,
  status_raw TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'applied',
  location TEXT,
  url TEXT,
  cover_letter TEXT,
  match TEXT NOT NULL DEFAULT 'unrated',
  notes TEXT,
  created_at INTEGER NOT NULL
);
