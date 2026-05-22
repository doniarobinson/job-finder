-- Job Finder agent schema (also mirrored in lib/db/schema.ts for Drizzle)

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  resume_text TEXT NOT NULL,
  parsed_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_epochs (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('initial_bootstrap', 'rebootstrap')),
  note TEXT,
  resume_hash TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_epochs_profile_started_idx
  ON agent_epochs (profile_id, started_at DESC);

CREATE TABLE IF NOT EXISTS search_params (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  epoch_id INTEGER REFERENCES agent_epochs(id) ON DELETE CASCADE,
  params_json JSONB NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO agent_settings (id, paused) VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  epoch_id INTEGER REFERENCES agent_epochs(id) ON DELETE CASCADE,
  url_hash TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  location TEXT,
  source TEXT NOT NULL DEFAULT 'adzuna',
  score REAL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_epoch_url_hash_idx ON jobs (epoch_id, url_hash);
CREATE INDEX IF NOT EXISTS jobs_score_idx ON jobs (score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status);
CREATE INDEX IF NOT EXISTS jobs_epoch_idx ON jobs (epoch_id);

CREATE TABLE IF NOT EXISTS param_history (
  id SERIAL PRIMARY KEY,
  epoch_id INTEGER REFERENCES agent_epochs(id) ON DELETE CASCADE,
  before_json JSONB NOT NULL,
  after_json JSONB NOT NULL,
  trigger_phrases JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
