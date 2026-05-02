-- ============================================
-- LEADHUNTER - Schema de base de donnees
-- A executer dans Supabase SQL Editor
-- ============================================

-- Extension pour generer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: companies (Leads)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

  -- Google Maps data
  google_place_id TEXT,
  google_rating NUMERIC(2,1),
  google_reviews_count INTEGER,
  google_maps_url TEXT,

  -- Scoring
  prospect_score INTEGER NOT NULL DEFAULT 50 CHECK (prospect_score >= 0 AND prospect_score <= 100),
  priority VARCHAR(10) NOT NULL DEFAULT 'warm' CHECK (priority IN ('hot', 'warm', 'cold')),

  -- CRM
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'meeting', 'proposal', 'won', 'lost')),
  last_contacted_at TIMESTAMPTZ,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,
  opt_out_at TIMESTAMPTZ,
  opt_out_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table: blocked_recipients
-- Blacklist globale utilisateur pour eviter de recontacter un email
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_blocked_recipients_user_email ON blocked_recipients(user_id, email);

-- Index pour les recherches frequentes
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_postal_code ON companies(postal_code);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_priority ON companies(priority);
CREATE INDEX IF NOT EXISTS idx_companies_has_website ON companies(has_website);
CREATE INDEX IF NOT EXISTS idx_companies_prospect_score ON companies(prospect_score DESC);
CREATE INDEX IF NOT EXISTS idx_companies_google_place_id ON companies(user_id, google_place_id);

-- ============================================
-- Table: website_audits
-- ============================================
CREATE TABLE IF NOT EXISTS website_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

  -- Stack detectee
  cms VARCHAR(50),
  cms_version VARCHAR(20),
  framework VARCHAR(50),
  is_outdated BOOLEAN NOT NULL DEFAULT false,

  -- Visuel
  screenshot_url TEXT,

  -- Problemes detectes (JSON array)
  issues JSONB NOT NULL DEFAULT '[]',

  -- Score global calcule
  overall_score INTEGER NOT NULL DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),

  audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_audits_user_id ON website_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_company_id ON website_audits(company_id);
CREATE INDEX IF NOT EXISTS idx_audits_overall_score ON website_audits(overall_score);

-- ============================================
-- Table: notes
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_company_id ON notes(company_id);

-- ============================================
-- Table: search_scans
-- ============================================
CREATE TABLE IF NOT EXISTS search_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query VARCHAR(255) NOT NULL,
  location JSONB NOT NULL, -- { lat, lng, radius }
  sector_filter VARCHAR(50),

  -- Etat
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Resultats
  companies_found INTEGER NOT NULL DEFAULT 0,
  companies_without_site INTEGER NOT NULL DEFAULT 0,
  companies_needing_refonte INTEGER NOT NULL DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Erreur
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON search_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON search_scans(status);

-- ============================================
-- Table: outreach_settings
-- Profil d'envoi professionnel par utilisateur
-- ============================================
CREATE TABLE IF NOT EXISTS outreach_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name VARCHAR(120),
  sender_email VARCHAR(255),
  agency_name VARCHAR(160),
  agency_website TEXT,
  agency_phone VARCHAR(50),
  signature TEXT,
  reply_to VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_settings_sender_email ON outreach_settings(sender_email);

-- ============================================
-- Table: email_messages
-- Historique, envois et programmation email
-- ============================================
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  campaign_id UUID,

  recipient_email VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id VARCHAR(50),

  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  provider VARCHAR(50),
  provider_message_id TEXT,
  provider_event TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,

  followup_of UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  followup_delay_days INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_company_id ON email_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_scheduled_at ON email_messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_messages_provider_message_id ON email_messages(provider_message_id);

-- ============================================
-- Table: email_campaigns
-- Campagnes simples pour envois groupés et relances
-- ============================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled', 'failed')),
  template_id VARCHAR(50),
  filters JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  followup_delays INTEGER[] NOT NULL DEFAULT ARRAY[3,7],
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_messages_campaign_id_fkey'
  ) THEN
    ALTER TABLE email_messages
      ADD CONSTRAINT email_messages_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Table: admin_city_scans
-- Agregations Google Places multi-categories reservees admin
-- ============================================
CREATE TABLE IF NOT EXISTS admin_city_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city VARCHAR(160) NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  max_per_category INTEGER NOT NULL DEFAULT 60,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  places_found INTEGER NOT NULL DEFAULT 0,
  companies_created INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  estimated_api_cost_eur NUMERIC(8,2) NOT NULL DEFAULT 0,
  category_results JSONB NOT NULL DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_city_scans_user_id ON admin_city_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_city_scans_status ON admin_city_scans(status);

-- ============================================
-- Table: audit_jobs
-- Queue serveur pour audits PageSpeed
-- ============================================
CREATE TABLE IF NOT EXISTS audit_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_jobs_user_id ON audit_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_status ON audit_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_company_id ON audit_jobs(company_id);

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

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_city_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_recipients ENABLE ROW LEVEL SECURITY;

-- Policies : chaque utilisateur ne voit que ses propres donnees
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users see own companies') THEN
    CREATE POLICY "Users see own companies" ON companies FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'website_audits' AND policyname = 'Users see own audits') THEN
    CREATE POLICY "Users see own audits" ON website_audits FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users see own notes') THEN
    CREATE POLICY "Users see own notes" ON notes FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'search_scans' AND policyname = 'Users see own scans') THEN
    CREATE POLICY "Users see own scans" ON search_scans FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outreach_settings' AND policyname = 'Users see own outreach settings') THEN
    CREATE POLICY "Users see own outreach settings" ON outreach_settings FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_messages' AND policyname = 'Users see own email messages') THEN
    CREATE POLICY "Users see own email messages" ON email_messages FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_campaigns' AND policyname = 'Users see own email campaigns') THEN
    CREATE POLICY "Users see own email campaigns" ON email_campaigns FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_city_scans' AND policyname = 'Users see own admin city scans') THEN
    CREATE POLICY "Users see own admin city scans" ON admin_city_scans FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_jobs' AND policyname = 'Users see own audit jobs') THEN
    CREATE POLICY "Users see own audit jobs" ON audit_jobs FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_recipients' AND policyname = 'Users see own blocked recipients') THEN
    CREATE POLICY "Users see own blocked recipients" ON blocked_recipients FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
