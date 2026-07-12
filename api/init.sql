-- ─────────────────────────────────────────────────────────────────────────────
-- SPAWN Gallery — Database Schema
--
-- HOW TO USE:
--   1. Log into cPanel → phpMyAdmin
--   2. In the left panel, click on your SPAWN-Gallery database
--   3. Click the "SQL" tab at the top
--   4. Paste this entire script and click "Go"
--
-- ⚠  GoDaddy cPanel Note:
--    GoDaddy prepends your cPanel username to all DB names.
--    Your actual DB will be something like:  myuser_SPAWN-Gallery
--    You do NOT need to change anything in this file — just select
--    the correct database in phpMyAdmin's left panel before running.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `spawns` (
  `id`              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `product_name`    VARCHAR(255)      NOT NULL,
  `tagline`         VARCHAR(500)      NOT NULL DEFAULT '',
  `persona`         ENUM('sponsor','site','patient') NOT NULL DEFAULT 'sponsor',
  `creator_name`    VARCHAR(255)      NOT NULL DEFAULT 'Anonymous',
  `first_name`      VARCHAR(255)      NOT NULL DEFAULT '',
  `last_name`       VARCHAR(255)      NOT NULL DEFAULT '',
  `creator_email`   VARCHAR(255)      NOT NULL DEFAULT '',
  `creator_comment` TEXT,
  `spawn_prompt`    TEXT                       COMMENT 'Original prompt used to generate this spawn',
  `spawn_data`      LONGTEXT          NOT NULL COMMENT 'Full JSON payload from Claude',
  `status`          ENUM('published','pending') NOT NULL DEFAULT 'published',
  `created_at`      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status_created`  (`status`, `created_at`),
  INDEX `idx_persona`         (`persona`),
  INDEX `idx_created`         (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add columns to an existing table
-- Run this if your `spawns` table already exists from a previous deployment.
-- Safe to run multiple times — IF NOT EXISTS prevents duplicate column errors.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `spawns`
  ADD COLUMN IF NOT EXISTS `spawn_prompt` TEXT
  COMMENT 'Original prompt used to generate this spawn'
  AFTER `creator_comment`;

ALTER TABLE `spawns`
  ADD COLUMN IF NOT EXISTS `first_name` VARCHAR(255) NOT NULL DEFAULT ''
  AFTER `creator_name`;

ALTER TABLE `spawns`
  ADD COLUMN IF NOT EXISTS `last_name` VARCHAR(255) NOT NULL DEFAULT ''
  AFTER `first_name`;

ALTER TABLE `spawns`
  ADD COLUMN IF NOT EXISTS `creator_email` VARCHAR(255) NOT NULL DEFAULT ''
  AFTER `last_name`;
