-- ============================================
-- Migration 2026-11-10 (3) : section « Non qualifiés / radiés »
-- À exécuter dans l'éditeur SQL Supabase (idempotent)
-- ============================================

-- Lead écarté à la main : pas qualifié, ou entreprise radiée / fermée définitivement
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS disqualified_reason VARCHAR(20)
    CHECK (disqualified_reason IN ('not_qualified', 'struck_off')),
  ADD COLUMN IF NOT EXISTS disqualified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS companies_disqualified_idx
  ON companies (user_id, disqualified_at) WHERE disqualified_at IS NOT NULL;
