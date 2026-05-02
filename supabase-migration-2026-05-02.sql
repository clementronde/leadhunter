-- Migration incremental LeadHunter - outreach, campagnes, opt-out, audit queue
-- A executer dans Supabase SQL Editor sur une base existante.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opt_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opt_out_reason TEXT,
  ADD COLUMN IF NOT EXISTS audit_share_token UUID DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_audit_share_token ON companies(audit_share_token);

UPDATE companies
SET audit_share_token = uuid_generate_v4()
WHERE audit_share_token IS NULL;

CREATE TABLE IF NOT EXISTS blocked_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_blocked_recipients_user_email ON blocked_recipients(user_id, email);

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

CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
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

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS provider_event TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_company_id ON email_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_scheduled_at ON email_messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_messages_provider_message_id ON email_messages(provider_message_id);

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

ALTER TABLE outreach_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_city_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_recipients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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
