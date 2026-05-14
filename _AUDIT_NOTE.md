# Audit Apply Note — AIAirportAirTrafficOperations

## Audit recommendations (from batch_00.md)

Substantive: 12 routes, 16 AI endpoints. Production-grade airport ops platform.

### Missing AI counterparts
- AI passenger experience optimization (crowd flow, connecting flights)
- AI revenue management (dynamic gate fees, slot pricing)

### Missing non-AI features
- Emergency response coordination (fire, medical, security)
- Third-party integration (airline systems, catering, ground services)
- Real-time ramp control

### Custom feature suggestions
- Real-time ADS-B feed
- Noise impact modeling
- Emergency response simulation
- Passenger experience optimization
- FAA NextGen, IATA, airline APIs

## Implemented in this pass

None. Substantive project; remaining items are large new subsystems or external integrations needing creds.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| AI passenger experience optimization | NEEDS-PRODUCT-DECISION | Connection-protection policy |
| AI revenue management | NEEDS-PRODUCT-DECISION | Dynamic pricing policy |
| Emergency response coordination | NEEDS-PRODUCT-DECISION | Multi-agency workflow |
| Third-party airline integration | NEEDS-CREDS | Airline APIs |
| ADS-B feed | NEEDS-CREDS | Flight-data subscription |
| FAA NextGen | NEEDS-CREDS | Government feeds |
| Noise impact modeling | TOO-RISKY | Acoustic propagation engine |
| Emergency response simulation | TOO-RISKY | Sim engine |

## Apply pass 4 (mechanical backlog)

SKIP. Every backlog item is tagged NEEDS-PRODUCT-DECISION (passenger-experience policy, revenue-management policy, multi-agency emergency workflow), NEEDS-CREDS (airline APIs, ADS-B feed subscription, FAA NextGen government feeds), or TOO-RISKY (acoustic propagation engine, sim engine). No mechanical-only additions remain.

## Apply pass 5 (all backlog)

8 features implemented (cap 10), all additive.

Backend (`backend/src/routes/ai.js` — appended; existing routes untouched):
- `POST /api/ai/passenger-experience` (NEEDS-PRODUCT-DECISION) — connection-protection policy: protect <=60min connection AND inbound delay >=15min. 503+missing:OPENROUTER_API_KEY.
- `POST /api/ai/revenue-management` (NEEDS-PRODUCT-DECISION) — base-fee floor + up to +50% surcharge; carrier discount cap 20%. 503+missing:OPENROUTER_API_KEY.
- `POST /api/ai/multi-agency-coordination` (NEEDS-PRODUCT-DECISION) — ICS-100 framework; primary agency by incident type. 503+missing:OPENROUTER_API_KEY.
- `GET /api/ai/adsb-live` (NEEDS-CREDS) — 503+missing:ADSB_API_KEY.
- `GET /api/ai/faa-nextgen` (NEEDS-CREDS) — 503+missing:FAA_NEXTGEN_API_KEY.
- `GET /api/ai/airline-partners` (NEEDS-CREDS) — 503+missing:AIRLINE_API_KEY.
- `POST /api/ai/noise-impact` (TOO-RISKY) — heuristic 1/r^2 stub; in-memory; replace with INM/AEDT for production.
- `POST /api/ai/emergency-simulation` (TOO-RISKY) — phase-timeline stub; in-memory; replace with discrete-event sim for production.

Frontend: new `frontend/src/pages/AIBacklogTools.js` page with tab selector for all 8 endpoints; registered at `/ai/backlog-tools` in `App.js`. JWT bearer from `localStorage`, surfaces `missing: <ENV>` on 503.

Smoke test (port 14801, OPENROUTER_API_KEY=""): admin@airport.com login → noise-impact 200, passenger-experience 503 with `missing:OPENROUTER_API_KEY`. Backend stopped.

Syntax check: `node --check` (BE) PASS; `@babel/parser` (FE jsx) PASS for App.js + AIBacklogTools.js.

## Apply pass 3 (frontend)

LEFT-AS-IS. The React frontend already exposes 20+ AI-driven pages (Dashboard, BaggageFlow, ConnectionAnalysis, CostOptimization, CrewCrossTraining, DelayPrediction, EmergencyResponse, GateAssignment, GroundCrew, IncidentPrediction, MaintenanceLogs, NotamBriefing, PassengerExperience, PredictiveMaintenance, RunwaySimulator, RunwayUtilization, ShiftHandover, Sustainability, TrafficForecast, WeatherRouting, …) each calling `/api/ai/*` with `Authorization: Bearer <token>` from `localStorage`. No pass-2 backend additions, so nothing new to surface.
