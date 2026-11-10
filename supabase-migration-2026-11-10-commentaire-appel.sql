-- ============================================
-- Migration 2026-11-10 (4) : commentaire sur les cartes de la page Appels
-- À exécuter dans l'éditeur SQL Supabase (idempotent)
-- ============================================

-- Pourquoi on le rappelle, ce qu'on attend de lui… (visible sur la carte)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS call_comment TEXT;
