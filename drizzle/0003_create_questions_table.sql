CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  options TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  answer TEXT,
  created_at INTEGER NOT NULL,
  answered_at INTEGER
);
