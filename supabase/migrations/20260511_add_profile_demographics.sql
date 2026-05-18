-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add year/major/hometown columns to profiles
-- Date:      2026-05-11
-- Reason:    signup2.tsx writes these fields via upsert (lines 93-95, 116-118)
--            but the columns don't exist in production. Signup CRASHES for any
--            new user. This unblocks the May 24 launch.
-- ═══════════════════════════════════════════════════════════════════════════
-- HOW TO APPLY:
--   1. Open https://supabase.com/dashboard/project/qlulzatkhgblorbjndsz/sql/new
--   2. Paste this entire file
--   3. Click "Run"
--   4. Verify with: select column_name from information_schema.columns
--                     where table_name = 'profiles' and column_name in
--                     ('year','major','hometown');
-- ═══════════════════════════════════════════════════════════════════════════

alter table profiles
  add column if not exists year     text check (char_length(year) <= 10),
  add column if not exists major    text check (char_length(major) <= 80),
  add column if not exists hometown text check (char_length(hometown) <= 80);

-- No index needed — these are read with the rest of the profile row, never queried alone.
