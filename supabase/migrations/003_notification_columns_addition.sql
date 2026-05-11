-- Migration: Add enhanced notification columns to existing notifications table
-- This migration is IDEMPOTENT and safe for existing data.
-- Run on Supabase SQL Editor.

-- Add missing columns if they don't exist
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'system'
    CHECK (category IN ('emergency', 'health', 'medication', 'device', 'chat', 'system', 'food', 'wearable'));

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS screen TEXT;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'local'
    CHECK (source IN ('local', 'backend', 'wearable', 'ai', 'system'));

-- Add performance indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(user_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_severity
  ON notifications(user_id, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_emergency
  ON notifications(user_id, severity)
  WHERE severity = 'critical';

-- Enable realtime for notifications (if not already enabled)
-- This is done via Supabase Dashboard > Database > Replication, but we can also try:
DO $$
BEGIN
  -- Attempt to enable realtime publication (may require supabase replicator role)
  PERFORM pg_publication_add_table('supabase_realtime', 'notifications')
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    );
EXCEPTION WHEN OTHERS THEN
  -- Silently ignore if we don't have permission (managed via dashboard)
  RAISE NOTICE 'Realtime enable skipped (manage via Supabase dashboard if needed): %', SQLERRM;
END $$;

-- Update existing notifications with default values where null
UPDATE notifications SET category = 'system' WHERE category IS NULL;
UPDATE notifications SET severity = 'medium' WHERE severity IS NULL;
UPDATE notifications SET source = 'local' WHERE source IS NULL;