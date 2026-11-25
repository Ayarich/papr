-- papr upgrades. Safe to run many times: everything uses IF NOT EXISTS.
-- Lines starting with "--@column" add a column to an existing table if it is missing.

--@column users handle TEXT
--@column users headline TEXT
--@column users bio TEXT
--@column users skills TEXT
--@column users linkedin TEXT
--@column users open_to_opps INTEGER NOT NULL DEFAULT 0
--@column users interests TEXT
--@column users lecturer_requested INTEGER NOT NULL DEFAULT 0
--@column submissions collection_id TEXT
--@column submissions campaign_id TEXT
--@column submissions claim_email TEXT
--@column submissions claim_token TEXT
--@column submissions claimed_at TEXT
--@column submissions imported INTEGER NOT NULL DEFAULT 0
--@column submissions ideas_at TEXT
--@column versions text TEXT
--@column versions indexed_at TEXT
--@column opportunities source TEXT
--@column opportunities level TEXT
--@column opportunities country TEXT
--@column opportunities funded INTEGER NOT NULL DEFAULT 0
--@column opportunities live INTEGER NOT NULL DEFAULT 0
--@column opportunities hidden INTEGER NOT NULL DEFAULT 0
--@column opportunities published_at TEXT
--@column emails status TEXT
--@column emails provider TEXT
--@column emails error TEXT

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_submissions_collection ON submissions(collection_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_claim ON submissions(claim_token);

-- Plagiarism index: fingerprints of every paper's text (see src/lib/plagiarism.ts)
CREATE TABLE IF NOT EXISTS fingerprints (
  hash       INTEGER NOT NULL,
  version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  pos        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fp_hash ON fingerprints(hash);
CREATE INDEX IF NOT EXISTS idx_fp_version ON fingerprints(version_id);

-- Lecturer / department collections
CREATE TABLE IF NOT EXISTS collections (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id    TEXT NOT NULL REFERENCES users(id),
  institution TEXT NOT NULL DEFAULT '',
  expected    INTEGER,
  deadline    TEXT,
  created_at  TEXT NOT NULL
);

-- Topic finder: research ideas taken from papers' recommendations
CREATE TABLE IF NOT EXISTS topic_ideas (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  field         TEXT NOT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ideas_field ON topic_ideas(field);
CREATE TABLE IF NOT EXISTS topic_saves (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id    TEXT NOT NULL REFERENCES topic_ideas(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, idea_id)
);

-- Opportunities feed
CREATE TABLE IF NOT EXISTS opportunities (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  org         TEXT NOT NULL,
  type        TEXT NOT NULL,    -- internship | national-service | scholarship | conference | grad-school | job | grant
  fields      TEXT NOT NULL DEFAULT '',  -- comma-separated; empty means all fields
  location    TEXT NOT NULL DEFAULT '',
  deadline    TEXT,
  url         TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sample      INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT,
  created_at  TEXT NOT NULL,
  source       TEXT,
  level        TEXT,
  country      TEXT,
  funded       INTEGER NOT NULL DEFAULT 0,
  live         INTEGER NOT NULL DEFAULT 0,
  hidden       INTEGER NOT NULL DEFAULT 0,
  published_at TEXT
);

-- Follow fields, institutions and authors
CREATE TABLE IF NOT EXISTS follows (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,     -- field | institution | author
  value      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, value)
);

-- In-app notifications (the bell)
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  text       TEXT NOT NULL,
  link       TEXT,
  ref        TEXT,
  count      INTEGER NOT NULL DEFAULT 1,
  day        TEXT NOT NULL,
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at);

-- Who read what (for reader notifications and Paper of the Month)
CREATE TABLE IF NOT EXISTS read_events (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,  -- view | download
  reader_id     TEXT,
  institution   TEXT,
  country       TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reads_sub ON read_events(submission_id, created_at);

-- Upload campaigns such as Drop Week
CREATE TABLE IF NOT EXISTS campaigns (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  badge      TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  ends_at    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Paper of the Month
CREATE TABLE IF NOT EXISTS awards (
  id            TEXT PRIMARY KEY,
  month         TEXT NOT NULL UNIQUE,   -- YYYY-MM
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  prize         TEXT NOT NULL,
  sponsor       TEXT NOT NULL DEFAULT '',
  citation      TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL
);

-- Recruiters / grad programmes asking to contact a student
CREATE TABLE IF NOT EXISTS contact_requests (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Slide decks (also created by older versions)
CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
  title TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decks_owner ON decks(owner_id);

-- Live opportunities read automatically from scholarship / research-job feeds (see src/lib/live-opps.ts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_opps_live_url ON opportunities(url) WHERE live = 1;
CREATE TABLE IF NOT EXISTS feed_sources (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL UNIQUE,
  enabled         INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TEXT,
  last_ok         INTEGER,
  last_count      INTEGER,
  last_error      TEXT,
  created_at      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Activity log for the admin dashboard: logins, sign-ups, tool use, submissions and server errors.
CREATE TABLE IF NOT EXISTS activity (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,   -- login | signup | tool | deck | submit | error | cron
  user_id    TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_kind ON activity(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_emails_time ON emails(created_at);
