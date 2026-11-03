-- ============================================
-- Migration 2026-11-02 : qualification & relances
-- À exécuter dans l'éditeur SQL Supabase (idempotent)
-- ============================================

-- Présence web réelle : un lien Facebook / PagesJaunes n'est pas un site
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS web_presence VARCHAR(20) NOT NULL DEFAULT 'unknown'
    CHECK (web_presence IN ('website', 'social', 'directory', 'none', 'unknown')),
  ADD COLUMN IF NOT EXISTS social_url TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_reasons JSONB NOT NULL DEFAULT '[]';

-- Rétro-remplissage des leads existants
UPDATE companies SET web_presence = 'website' WHERE has_website = true AND web_presence = 'unknown';
UPDATE companies SET web_presence = 'none'
  WHERE has_website = false AND source = 'google_places' AND web_presence = 'unknown';

-- Les liens réseaux sociaux / annuaires déjà enregistrés comme "site"
UPDATE companies
SET social_url = website,
    website = NULL,
    has_website = false,
    web_presence = CASE
      WHEN website ~* '(pagesjaunes|yelp|tripadvisor|thefork|lafourchette|doctolib|planity|treatwell|houzz|annuaire|societe\.com|justacote)' THEN 'directory'
      ELSE 'social'
    END
WHERE website ~* '(facebook\.com|fb\.me|instagram\.com|linkedin\.com|linktr\.ee|tiktok\.com|twitter\.com|//(www\.)?x\.com|youtube\.com|pagesjaunes|yelp|tripadvisor|thefork|lafourchette|doctolib|planity|treatwell|houzz|business\.site|sites\.google\.com|annuaire|societe\.com|justacote)';

-- Signaux d'ancienneté du site
ALTER TABLE website_audits
  ADD COLUMN IF NOT EXISTS copyright_year INTEGER,
  ADD COLUMN IF NOT EXISTS site_signals JSONB NOT NULL DEFAULT '{}';

-- Templates email partagés entre appareils (au lieu du localStorage)
ALTER TABLE outreach_settings
  ADD COLUMN IF NOT EXISTS email_templates JSONB;

CREATE INDEX IF NOT EXISTS companies_user_status_score_idx
  ON companies (user_id, status, prospect_score DESC);
