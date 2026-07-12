-- ─────────────────────────────────────────────────────────────────────────────
-- SPAWN Clinical — Neon Postgres Schema
--
-- HOW TO RUN:
--   1. Neon dashboard → your project → "SQL Editor"
--   2. Paste this entire file and click "Run"
--   (or: psql "$DATABASE_URL" -f db/schema.sql)
--
-- Converted from the original GoDaddy MySQL schema:
--   AUTO_INCREMENT      → SERIAL
--   ENUM(...)           → VARCHAR + CHECK constraint
--   LONGTEXT (JSON)     → JSONB
--   TIMESTAMP           → TIMESTAMPTZ
--   INDEX inside CREATE → separate CREATE INDEX statements
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Gallery spawns ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spawns (
  id              SERIAL       PRIMARY KEY,
  product_name    VARCHAR(255) NOT NULL,
  tagline         VARCHAR(500) NOT NULL DEFAULT '',
  persona         VARCHAR(20)  NOT NULL DEFAULT 'sponsor'
                    CHECK (persona IN ('sponsor','site','patient')),
  creator_name    VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
  first_name      VARCHAR(255) NOT NULL DEFAULT '',
  last_name       VARCHAR(255) NOT NULL DEFAULT '',
  creator_email   VARCHAR(255) NOT NULL DEFAULT '',
  creator_comment TEXT,
  spawn_prompt    TEXT,                       -- original prompt used to generate this spawn
  spawn_data      JSONB        NOT NULL,      -- full JSON payload from Claude
  status          VARCHAR(20)  NOT NULL DEFAULT 'published'
                    CHECK (status IN ('published','pending')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spawns_status_created ON spawns (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spawns_persona        ON spawns (persona);
CREATE INDEX IF NOT EXISTS idx_spawns_created        ON spawns (created_at DESC);

-- ── Dusty chatbot sessions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            SERIAL       PRIMARY KEY,
  session_token VARCHAR(64)  NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL DEFAULT '',
  email         VARCHAR(200) NOT NULL DEFAULT '',
  page_origin   VARCHAR(100),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_email   ON chat_sessions (email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created ON chat_sessions (created_at);

-- ── Dusty chatbot messages ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id            SERIAL      PRIMARY KEY,
  session_token VARCHAR(64) NOT NULL,
  role          VARCHAR(16) NOT NULL CHECK (role IN ('user','assistant')),
  content       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session         ON chat_messages (session_token);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages (session_token, created_at);
