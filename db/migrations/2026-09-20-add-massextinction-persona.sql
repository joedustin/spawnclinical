-- Migration: add the 'massextinction' persona + re-tag the first two
-- Mass Extinction spawns (CalArmageddon, Neurocore AI) that were saved as
-- 'sponsor' before the category existed.
--
-- Run ONCE against the production database:
--   Neon dashboard → SQL Editor → paste + Run
--   (or: psql "$DATABASE_URL" -f db/migrations/2026-09-20-add-massextinction-persona.sql)

-- 1. Widen the persona CHECK constraint to allow the new value.
--    (Finds the existing persona check by definition, so it works regardless
--     of the auto-generated constraint name.)
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'spawns'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%persona%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE spawns DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE spawns ADD CONSTRAINT spawns_persona_check
  CHECK (persona IN ('sponsor','site','patient','massextinction'));

-- 2. Re-tag the two existing Mass Extinction spawns (case/space tolerant).
UPDATE spawns
SET persona = 'massextinction'
WHERE btrim(lower(product_name)) IN ('calarmageddon', 'neurocore ai');

-- 3. (optional) verify
-- SELECT id, product_name, persona FROM spawns
-- WHERE btrim(lower(product_name)) IN ('calarmageddon','neurocore ai');
