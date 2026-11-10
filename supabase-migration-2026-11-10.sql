-- ============================================
-- Migration 2026-11-10 : session d'appels
-- À exécuter dans l'éditeur SQL Supabase (idempotent)
-- ============================================

-- Suivi des appels : on n'appelle jamais deux fois le même prospect par erreur
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS call_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_call_outcome VARCHAR(20)
    CHECK (last_call_outcome IN ('meeting', 'interested', 'callback', 'no_answer', 'not_interested', 'wrong_number')),
  ADD COLUMN IF NOT EXISTS callback_at TIMESTAMPTZ;

-- File d'appels : jamais appelés, triés par score
CREATE INDEX IF NOT EXISTS companies_call_queue_idx
  ON companies (user_id, prospect_score DESC) WHERE last_call_at IS NULL AND phone IS NOT NULL;

-- Rappels dus
CREATE INDEX IF NOT EXISTS companies_callback_idx
  ON companies (user_id, callback_at) WHERE callback_at IS NOT NULL;
