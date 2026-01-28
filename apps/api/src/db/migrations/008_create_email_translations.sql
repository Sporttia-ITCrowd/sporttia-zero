-- Email translations table for dynamic language support
CREATE TABLE IF NOT EXISTS email_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL,
  template_type VARCHAR(50) NOT NULL DEFAULT 'welcome',
  translations JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(language_code, template_type)
);

-- Index for quick language lookups
CREATE INDEX IF NOT EXISTS idx_email_translations_language ON email_translations(language_code, template_type);
