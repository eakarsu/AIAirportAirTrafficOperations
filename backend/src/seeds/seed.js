const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'airport_ops',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing tables
    await client.query(`
      DROP TABLE IF EXISTS maintenance_logs CASCADE;
      DROP TABLE IF EXISTS incident_reports CASCADE;
      DROP TABLE IF EXISTS weather_reports CASCADE;
      DROP TABLE IF EXISTS flight_schedule CASCADE;
      DROP TABLE IF EXISTS runway_utilization CASCADE;
      DROP TABLE IF EXISTS baggage_tracking CASCADE;
      DROP TABLE IF EXISTS delay_predictions CASCADE;
      DROP TABLE IF EXISTS ground_crews CASCADE;
      DROP TABLE IF EXISTS gate_assignments CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create gate_assignments table
    await client.query(`
      CREATE TABLE gate_assignments (
        id SERIAL PRIMARY KEY,
        flight_number VARCHAR(20) NOT NULL,
        airline VARCHAR(100) NOT NULL,
        gate_number VARCHAR(10) NOT NULL,
        terminal VARCHAR(5) NOT NULL,
        aircraft_type VARCHAR(50) NOT NULL,
        scheduled_time TIMESTAMP NOT NULL,
        status VARCHAR(30) DEFAULT 'scheduled',
        passenger_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create ground_crews table
    await client.query(`
      CREATE TABLE ground_crews (
        id SERIAL PRIMARY KEY,
        crew_name VARCHAR(100) NOT NULL,
        crew_type VARCHAR(50) NOT NULL,
        members_count INTEGER NOT NULL,
        shift_start TIMESTAMP NOT NULL,
        shift_end TIMESTAMP NOT NULL,
        assigned_terminal VARCHAR(5),
        status VARCHAR(30) DEFAULT 'available',
        specialization VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create delay_predictions table
    await client.query(`
      CREATE TABLE delay_predictions (
        id SERIAL PRIMARY KEY,
        flight_number VARCHAR(20) NOT NULL,
        airline VARCHAR(100) NOT NULL,
        origin VARCHAR(10) NOT NULL,
        destination VARCHAR(10) NOT NULL,
        scheduled_departure TIMESTAMP NOT NULL,
        predicted_delay_min INTEGER DEFAULT 0,
        delay_reason VARCHAR(255),
        confidence_score DECIMAL(3,2) DEFAULT 0.85,
        rebooking_suggested BOOLEAN DEFAULT false,
        affected_passengers INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create baggage_tracking table
    await client.query(`
      CREATE TABLE baggage_tracking (
        id SERIAL PRIMARY KEY,
        tag_id VARCHAR(20) UNIQUE NOT NULL,
        flight_number VARCHAR(20) NOT NULL,
        passenger_name VARCHAR(255) NOT NULL,
        origin VARCHAR(10) NOT NULL,
        destination VARCHAR(10) NOT NULL,
        current_location VARCHAR(100) NOT NULL,
        status VARCHAR(30) DEFAULT 'checked_in',
        weight_kg DECIMAL(5,2) DEFAULT 0,
        priority VARCHAR(20) DEFAULT 'normal',
        last_scan_time TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create runway_utilization table
    await client.query(`
      CREATE TABLE runway_utilization (
        id SERIAL PRIMARY KEY,
        runway_id VARCHAR(10) NOT NULL,
        flight_number VARCHAR(20) NOT NULL,
        operation_type VARCHAR(20) NOT NULL,
        aircraft_type VARCHAR(50) NOT NULL,
        scheduled_time TIMESTAMP NOT NULL,
        actual_time TIMESTAMP,
        wind_speed_knots INTEGER DEFAULT 0,
        visibility_miles DECIMAL(4,1) DEFAULT 10.0,
        status VARCHAR(30) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed users
    const passwordHash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
      ('Admin User', 'admin@airport.com', $1, 'admin'),
      ('John Operations', 'john@airport.com', $1, 'operator'),
      ('Sarah Controller', 'sarah@airport.com', $1, 'controller')
    `, [passwordHash]);

    // Create flight_schedule table
    await client.query(`
      CREATE TABLE flight_schedule (
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
        status VARCHAR(30) DEFAULT 'on_time',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create weather_reports table
    await client.query(`
      CREATE TABLE weather_reports (
        id SERIAL PRIMARY KEY,
        station_id VARCHAR(10) NOT NULL,
        report_type VARCHAR(20) DEFAULT 'METAR',
        temperature_c DECIMAL(5,1),
        wind_speed_knots INTEGER DEFAULT 0,
        wind_direction VARCHAR(10),
        visibility_miles DECIMAL(4,1) DEFAULT 10.0,
        ceiling_feet INTEGER,
        conditions VARCHAR(30) DEFAULT 'VFR',
        pressure_inhg DECIMAL(5,2),
        humidity_percent INTEGER,
        notam TEXT,
        reported_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create incident_reports table
    await client.query(`
      CREATE TABLE incident_reports (
        id SERIAL PRIMARY KEY,
        incident_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'low',
        location VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        reported_by VARCHAR(100) NOT NULL,
        flight_number VARCHAR(20),
        status VARCHAR(30) DEFAULT 'open',
        resolution TEXT,
        reported_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create maintenance_logs table
    await client.query(`
      CREATE TABLE maintenance_logs (
        id SERIAL PRIMARY KEY,
        equipment_type VARCHAR(50) NOT NULL,
        equipment_id VARCHAR(30) NOT NULL,
        maintenance_type VARCHAR(30) DEFAULT 'routine',
        description TEXT NOT NULL,
        assigned_to VARCHAR(100),
        scheduled_date TIMESTAMP NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(30) DEFAULT 'pending',
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed gate_assignments (15 items)
    await client.query(`
      INSERT INTO gate_assignments (flight_number, airline, gate_number, terminal, aircraft_type, scheduled_time, status, passenger_count) VALUES
      ('AA1234', 'American Airlines', 'A12', 'T1', 'Boeing 737-800', NOW() + INTERVAL '1 hour', 'boarding', 162),
      ('UA5678', 'United Airlines', 'B05', 'T2', 'Airbus A320', NOW() + INTERVAL '2 hours', 'scheduled', 180),
      ('DL9012', 'Delta Air Lines', 'C08', 'T3', 'Boeing 757-200', NOW() + INTERVAL '30 minutes', 'arrived', 200),
      ('SW3456', 'Southwest Airlines', 'A03', 'T1', 'Boeing 737 MAX 8', NOW() + INTERVAL '3 hours', 'scheduled', 175),
      ('BA7890', 'British Airways', 'D15', 'T4', 'Airbus A380', NOW() + INTERVAL '45 minutes', 'boarding', 525),
      ('LH2345', 'Lufthansa', 'D12', 'T4', 'Boeing 747-8', NOW() + INTERVAL '4 hours', 'scheduled', 410),
      ('AF6789', 'Air France', 'C03', 'T3', 'Airbus A350-900', NOW() + INTERVAL '1.5 hours', 'arrived', 315),
      ('EK1111', 'Emirates', 'D20', 'T4', 'Airbus A380', NOW() + INTERVAL '5 hours', 'scheduled', 555),
      ('JL2222', 'Japan Airlines', 'B10', 'T2', 'Boeing 787-9', NOW() + INTERVAL '2.5 hours', 'boarding', 290),
      ('QF3333', 'Qantas', 'C15', 'T3', 'Airbus A330-300', NOW() + INTERVAL '6 hours', 'scheduled', 297),
      ('AC4444', 'Air Canada', 'A08', 'T1', 'Boeing 777-300ER', NOW() + INTERVAL '1.5 hours', 'arrived', 396),
      ('SQ5555', 'Singapore Airlines', 'D18', 'T4', 'Airbus A350-900ULR', NOW() + INTERVAL '7 hours', 'scheduled', 253),
      ('NH6666', 'ANA', 'B12', 'T2', 'Boeing 787-10', NOW() + INTERVAL '3.5 hours', 'scheduled', 309),
      ('CX7777', 'Cathay Pacific', 'C10', 'T3', 'Airbus A350-1000', NOW() + INTERVAL '4.5 hours', 'scheduled', 334),
      ('TK8888', 'Turkish Airlines', 'A15', 'T1', 'Boeing 777-300ER', NOW() + INTERVAL '2 hours', 'boarding', 370)
    `);

    // Seed ground_crews (15 items)
    await client.query(`
      INSERT INTO ground_crews (crew_name, crew_type, members_count, shift_start, shift_end, assigned_terminal, status, specialization) VALUES
      ('Alpha Ramp', 'ramp', 8, NOW(), NOW() + INTERVAL '8 hours', 'T1', 'active', 'Wide-body aircraft handling'),
      ('Bravo Fueling', 'fueling', 5, NOW(), NOW() + INTERVAL '8 hours', 'T2', 'active', 'JET-A fuel systems'),
      ('Charlie Baggage', 'baggage', 10, NOW(), NOW() + INTERVAL '8 hours', 'T1', 'active', 'Automated baggage systems'),
      ('Delta Catering', 'catering', 6, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '10 hours', 'T3', 'standby', 'International catering'),
      ('Echo Maintenance', 'maintenance', 4, NOW(), NOW() + INTERVAL '12 hours', 'T4', 'active', 'Engine diagnostics'),
      ('Foxtrot Cleaning', 'cleaning', 12, NOW(), NOW() + INTERVAL '8 hours', 'T2', 'active', 'Quick turnaround cleaning'),
      ('Golf Ramp', 'ramp', 7, NOW() + INTERVAL '8 hours', NOW() + INTERVAL '16 hours', 'T1', 'scheduled', 'Narrow-body aircraft'),
      ('Hotel Pushback', 'pushback', 4, NOW(), NOW() + INTERVAL '8 hours', 'T3', 'active', 'Heavy aircraft pushback'),
      ('India De-icing', 'de-icing', 6, NOW(), NOW() + INTERVAL '10 hours', 'T4', 'standby', 'Type IV fluid application'),
      ('Juliet Cargo', 'cargo', 8, NOW(), NOW() + INTERVAL '8 hours', 'T2', 'active', 'Dangerous goods handling'),
      ('Kilo Security', 'security', 5, NOW(), NOW() + INTERVAL '12 hours', 'T1', 'active', 'Perimeter security'),
      ('Lima Fueling', 'fueling', 4, NOW() + INTERVAL '8 hours', NOW() + INTERVAL '16 hours', 'T3', 'scheduled', 'Hydrant fueling systems'),
      ('Mike Baggage', 'baggage', 9, NOW() + INTERVAL '8 hours', NOW() + INTERVAL '16 hours', 'T4', 'scheduled', 'Transfer baggage'),
      ('November Maintenance', 'maintenance', 6, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '16 hours', 'T2', 'standby', 'Avionics systems'),
      ('Oscar Ground Power', 'ground_support', 3, NOW(), NOW() + INTERVAL '8 hours', 'T1', 'active', 'GPU and air start units')
    `);

    // Seed delay_predictions (15 items)
    await client.query(`
      INSERT INTO delay_predictions (flight_number, airline, origin, destination, scheduled_departure, predicted_delay_min, delay_reason, confidence_score, rebooking_suggested, affected_passengers) VALUES
      ('AA1234', 'American Airlines', 'JFK', 'LAX', NOW() + INTERVAL '1 hour', 45, 'Weather - Thunderstorms at origin', 0.92, true, 162),
      ('UA5678', 'United Airlines', 'ORD', 'SFO', NOW() + INTERVAL '2 hours', 120, 'Mechanical issue - Landing gear inspection', 0.88, true, 180),
      ('DL9012', 'Delta Air Lines', 'ATL', 'BOS', NOW() + INTERVAL '30 minutes', 15, 'Air traffic congestion', 0.95, false, 200),
      ('SW3456', 'Southwest Airlines', 'DAL', 'MDW', NOW() + INTERVAL '3 hours', 0, 'No delays predicted', 0.98, false, 175),
      ('BA7890', 'British Airways', 'LHR', 'JFK', NOW() + INTERVAL '45 minutes', 90, 'Late incoming aircraft from London', 0.85, true, 525),
      ('LH2345', 'Lufthansa', 'FRA', 'JFK', NOW() + INTERVAL '4 hours', 30, 'Crew scheduling delay', 0.78, false, 410),
      ('AF6789', 'Air France', 'CDG', 'JFK', NOW() + INTERVAL '1.5 hours', 60, 'ATC strike - European airspace', 0.91, true, 315),
      ('EK1111', 'Emirates', 'DXB', 'JFK', NOW() + INTERVAL '5 hours', 0, 'No delays predicted', 0.97, false, 555),
      ('JL2222', 'Japan Airlines', 'NRT', 'JFK', NOW() + INTERVAL '2.5 hours', 25, 'Headwinds - Longer routing', 0.82, false, 290),
      ('QF3333', 'Qantas', 'SYD', 'LAX', NOW() + INTERVAL '6 hours', 180, 'Volcanic ash advisory - Pacific routing', 0.75, true, 297),
      ('AC4444', 'Air Canada', 'YYZ', 'JFK', NOW() + INTERVAL '1.5 hours', 10, 'Minor ground delay', 0.93, false, 396),
      ('SQ5555', 'Singapore Airlines', 'SIN', 'JFK', NOW() + INTERVAL '7 hours', 0, 'No delays predicted', 0.96, false, 253),
      ('NH6666', 'ANA', 'HND', 'JFK', NOW() + INTERVAL '3.5 hours', 55, 'Typhoon detour - Extended route', 0.87, true, 309),
      ('CX7777', 'Cathay Pacific', 'HKG', 'JFK', NOW() + INTERVAL '4.5 hours', 40, 'Congestion at destination', 0.84, false, 334),
      ('TK8888', 'Turkish Airlines', 'IST', 'JFK', NOW() + INTERVAL '2 hours', 75, 'Snow/ice operations at origin', 0.89, true, 370)
    `);

    // Seed baggage_tracking (15 items)
    await client.query(`
      INSERT INTO baggage_tracking (tag_id, flight_number, passenger_name, origin, destination, current_location, status, weight_kg, priority, last_scan_time) VALUES
      ('BAG-001-AA', 'AA1234', 'James Wilson', 'JFK', 'LAX', 'Terminal 1 - Belt 3', 'in_transit', 23.5, 'normal', NOW() - INTERVAL '15 minutes'),
      ('BAG-002-UA', 'UA5678', 'Maria Garcia', 'ORD', 'SFO', 'Check-in Counter B', 'checked_in', 18.2, 'normal', NOW() - INTERVAL '45 minutes'),
      ('BAG-003-DL', 'DL9012', 'Robert Chen', 'ATL', 'BOS', 'Cargo Hold - Aircraft', 'loaded', 25.0, 'fragile', NOW() - INTERVAL '10 minutes'),
      ('BAG-004-SW', 'SW3456', 'Emily Johnson', 'DAL', 'MDW', 'Security Screening', 'screening', 15.8, 'normal', NOW() - INTERVAL '30 minutes'),
      ('BAG-005-BA', 'BA7890', 'Oliver Smith', 'LHR', 'JFK', 'Transfer Zone T4-T1', 'transfer', 30.0, 'priority', NOW() - INTERVAL '5 minutes'),
      ('BAG-006-LH', 'LH2345', 'Sophie Mueller', 'FRA', 'JFK', 'Inbound Carousel 7', 'arriving', 22.0, 'normal', NOW() - INTERVAL '2 minutes'),
      ('BAG-007-AF', 'AF6789', 'Pierre Dubois', 'CDG', 'JFK', 'Customs Inspection', 'customs', 28.5, 'diplomatic', NOW() - INTERVAL '8 minutes'),
      ('BAG-008-EK', 'EK1111', 'Ahmed Hassan', 'DXB', 'JFK', 'Check-in Counter D', 'checked_in', 32.0, 'first_class', NOW() - INTERVAL '1 hour'),
      ('BAG-009-JL', 'JL2222', 'Yuki Tanaka', 'NRT', 'JFK', 'Terminal 2 - Sort Room', 'sorting', 20.0, 'normal', NOW() - INTERVAL '20 minutes'),
      ('BAG-010-QF', 'QF3333', 'Jack Thompson', 'SYD', 'LAX', 'Lost & Found', 'mishandled', 24.0, 'urgent', NOW() - INTERVAL '3 hours'),
      ('BAG-011-AC', 'AC4444', 'Lisa Brown', 'YYZ', 'JFK', 'Baggage Cart - Ramp', 'in_transit', 19.5, 'normal', NOW() - INTERVAL '12 minutes'),
      ('BAG-012-SQ', 'SQ5555', 'Wei Lin', 'SIN', 'JFK', 'Check-in Counter D', 'checked_in', 27.0, 'priority', NOW() - INTERVAL '2 hours'),
      ('BAG-013-NH', 'NH6666', 'Kenji Sato', 'HND', 'JFK', 'Terminal 2 - Belt 5', 'in_transit', 21.0, 'normal', NOW() - INTERVAL '18 minutes'),
      ('BAG-014-CX', 'CX7777', 'David Wong', 'HKG', 'JFK', 'Claim Area C', 'delivered', 26.0, 'normal', NOW() - INTERVAL '1 minute'),
      ('BAG-015-TK', 'TK8888', 'Ayse Yilmaz', 'IST', 'JFK', 'Oversized Baggage Area', 'in_transit', 35.0, 'oversized', NOW() - INTERVAL '25 minutes')
    `);

    // Seed runway_utilization (15 items)
    await client.query(`
      INSERT INTO runway_utilization (runway_id, flight_number, operation_type, aircraft_type, scheduled_time, actual_time, wind_speed_knots, visibility_miles, status) VALUES
      ('RWY-04L', 'AA1234', 'departure', 'Boeing 737-800', NOW() + INTERVAL '1 hour', NULL, 12, 10.0, 'scheduled'),
      ('RWY-22R', 'UA5678', 'arrival', 'Airbus A320', NOW() + INTERVAL '30 minutes', NULL, 15, 8.5, 'approach'),
      ('RWY-04L', 'DL9012', 'departure', 'Boeing 757-200', NOW() + INTERVAL '1.5 hours', NULL, 12, 10.0, 'scheduled'),
      ('RWY-13R', 'SW3456', 'arrival', 'Boeing 737 MAX 8', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '8 minutes', 8, 10.0, 'completed'),
      ('RWY-31L', 'BA7890', 'arrival', 'Airbus A380', NOW() + INTERVAL '20 minutes', NULL, 18, 7.0, 'approach'),
      ('RWY-04L', 'LH2345', 'departure', 'Boeing 747-8', NOW() + INTERVAL '4 hours', NULL, 10, 10.0, 'scheduled'),
      ('RWY-22R', 'AF6789', 'arrival', 'Airbus A350-900', NOW() + INTERVAL '45 minutes', NULL, 15, 8.5, 'approach'),
      ('RWY-13R', 'EK1111', 'arrival', 'Airbus A380', NOW() + INTERVAL '5 hours', NULL, 10, 10.0, 'scheduled'),
      ('RWY-31L', 'JL2222', 'departure', 'Boeing 787-9', NOW() + INTERVAL '3 hours', NULL, 14, 9.0, 'scheduled'),
      ('RWY-04L', 'QF3333', 'arrival', 'Airbus A330-300', NOW() + INTERVAL '6 hours', NULL, 8, 10.0, 'scheduled'),
      ('RWY-22R', 'AC4444', 'departure', 'Boeing 777-300ER', NOW() + INTERVAL '2 hours', NULL, 15, 8.5, 'taxiing'),
      ('RWY-13R', 'SQ5555', 'arrival', 'Airbus A350-900ULR', NOW() + INTERVAL '7 hours', NULL, 10, 10.0, 'scheduled'),
      ('RWY-31L', 'NH6666', 'departure', 'Boeing 787-10', NOW() + INTERVAL '4.5 hours', NULL, 14, 9.0, 'scheduled'),
      ('RWY-04L', 'CX7777', 'arrival', 'Airbus A350-1000', NOW() + INTERVAL '5.5 hours', NULL, 12, 10.0, 'scheduled'),
      ('RWY-22R', 'TK8888', 'departure', 'Boeing 777-300ER', NOW() + INTERVAL '2.5 hours', NULL, 15, 8.5, 'scheduled')
    `);

    // Seed flight_schedule (15 items)
    await client.query(`
      INSERT INTO flight_schedule (flight_number, airline, origin, destination, scheduled_time, flight_type, aircraft_type, terminal, gate, status) VALUES
      ('AA1234', 'American Airlines', 'JFK', 'LAX', NOW() + INTERVAL '1 hour', 'departure', 'Boeing 737-800', 'T1', 'A12', 'boarding'),
      ('UA5678', 'United Airlines', 'SFO', 'JFK', NOW() + INTERVAL '2 hours', 'arrival', 'Airbus A320', 'T2', 'B05', 'on_time'),
      ('DL9012', 'Delta Air Lines', 'JFK', 'ATL', NOW() + INTERVAL '30 minutes', 'departure', 'Boeing 757-200', 'T3', 'C08', 'delayed'),
      ('SW3456', 'Southwest Airlines', 'MDW', 'JFK', NOW() + INTERVAL '45 minutes', 'arrival', 'Boeing 737 MAX 8', 'T1', 'A03', 'on_time'),
      ('BA7890', 'British Airways', 'LHR', 'JFK', NOW() + INTERVAL '3 hours', 'arrival', 'Airbus A380', 'T4', 'D15', 'on_time'),
      ('LH2345', 'Lufthansa', 'JFK', 'FRA', NOW() + INTERVAL '4 hours', 'departure', 'Boeing 747-8', 'T4', 'D12', 'on_time'),
      ('AF6789', 'Air France', 'CDG', 'JFK', NOW() + INTERVAL '1.5 hours', 'arrival', 'Airbus A350-900', 'T3', 'C03', 'delayed'),
      ('EK1111', 'Emirates', 'JFK', 'DXB', NOW() + INTERVAL '5 hours', 'departure', 'Airbus A380', 'T4', 'D20', 'on_time'),
      ('JL2222', 'Japan Airlines', 'NRT', 'JFK', NOW() + INTERVAL '2.5 hours', 'arrival', 'Boeing 787-9', 'T2', 'B10', 'on_time'),
      ('QF3333', 'Qantas', 'JFK', 'SYD', NOW() + INTERVAL '6 hours', 'departure', 'Airbus A330-300', 'T3', 'C15', 'on_time'),
      ('AC4444', 'Air Canada', 'YYZ', 'JFK', NOW() - INTERVAL '10 minutes', 'arrival', 'Boeing 777-300ER', 'T1', 'A08', 'landed'),
      ('SQ5555', 'Singapore Airlines', 'JFK', 'SIN', NOW() + INTERVAL '7 hours', 'departure', 'Airbus A350-900ULR', 'T4', 'D18', 'on_time'),
      ('NH6666', 'ANA', 'HND', 'JFK', NOW() + INTERVAL '3.5 hours', 'arrival', 'Boeing 787-10', 'T2', 'B12', 'on_time'),
      ('CX7777', 'Cathay Pacific', 'JFK', 'HKG', NOW() + INTERVAL '4.5 hours', 'departure', 'Airbus A350-1000', 'T3', 'C10', 'on_time'),
      ('TK8888', 'Turkish Airlines', 'IST', 'JFK', NOW() + INTERVAL '2 hours', 'arrival', 'Boeing 777-300ER', 'T1', 'A15', 'diverted')
    `);

    // Seed weather_reports (10 items)
    await client.query(`
      INSERT INTO weather_reports (station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam, reported_at) VALUES
      ('KJFK', 'METAR', 18.5, 12, '270', 10.0, 25000, 'VFR', 29.92, 55, NULL, NOW()),
      ('KJFK', 'METAR', 17.8, 15, '280', 8.0, 12000, 'MVFR', 29.88, 68, NULL, NOW() - INTERVAL '1 hour'),
      ('KJFK', 'TAF', 16.0, 20, '290', 5.0, 8000, 'MVFR', 29.85, 75, 'Thunderstorm expected 18:00-22:00 UTC', NOW()),
      ('KLGA', 'METAR', 19.0, 10, '260', 10.0, 30000, 'VFR', 29.93, 50, NULL, NOW()),
      ('KLGA', 'METAR', 18.2, 14, '270', 7.0, 10000, 'MVFR', 29.89, 65, NULL, NOW() - INTERVAL '1 hour'),
      ('KEWR', 'METAR', 18.8, 8, '250', 10.0, 28000, 'VFR', 29.91, 52, NULL, NOW()),
      ('KEWR', 'TAF', 15.5, 25, '300', 3.0, 5000, 'IFR', 29.82, 82, 'Low visibility fog advisory 04:00-08:00 UTC', NOW()),
      ('KJFK', 'NOTAM', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RWY 04L/22R closed for maintenance 02:00-06:00 UTC Mar 22', NOW()),
      ('KJFK', 'NOTAM', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Taxiway Bravo intersection Charlie closed until further notice', NOW() - INTERVAL '2 hours'),
      ('KLGA', 'NOTAM', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ILS RWY 22 out of service. RNAV approaches available.', NOW() - INTERVAL '30 minutes')
    `);

    // Seed incident_reports (12 items)
    await client.query(`
      INSERT INTO incident_reports (incident_type, severity, location, description, reported_by, flight_number, status, resolution, reported_at) VALUES
      ('Bird Strike', 'medium', 'RWY 04L', 'Bird strike reported during takeoff roll. Aircraft returned to gate for inspection.', 'Tower Controller', 'AA1234', 'investigating', NULL, NOW() - INTERVAL '2 hours'),
      ('Ground Collision', 'high', 'Taxiway Alpha', 'Wing tip contact between two aircraft during taxi. No injuries.', 'Ground Control', 'DL9012', 'open', NULL, NOW() - INTERVAL '1 hour'),
      ('FOD', 'low', 'RWY 22R', 'Foreign object debris found on runway. Runway swept and cleared.', 'Ramp Supervisor', NULL, 'resolved', 'Runway swept by FOD team. Metal fragment recovered and logged.', NOW() - INTERVAL '4 hours'),
      ('Security Breach', 'critical', 'Terminal 2 - Gate B10', 'Unauthorized individual accessed secure airside area.', 'Airport Security', NULL, 'investigating', NULL, NOW() - INTERVAL '30 minutes'),
      ('Medical Emergency', 'high', 'Terminal 1 - Gate A05', 'Passenger medical emergency. EMS dispatched.', 'Gate Agent', 'SW3456', 'resolved', 'Patient transported to hospital. Flight delayed 45 min.', NOW() - INTERVAL '3 hours'),
      ('Fuel Spill', 'medium', 'Ramp Area T3', 'Minor fuel spill during refueling operation. Area contained.', 'Fueling Crew Lead', 'AF6789', 'resolved', 'Spill contained and cleaned per HAZMAT protocol. No environmental impact.', NOW() - INTERVAL '5 hours'),
      ('Runway Incursion', 'critical', 'RWY 13R/Taxiway Charlie', 'Vehicle crossed active runway without clearance.', 'Tower Controller', NULL, 'investigating', NULL, NOW() - INTERVAL '45 minutes'),
      ('Equipment Failure', 'low', 'Terminal 4 - Baggage Belt 3', 'Baggage carousel malfunction causing delays.', 'Maintenance Tech', NULL, 'resolved', 'Belt motor replaced. System restored.', NOW() - INTERVAL '6 hours'),
      ('Weather Diversion', 'medium', 'Airspace', 'Multiple aircraft diverted due to thunderstorm activity.', 'Approach Control', 'TK8888', 'open', NULL, NOW() - INTERVAL '1.5 hours'),
      ('Laser Strike', 'high', 'Final Approach RWY 22R', 'Pilot reported green laser illumination on final approach.', 'Pilot Report', 'BA7890', 'investigating', NULL, NOW() - INTERVAL '2.5 hours'),
      ('Baggage Mishandled', 'low', 'Terminal 3 - Sort Room', 'Batch of 12 bags missorted to wrong flight.', 'Baggage Handler', 'QF3333', 'resolved', 'Bags recovered and rerouted to correct flight.', NOW() - INTERVAL '7 hours'),
      ('ATC Communication', 'medium', 'Tower Frequency', 'Partial radio failure on tower primary frequency. Backup activated.', 'Tower Supervisor', NULL, 'resolved', 'Primary transmitter repaired. Backup frequency deactivated.', NOW() - INTERVAL '8 hours')
    `);

    // Seed maintenance_logs (12 items)
    await client.query(`
      INSERT INTO maintenance_logs (equipment_type, equipment_id, maintenance_type, description, assigned_to, scheduled_date, priority, status, location) VALUES
      ('Runway Lights', 'RWY-04L-LIGHTS', 'repair', 'Replace burned out edge lights on RWY 04L south section', 'Electrical Team Alpha', NOW() + INTERVAL '2 hours', 'high', 'scheduled', 'RWY 04L South'),
      ('Baggage Carousel', 'BC-T2-03', 'routine', 'Quarterly belt inspection and lubrication', 'Maintenance Team B', NOW() + INTERVAL '1 day', 'medium', 'pending', 'Terminal 2 - Carousel 3'),
      ('Jet Bridge', 'JB-T1-A12', 'repair', 'Hydraulic leak in jet bridge alignment system', 'Hydraulics Team', NOW(), 'high', 'in_progress', 'Terminal 1 - Gate A12'),
      ('HVAC System', 'HVAC-T3', 'routine', 'Annual HVAC filter replacement and duct cleaning', 'Facilities Team C', NOW() + INTERVAL '3 days', 'low', 'pending', 'Terminal 3 - Main Hall'),
      ('Radar System', 'ASR-11', 'inspection', 'Monthly radar calibration and performance check', 'Avionics Team', NOW() + INTERVAL '12 hours', 'critical', 'scheduled', 'Radar Tower'),
      ('Ground Power Unit', 'GPU-045', 'repair', 'GPU output voltage fluctuation. Needs regulator replacement.', 'GSE Maintenance', NOW() + INTERVAL '4 hours', 'medium', 'scheduled', 'GSE Yard'),
      ('Taxiway Signs', 'TWY-B-SIGNS', 'repair', 'Damaged taxiway signage at Bravo/Charlie intersection', 'Signage Team', NOW() + INTERVAL '6 hours', 'medium', 'pending', 'Taxiway Bravo'),
      ('Fire Truck', 'ARFF-03', 'routine', 'Annual pump and foam system certification test', 'ARFF Maintenance', NOW() + INTERVAL '2 days', 'high', 'scheduled', 'Fire Station 2'),
      ('ILS System', 'ILS-22R', 'inspection', 'FAA required ILS flight check and calibration', 'NavAids Team', NOW() + INTERVAL '5 days', 'critical', 'pending', 'RWY 22R Approach'),
      ('Elevator', 'ELEV-T4-07', 'repair', 'Intermittent door sensor fault causing delays', 'Elevator Contractor', NOW() + INTERVAL '8 hours', 'medium', 'scheduled', 'Terminal 4 - Concourse D'),
      ('De-icing Truck', 'DEICE-08', 'routine', 'Pre-season fluid system flush and nozzle calibration', 'GSE Maintenance', NOW() + INTERVAL '1 week', 'low', 'pending', 'De-icing Pad North'),
      ('Security Scanner', 'TSA-SCAN-T1-02', 'repair', 'Image quality degradation on CT scanner', 'TSA Tech Support', NOW() + INTERVAL '3 hours', 'high', 'in_progress', 'Terminal 1 - Checkpoint A')
    `);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with all data!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
