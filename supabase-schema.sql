-- ============================================
-- LEADHUNTER - Schéma de base de données
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: companies (Leads)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  coordinates JSONB, -- { lat: number, lng: number }
  phone VARCHAR(50),
  email VARCHAR(255),
  siret VARCHAR(20),
  sector VARCHAR(50),
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  
  -- Website info
  website TEXT,
  has_website BOOLEAN NOT NULL DEFAULT false,
  
  -- Scoring
  prospect_score INTEGER NOT NULL DEFAULT 50 CHECK (prospect_score >= 0 AND prospect_score <= 100),
  priority VARCHAR(10) NOT NULL DEFAULT 'warm' CHECK (priority IN ('hot', 'warm', 'cold')),
  
  -- CRM
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'meeting', 'proposal', 'won', 'lost')),
  last_contacted_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_companies_city ON companies(city);
CREATE INDEX idx_companies_postal_code ON companies(postal_code);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_priority ON companies(priority);
CREATE INDEX idx_companies_has_website ON companies(has_website);
CREATE INDEX idx_companies_prospect_score ON companies(prospect_score DESC);

-- ============================================
-- Table: website_audits
-- ============================================
CREATE TABLE website_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  
  -- Scores Lighthouse (0-100)
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
  seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  best_practices_score INTEGER CHECK (best_practices_score >= 0 AND best_practices_score <= 100),
  
  -- Technique
  is_https BOOLEAN NOT NULL DEFAULT false,
  is_mobile_friendly BOOLEAN NOT NULL DEFAULT false,
  load_time_ms INTEGER,
  
  -- Stack détectée
  cms VARCHAR(50),
  cms_version VARCHAR(20),
  framework VARCHAR(50),
  is_outdated BOOLEAN NOT NULL DEFAULT false,
  
  -- Visuel
  screenshot_url TEXT,
  
  -- Problèmes détectés (JSON array)
  issues JSONB NOT NULL DEFAULT '[]',
  
  -- Score global calculé
  overall_score INTEGER NOT NULL DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),
  
  audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(company_id)
);

CREATE INDEX idx_audits_company_id ON website_audits(company_id);
CREATE INDEX idx_audits_overall_score ON website_audits(overall_score);

-- ============================================
-- Table: notes
-- ============================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_company_id ON notes(company_id);

-- ============================================
-- Table: search_scans
-- ============================================
CREATE TABLE search_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query VARCHAR(255) NOT NULL,
  location JSONB NOT NULL, -- { lat, lng, radius }
  sector_filter VARCHAR(50),
  
  -- État
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Résultats
  companies_found INTEGER NOT NULL DEFAULT 0,
  companies_without_site INTEGER NOT NULL DEFAULT 0,
  companies_needing_refonte INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Erreur
  error_message TEXT
);

CREATE INDEX idx_scans_status ON search_scans(status);

-- ============================================
-- Triggers pour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (optionnel mais recommandé)
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_scans ENABLE ROW LEVEL SECURITY;

-- Policies permettant tout pour l'utilisateur authentifié (à ajuster selon tes besoins)
CREATE POLICY "Enable all for authenticated users" ON companies FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON website_audits FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON notes FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON search_scans FOR ALL USING (true);

-- ============================================
-- Données de test (optionnel)
-- ============================================
INSERT INTO companies (name, city, postal_code, sector, source, has_website, website, prospect_score, priority, status) VALUES
  ('Boulangerie Martin', 'Boulogne-Billancourt', '92100', 'retail', 'manual', false, NULL, 85, 'hot', 'new'),
  ('Restaurant Le Petit Nice', 'Boulogne-Billancourt', '92100', 'restaurant', 'manual', true, 'http://lepetitnice.fr', 70, 'warm', 'new'),
  ('Garage Auto Plus', 'Issy-les-Moulineaux', '92130', 'automotive', 'manual', true, 'http://autoplus92.com', 45, 'cold', 'contacted'),
  ('Coiffure Élégance', 'Boulogne-Billancourt', '92100', 'beauty', 'manual', false, NULL, 90, 'hot', 'new'),
  ('Cabinet Dr. Dupont', 'Meudon', '92190', 'health', 'manual', true, 'https://drdupont.fr', 30, 'cold', 'new');
