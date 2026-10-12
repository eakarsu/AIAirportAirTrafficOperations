-- Retain the actual provider input and verified owned source references for new reports.
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS provider_prompt TEXT;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS source_references JSONB;
