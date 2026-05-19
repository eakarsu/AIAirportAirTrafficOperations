// ATC Custom Views — domain: airport air-traffic operations
// 4 endpoints powering the ATC Views frontend section:
//  - GET  /runway-timeline         (VIZ) arrivals/departures lane timeline
//  - GET  /sector-load-heatmap     (VIZ) airspace sector × time-of-day load heatmap
//  - GET  /flight-plan-pdf         (NON-VIZ) downloadable ICAO flight plan PDF
//  - GET/POST/PUT/DELETE /airspace-rules  (NON-VIZ) airspace & runway rules CRUD
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

let pool = null;
try { pool = require('../db'); } catch (e) { pool = null; }

// ----------------- helpers -----------------
function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// In-memory store for airspace/runway rules (survives during process lifetime).
// Persisting to Postgres is optional; the rules table can be unreliable without
// migrations, so we keep a stable demo store and only attempt DB writes when
// the table is present.
const RULES_STORE = (() => {
  const seed = [
    { id: 1, scope: 'runway', target: '09L', rule_type: 'noise_abatement', detail: 'No takeoffs 23:00-06:00 local', priority: 1, active: true },
    { id: 2, scope: 'runway', target: '27R', rule_type: 'wake_separation', detail: 'Heavy after heavy: 2 minutes spacing', priority: 2, active: true },
    { id: 3, scope: 'sector', target: 'SECTOR-N', rule_type: 'capacity_cap', detail: 'Max 24 aircraft/hour during convective WX', priority: 3, active: true },
    { id: 4, scope: 'sector', target: 'SECTOR-E', rule_type: 'altitude_floor', detail: 'Maintain FL250 minimum below busy arrival flow', priority: 2, active: true },
    { id: 5, scope: 'airspace', target: 'TMA-CTR', rule_type: 'speed_limit', detail: '250 KIAS below 10000 ft', priority: 1, active: true },
  ];
  return { items: seed, nextId: seed.length + 1 };
})();

// Optional Postgres-backed CRUD: lazy-create table if available.
async function ensureRulesTable() {
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS atc_airspace_rules (
        id SERIAL PRIMARY KEY,
        scope VARCHAR(40) NOT NULL,
        target VARCHAR(80) NOT NULL,
        rule_type VARCHAR(80) NOT NULL,
        detail TEXT,
        priority INTEGER NOT NULL DEFAULT 3,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    return true;
  } catch (_) { return false; }
}

// ============== 1. VIZ: runway timeline (arrivals / departures) ==============
router.get('/runway-timeline', authenticateToken, async (req, res) => {
  try {
    const runways = ['09L', '09R', '27L', '27R'];
    const now = new Date();
    const windowMinutes = 120; // 2-hour timeline
    const rand = seededRand(hashString(now.toISOString().slice(0, 13)));

    // Build operations: try DB first, then synthesize.
    let ops = [];
    if (pool) {
      try {
        const r = await pool.query(
          `SELECT id, flight_number, airline, scheduled_departure, status
           FROM flights ORDER BY scheduled_departure ASC LIMIT 40`
        );
        ops = r.rows.map((f, i) => {
          const startMin = i * 6 + Math.floor(rand() * 4);
          const isArrival = i % 2 === 0;
          return {
            id: f.id,
            flight: f.flight_number,
            airline: f.airline,
            type: isArrival ? 'arrival' : 'departure',
            runway: runways[i % runways.length],
            start_min: startMin,
            duration_min: 2 + Math.floor(rand() * 3),
            status: f.status,
          };
        });
      } catch (_) { ops = []; }
    }
    if (ops.length === 0) {
      const airlines = ['DLH', 'BAW', 'AAL', 'UAL', 'AFR', 'KLM', 'QFA', 'SIA'];
      for (let i = 0; i < 40; i++) {
        const isArrival = i % 2 === 0;
        ops.push({
          id: i + 1,
          flight: `${airlines[i % airlines.length]}${100 + i}`,
          airline: airlines[i % airlines.length],
          type: isArrival ? 'arrival' : 'departure',
          runway: runways[i % runways.length],
          start_min: Math.floor(i * (windowMinutes / 40) + rand() * 3),
          duration_min: 2 + Math.floor(rand() * 3),
          status: ['on_time', 'delayed', 'on_time', 'on_time'][Math.floor(rand() * 4)],
        });
      }
    }

    // Aggregate per-runway lanes.
    const lanes = runways.map((rwy) => ({
      runway: rwy,
      arrivals: ops.filter(o => o.runway === rwy && o.type === 'arrival').length,
      departures: ops.filter(o => o.runway === rwy && o.type === 'departure').length,
      ops: ops.filter(o => o.runway === rwy).map(o => ({
        flight: o.flight,
        type: o.type,
        start_min: o.start_min,
        duration_min: o.duration_min,
        status: o.status,
      })),
    }));

    res.json({
      generated_at: now.toISOString(),
      window_minutes: windowMinutes,
      runways,
      lanes,
      totals: {
        arrivals: ops.filter(o => o.type === 'arrival').length,
        departures: ops.filter(o => o.type === 'departure').length,
        ops_total: ops.length,
      },
      summary: 'Per-runway operations timeline for the next 2 hours.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== 2. VIZ: sector-load heatmap (airspace sector × hour) ==============
router.get('/sector-load-heatmap', authenticateToken, async (req, res) => {
  try {
    const sectors = ['SECTOR-N', 'SECTOR-E', 'SECTOR-S', 'SECTOR-W', 'TMA-CTR', 'OCEANIC'];
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const rand = seededRand(hashString(new Date().toISOString().slice(0, 10)));

    let baselineByHour = new Array(24).fill(0);
    if (pool) {
      try {
        const r = await pool.query(
          `SELECT EXTRACT(HOUR FROM scheduled_departure)::int AS h, COUNT(*) AS c
           FROM flights GROUP BY h ORDER BY h`
        );
        r.rows.forEach(row => { baselineByHour[row.h] = parseInt(row.c, 10); });
      } catch (_) {}
    }

    const matrix = sectors.map((sec, si) => hours.map(h => {
      const base = baselineByHour[h] || 1;
      const peakBoost = (h >= 6 && h <= 9) || (h >= 16 && h <= 20) ? 14 : 5;
      const sectorBias = (si % 3) * 2;
      const load = Math.max(0, Math.floor(rand() * peakBoost + base * 0.7 + sectorBias));
      return load;
    }));

    // Find worst cell.
    let worst = { sector: sectors[0], hour: 0, load: -1 };
    matrix.forEach((row, si) => row.forEach((v, hi) => {
      if (v > worst.load) worst = { sector: sectors[si], hour: hi, load: v };
    }));

    const flat = matrix.flat();
    res.json({
      generated_at: new Date().toISOString(),
      sectors,
      hours,
      matrix,
      max_load: Math.max(...flat),
      mean_load: Number((flat.reduce((a, b) => a + b, 0) / flat.length).toFixed(1)),
      worst_window: worst,
      unit: 'aircraft_in_sector',
      summary: 'Airspace sector load (aircraft count) by hour of day; rows=sector, cols=hour.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== 3. NON-VIZ: flight plan PDF ==============
function buildMinimalPdf(textLines) {
  const lines = textLines.slice(0, 70);
  const stream = [
    'BT',
    '/F1 11 Tf',
    '60 770 Td',
    '14 TL',
    ...lines.map((ln, i) => {
      const safe = String(ln).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').slice(0, 110);
      return i === 0 ? `(${safe}) Tj` : `T* (${safe}) Tj`;
    }),
    'ET',
  ].join('\n');

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj');
  objects.push(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

router.get('/flight-plan-pdf', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const callsign = (req.query.callsign || 'DLH441').toString().slice(0, 12);
    const dep = (req.query.dep || 'EDDF').toString().slice(0, 4).toUpperCase();
    const arr = (req.query.arr || 'KJFK').toString().slice(0, 4).toUpperCase();
    const acft = (req.query.acft || 'B748').toString().slice(0, 4).toUpperCase();
    const rand = seededRand(hashString(callsign + dep + arr));

    const route = [
      'TOBAK UN850 RESIA',
      'UN851 LIRSY UM611 BIBAG',
      'NATA RESNO 5550N/01000W 5650N/02000W',
      '5750N/03000W 5750N/04000W 5740N/05000W',
      'PORTI N289B JANJO DCT KJFK',
    ];

    const cruise = `FL${360 + Math.floor(rand() * 4) * 20}`;
    const tas = 460 + Math.floor(rand() * 30);
    const eet = `${(7 + Math.floor(rand() * 2)).toString().padStart(2, '0')}${Math.floor(rand() * 60).toString().padStart(2, '0')}`;
    const fuel = `${(8 + Math.floor(rand() * 2)).toString().padStart(2, '0')}${Math.floor(rand() * 60).toString().padStart(2, '0')}`;

    const lines = [
      'ICAO FLIGHT PLAN (FORM FPL)',
      `Filed: ${now.toISOString()}`,
      `Filed-By: ${req.user?.name || req.user?.email || 'on-duty controller'}`,
      '------------------------------------------------------------',
      `7  AIRCRAFT IDENT:        ${callsign}`,
      `8  FLIGHT RULES / TYPE:   I  / S  (Scheduled)`,
      `9  NUMBER / TYPE / WAKE:  1  / ${acft} / H`,
      `10 EQUIPMENT:             SDE2E3FGHIRWY/LB1`,
      `13 DEPARTURE / TIME:      ${dep} / ${now.toISOString().slice(11, 16).replace(':', '')}`,
      `15 CRUISE / SPEED / ROUTE: ${cruise}  N0${tas}`,
      ...route.map(r => `   ROUTE: ${r}`),
      `16 DESTINATION / EET / ALT: ${arr} / ${eet} / CYYR CYQX`,
      `18 OTHER INFO:            PBN/A1B1C1D1L1O1 DOF/${now.toISOString().slice(2,10).replace(/-/g,'')} REG/DALCD`,
      `19 ENDURANCE / PERSONS:   E/${fuel} P/372`,
      `   EMERGENCY RADIO:       UHF VHF ELT`,
      `   SURVIVAL EQUIPMENT:    POLAR DESERT MARITIME JUNGLE`,
      '------------------------------------------------------------',
      'REMARKS:',
      'RVSM EQUIPPED  /  CPDLC ATN-B1  /  ADS-B OUT 1090ES',
      'AUTHORIZED BY: TOWER SUPERVISOR',
    ];

    if (req.query.format === 'json') {
      return res.json({
        generated_at: now.toISOString(),
        callsign, dep, arr, acft, cruise, tas, eet, fuel,
        lines,
      });
    }

    const pdf = buildMinimalPdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="flight-plan-${callsign}-${now.toISOString().slice(0,10)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== 4. NON-VIZ: airspace / runway rules CRUD ==============
router.get('/airspace-rules', authenticateToken, async (req, res) => {
  try {
    const dbOk = await ensureRulesTable();
    if (dbOk) {
      try {
        const r = await pool.query(
          `SELECT id, scope, target, rule_type, detail, priority, active, created_at, updated_at
           FROM atc_airspace_rules ORDER BY priority ASC, id ASC`
        );
        if (r.rows.length === 0) {
          // Seed table on first read so the UI is never empty.
          for (const it of RULES_STORE.items) {
            await pool.query(
              `INSERT INTO atc_airspace_rules (scope, target, rule_type, detail, priority, active)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [it.scope, it.target, it.rule_type, it.detail, it.priority, it.active]
            );
          }
          const r2 = await pool.query(
            `SELECT id, scope, target, rule_type, detail, priority, active, created_at, updated_at
             FROM atc_airspace_rules ORDER BY priority ASC, id ASC`
          );
          return res.json({ generated_at: new Date().toISOString(), source: 'db', rules: r2.rows });
        }
        return res.json({ generated_at: new Date().toISOString(), source: 'db', rules: r.rows });
      } catch (_) { /* fall through */ }
    }
    res.json({ generated_at: new Date().toISOString(), source: 'memory', rules: RULES_STORE.items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/airspace-rules', authenticateToken, async (req, res) => {
  try {
    const { scope, target, rule_type, detail, priority, active } = req.body || {};
    if (!scope || !target || !rule_type) {
      return res.status(400).json({ error: 'scope, target, and rule_type are required' });
    }
    const payload = {
      scope: String(scope).slice(0, 40),
      target: String(target).slice(0, 80),
      rule_type: String(rule_type).slice(0, 80),
      detail: detail ? String(detail).slice(0, 1000) : null,
      priority: Number.isFinite(+priority) ? +priority : 3,
      active: active === undefined ? true : !!active,
    };
    const dbOk = await ensureRulesTable();
    if (dbOk) {
      try {
        const r = await pool.query(
          `INSERT INTO atc_airspace_rules (scope, target, rule_type, detail, priority, active)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [payload.scope, payload.target, payload.rule_type, payload.detail, payload.priority, payload.active]
        );
        return res.status(201).json({ ok: true, rule: r.rows[0] });
      } catch (_) { /* fall through */ }
    }
    const item = { id: RULES_STORE.nextId++, ...payload };
    RULES_STORE.items.push(item);
    res.status(201).json({ ok: true, rule: item, note: 'Stored in memory; DB unavailable.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/airspace-rules/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const { scope, target, rule_type, detail, priority, active } = req.body || {};
    const dbOk = await ensureRulesTable();
    if (dbOk) {
      try {
        const r = await pool.query(
          `UPDATE atc_airspace_rules
             SET scope = COALESCE($1, scope),
                 target = COALESCE($2, target),
                 rule_type = COALESCE($3, rule_type),
                 detail = COALESCE($4, detail),
                 priority = COALESCE($5, priority),
                 active = COALESCE($6, active),
                 updated_at = NOW()
             WHERE id = $7 RETURNING *`,
          [scope || null, target || null, rule_type || null,
           detail === undefined ? null : detail,
           priority === undefined ? null : +priority,
           active === undefined ? null : !!active,
           id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
        return res.json({ ok: true, rule: r.rows[0] });
      } catch (_) { /* fall through */ }
    }
    const it = RULES_STORE.items.find(x => x.id === id);
    if (!it) return res.status(404).json({ error: 'Rule not found' });
    if (scope !== undefined) it.scope = String(scope).slice(0, 40);
    if (target !== undefined) it.target = String(target).slice(0, 80);
    if (rule_type !== undefined) it.rule_type = String(rule_type).slice(0, 80);
    if (detail !== undefined) it.detail = detail ? String(detail).slice(0, 1000) : null;
    if (priority !== undefined) it.priority = +priority;
    if (active !== undefined) it.active = !!active;
    res.json({ ok: true, rule: it });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/airspace-rules/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const dbOk = await ensureRulesTable();
    if (dbOk) {
      try {
        const r = await pool.query(`DELETE FROM atc_airspace_rules WHERE id = $1 RETURNING id`, [id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
        return res.json({ ok: true, id });
      } catch (_) { /* fall through */ }
    }
    const idx = RULES_STORE.items.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
    RULES_STORE.items.splice(idx, 1);
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
