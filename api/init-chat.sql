-- ─────────────────────────────────────────────────────────────────────────────
-- SPAWN Clinical — Dusty AI Chat Tables
-- Run this in phpMyAdmin against your SPAWN-Gallery database.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_sessions (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  session_token VARCHAR(64)  NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL DEFAULT '',
  email         VARCHAR(200) NOT NULL DEFAULT '',
  page_origin   VARCHAR(100) DEFAULT NULL,     -- which page the chat started on
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  session_token VARCHAR(64)  NOT NULL,
  role          ENUM('user','assistant') NOT NULL,
  content       TEXT         NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_token),
  INDEX idx_session_created (session_token, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
