-- ============================================
-- Migration 2026-11-10 (2) : liste d'appels choisie à la main
-- À exécuter dans l'éditeur SQL Supabase (idempotent), après supabase-migration-2026-11-10.sql
-- ============================================

-- Le lead a été coché « À appeler » dans la page Leads (null = pas dans la liste)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS call_list_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS companies_call_list_idx
  ON companies (user_id, call_list_at) WHERE call_list_at IS NOT NULL;
