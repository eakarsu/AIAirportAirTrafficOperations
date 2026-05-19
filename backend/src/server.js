const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security: helmet sets HTTP response headers (CSP, HSTS, etc.)
app.use(helmet());

// CORS: env-driven allowed origins (comma separated)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gates', require('./routes/gates'));
app.use('/api/crews', require('./routes/crews'));
app.use('/api/delays', require('./routes/delays'));
app.use('/api/baggage', require('./routes/baggage'));
app.use('/api/runways', require('./routes/runways'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/ai', require('./routes/ai'));

// Map new AI feature routes into the server for clarity
// All new AI endpoints are in routes/ai.js under /api/ai/*

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const { initDb } = require('./db');

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✈️  Airport Operations Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// BATCH_00_AUDIT_MOUNTS
app.use('/api/adsb-feed', require('./routes/adsbFeed'));
app.use('/api/noise-impact', require('./routes/noiseImpact'));
app.use('/api/emergency-sim', require('./routes/emergencySim'));
app.use('/api/passenger-experience', require('./routes/passengerExperience'));
app.use('/api/faa-iata-bridge', require('./routes/faaIataBridge'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-passenger-experience-optimization-crowd', require('./routes/gap_ai_passenger_experience_optimization_crowd'));
app.use('/api/gap-ai-revenue-management-dynamic-gate', require('./routes/gap_ai_revenue_management_dynamic_gate'));
app.use('/api/gap-ai-ramp-vehicle-routing-optimization', require('./routes/gap_ai_ramp_vehicle_routing_optimization'));
app.use('/api/gap-ai-weather-rerouting-beyond-basic', require('./routes/gap_ai_weather_rerouting_beyond_basic'));
app.use('/api/gap-emergency-response-coordination-module-fire', require('./routes/gap_emergency_response_coordination_module_fire'));
app.use('/api/gap-real-time-ramp-control-tarmac', require('./routes/gap_real_time_ramp_control_tarmac'));
app.use('/api/gap-outbound-webhooks-airline-catering-systems', require('./routes/gap_outbound_webhooks_airline_catering_systems'));
app.use('/api/gap-passenger-flow-iot-sensor-integration', require('./routes/gap_passenger_flow_iot_sensor_integration'));
app.use('/api/gap-customer-facing-flight-status-portal', require('./routes/gap_customer_facing_flight_status_portal'));

// ATC Custom Views (4 endpoints)
app.use('/api/custom-views', require('./routes/customViews'));

// Serve frontend build (SPA fallback) when available
const path = require('path');
const fs = require('fs');
const buildDir = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}
