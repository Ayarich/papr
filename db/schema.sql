-- papr database schema (SQLite / libSQL).
-- Dates are stored as ISO 8601 text, true/false as 1/0.

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'student',   -- student | moderator | admin
  institution TEXT,
  programme   TEXT,
  level       TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,                -- only a hash of the cookie is stored
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_codes (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes(email);

CREATE TABLE IF NOT EXISTS submissions (
  id                      TEXT PRIMARY KEY,
  ref                     TEXT NOT NULL UNIQUE,  -- e.g. PPR-2026-0001
  status                  TEXT NOT NULL DEFAULT 'pending', -- pending | changes | published | rejected | withdrawn
  owner_id                TEXT NOT NULL REFERENCES users(id),
  -- copy of the current version, kept here for fast search and listing
  title                   TEXT NOT NULL,
  abstract                TEXT NOT NULL,
  keywords                TEXT NOT NULL,         -- comma-separated
  authors_text            TEXT NOT NULL,         -- comma-separated author names
  field                   TEXT NOT NULL,
  type                    TEXT NOT NULL,
  year                    TEXT NOT NULL,
  institution             TEXT NOT NULL,
  programme               TEXT NOT NULL,
  current_version         INTEGER NOT NULL DEFAULT 1,
  supervisor_name         TEXT NOT NULL,
  supervisor_email        TEXT NOT NULL,
  supervisor_token        TEXT UNIQUE,
  supervisor_confirmed_at TEXT,
  doi                     TEXT,
  views                   INTEGER NOT NULL DEFAULT 0,
  downloads               INTEGER NOT NULL DEFAULT 0,
  published_at            TEXT,
  withdrawn_at            TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_owner ON submissions(owner_id);

CREATE TABLE IF NOT EXISTS versions (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  number        INTEGER NOT NULL,
  title         TEXT NOT NULL,
  abstract      TEXT NOT NULL,
  keywords      TEXT NOT NULL,
  pdf_path      TEXT NOT NULL,                   -- file name inside the uploads folder
  pdf_name      TEXT NOT NULL,                   -- original file name
  pdf_size      INTEGER NOT NULL,
  declarations  TEXT NOT NULL,                   -- JSON: which boxes were ticked, as legal record
  created_at    TEXT NOT NULL,
  UNIQUE (submission_id, number)
);

CREATE TABLE IF NOT EXISTS authors (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  position      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id             TEXT PRIMARY KEY,
  submission_id  TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  moderator_id   TEXT NOT NULL REFERENCES users(id),
  decision       TEXT NOT NULL,                  -- publish | changes | reject
  note           TEXT,
  checklist      TEXT NOT NULL,                  -- JSON
  similarity     INTEGER NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Every email the app "sends". In development nothing leaves your computer:
-- emails are stored here and shown at /dev/outbox.
CREATE TABLE IF NOT EXISTS emails (
  id         TEXT PRIMARY KEY,
  "to"       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

