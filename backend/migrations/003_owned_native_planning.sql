-- Add compatible native planning domains without dropping or claiming ownership of existing rows.
CREATE TABLE IF NOT EXISTS flight_schedule (
        id SERIAL PRIMARY KEY,
        flight_number VARCHAR(20) NOT NULL,
        airline VARCHAR(100) NOT NULL,
        origin VARCHAR(10) NOT NULL,
        destination VARCHAR(10) NOT NULL,
        scheduled_time TIMESTAMP NOT NULL,
        flight_type VARCHAR(20) NOT NULL DEFAULT 'departure',
        aircraft_type VARCHAR(50) NOT NULL,
        terminal VARCHAR(5),
        gate VARCHAR(10),
        status VARCHAR(30) DEFAULT 'planning_draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE flight_schedule ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE flight_schedule ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE flight_schedule ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_flight_schedule ON flight_schedule(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS gate_assignments (
        id SERIAL PRIMARY KEY,
        flight_number VARCHAR(20) NOT NULL,
        airline VARCHAR(100) NOT NULL,
        gate_number VARCHAR(10) NOT NULL,
        terminal VARCHAR(5) NOT NULL,
        aircraft_type VARCHAR(50) NOT NULL,
        scheduled_time TIMESTAMP NOT NULL,
        status VARCHAR(30) DEFAULT 'planning_draft',
        passenger_count INTEGER ,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE gate_assignments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE gate_assignments ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE gate_assignments ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_gate_assignments ON gate_assignments(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS ground_crews (
        id SERIAL PRIMARY KEY,
        crew_name VARCHAR(100) NOT NULL,
        crew_type VARCHAR(50) NOT NULL,
        members_count INTEGER NOT NULL,
        shift_start TIMESTAMP NOT NULL,
        shift_end TIMESTAMP NOT NULL,
        assigned_terminal VARCHAR(5),
        status VARCHAR(30) DEFAULT 'planning_draft',
        specialization VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE ground_crews ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE ground_crews ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE ground_crews ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_ground_crews ON ground_crews(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS delay_predictions (
        id SERIAL PRIMARY KEY,
        flight_number VARCHAR(20) NOT NULL,
        airline VARCHAR(100) NOT NULL,
        origin VARCHAR(10) NOT NULL,
        destination VARCHAR(10) NOT NULL,
        scheduled_departure TIMESTAMP NOT NULL,
        predicted_delay_min INTEGER ,
        delay_reason VARCHAR(255),
        confidence_score DECIMAL(3,2) ,
        rebooking_suggested BOOLEAN ,
        affected_passengers INTEGER ,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE delay_predictions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE delay_predictions ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE delay_predictions ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_delay_predictions ON delay_predictions(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS baggage_tracking (
        id SERIAL PRIMARY KEY,
        tag_id VARCHAR(20) UNIQUE NOT NULL,
        flight_number VARCHAR(20) NOT NULL,
        passenger_name VARCHAR(255) NOT NULL,
        origin VARCHAR(10) NOT NULL,
        destination VARCHAR(10) NOT NULL,
        current_location VARCHAR(100) NOT NULL,
        status VARCHAR(30) DEFAULT 'planning_draft',
        weight_kg DECIMAL(5,2) ,
        priority VARCHAR(20) DEFAULT 'normal',
        last_scan_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE baggage_tracking ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE baggage_tracking ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE baggage_tracking ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_baggage_tracking ON baggage_tracking(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS runway_utilization (
        id SERIAL PRIMARY KEY,
        runway_id VARCHAR(10) NOT NULL,
        flight_number VARCHAR(20) NOT NULL,
        operation_type VARCHAR(20) NOT NULL,
        aircraft_type VARCHAR(50) NOT NULL,
        scheduled_time TIMESTAMP NOT NULL,
        actual_time TIMESTAMP,
        wind_speed_knots INTEGER ,
        visibility_miles DECIMAL(4,1) ,
        status VARCHAR(30) DEFAULT 'planning_draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE runway_utilization ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE runway_utilization ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE runway_utilization ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_runway_utilization ON runway_utilization(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS weather_reports (
        id SERIAL PRIMARY KEY,
        station_id VARCHAR(10) NOT NULL,
        report_type VARCHAR(20) DEFAULT 'METAR',
        temperature_c DECIMAL(5,1),
        wind_speed_knots INTEGER ,
        wind_direction VARCHAR(10),
        visibility_miles DECIMAL(4,1) ,
        ceiling_feet INTEGER,
        conditions VARCHAR(30) DEFAULT 'VFR',
        pressure_inhg DECIMAL(5,2),
        humidity_percent INTEGER,
        notam TEXT,
        reported_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_weather_reports ON weather_reports(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS incident_reports (
        id SERIAL PRIMARY KEY,
        incident_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'low',
        location VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        reported_by VARCHAR(100) NOT NULL,
        flight_number VARCHAR(20),
        status VARCHAR(30) DEFAULT 'planning_draft',
        resolution TEXT,
        reported_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_incident_reports ON incident_reports(tenant_id,created_by,id);
CREATE TABLE IF NOT EXISTS maintenance_logs (
        id SERIAL PRIMARY KEY,
        equipment_type VARCHAR(50) NOT NULL,
        equipment_id VARCHAR(30) NOT NULL,
        maintenance_type VARCHAR(30) DEFAULT 'routine',
        description TEXT NOT NULL,
        assigned_to VARCHAR(100),
        scheduled_date TIMESTAMP NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(30) DEFAULT 'planning_draft',
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS record_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_owned_maintenance_logs ON maintenance_logs(tenant_id,created_by,id);
