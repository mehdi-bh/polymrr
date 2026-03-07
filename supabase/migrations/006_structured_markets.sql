-- 006: Structured market creation & auto-resolution
-- Adds resolution_config (JSONB) and created_by columns to markets table.

ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS resolution_config jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

-- Immutable cast needed for index (timestamptz->date depends on timezone)
CREATE OR REPLACE FUNCTION tstz_to_date(ts timestamptz)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT (ts AT TIME ZONE 'UTC')::date;
$$;

-- Unique index to prevent duplicate markets
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_no_duplicates
  ON markets (
    startup_slug,
    (resolution_config->>'metric'),
    (resolution_config->>'condition'),
    (resolution_config->>'target'),
    tstz_to_date(closes_at)
  )
  WHERE resolution_config IS NOT NULL;
