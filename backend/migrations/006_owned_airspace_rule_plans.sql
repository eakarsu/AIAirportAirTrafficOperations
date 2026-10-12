-- Planning rules are private proposals. They do not establish airspace restrictions or authorization.
CREATE TABLE IF NOT EXISTS airspace_rule_plans (
 id SERIAL PRIMARY KEY, scope VARCHAR(40) NOT NULL, target VARCHAR(120) NOT NULL,
 rule_type VARCHAR(120) NOT NULL, detail TEXT, priority INTEGER CHECK(priority BETWEEN 1 AND 5),
 status VARCHAR(30) NOT NULL DEFAULT 'planning_draft', tenant_id TEXT, created_by INTEGER,
 record_kind TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_owned_airspace_rule_plans ON airspace_rule_plans(tenant_id,created_by,id);
