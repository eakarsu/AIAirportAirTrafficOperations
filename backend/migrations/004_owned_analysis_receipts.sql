-- Preserve older analysis rows; only actual new provider responses receive receipts.
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS provider_request_id TEXT;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS provider_model TEXT;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS result_text TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_airport_analysis ON ai_analyses(tenant_id,user_id,provider_request_id,id);
