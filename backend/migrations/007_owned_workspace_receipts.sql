-- Keep old reports intact; only genuinely receipted advisory drafts appear in current history.
CREATE TABLE IF NOT EXISTS ai_workspace_runs (
 id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, feature TEXT NOT NULL, input JSONB NOT NULL,
 result TEXT NOT NULL, result_json JSONB, model TEXT, usage JSONB,
 created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_workspace_runs ADD COLUMN IF NOT EXISTS provider_request_id TEXT;
ALTER TABLE ai_workspace_runs ADD COLUMN IF NOT EXISTS parent_id BIGINT;
ALTER TABLE ai_workspace_runs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_owned_workspace_history ON ai_workspace_runs(user_id,feature,id);
