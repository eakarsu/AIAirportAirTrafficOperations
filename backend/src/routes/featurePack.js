'use strict';
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');
const fp = require('../services/featurePack');
const TABLE = 'flight_schedule';
const SEARCH_FIELDS = ["flight_number", "airline", "origin", "destination", "status"];
const EXPORT_FIELDS = ["id", "flight_number", "airline", "origin", "destination", "status", "flight_type"];
const store = fp.createTaskStore();
const owner = (req) => fp.ownerKey(req.user);

router.get('/tasks', authenticateToken, (req, res) => res.json({ data: store.list(owner(req), req.query) }));
router.post('/tasks', authenticateToken, (req, res) => { try { res.status(201).json(store.create(owner(req), req.body || {})); } catch (e) { res.status(e.status || 400).json({ error: e.message }); } });
router.put('/tasks/:id', authenticateToken, updateTask);
router.patch('/tasks/:id', authenticateToken, updateTask);
function updateTask(req, res) { try { const t = store.update(owner(req), req.params.id, req.body || {}); if (!t) return res.status(404).json({ error: 'task not found' }); res.json(t); } catch (e) { res.status(e.status || 400).json({ error: e.message }); } }

async function fetchRecords(req) {
  const { q = '', status = '' } = req.query || {};
  const conds = []; const params = [];
  if (status && EXPORT_FIELDS.includes('status')) { params.push(String(status)); conds.push(`status = $${params.length}`); }
  if (q && SEARCH_FIELDS.length) { params.push(`%${q}%`); conds.push(`(${SEARCH_FIELDS.map((f) => `CAST(${f} AS TEXT) ILIKE $${params.length}`).join(' OR ')})`); }
  const where = conds.length ? ` WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(500, Math.max(1, parseInt((req.query || {}).limit) || 200));
  params.push(limit);
  const r = await pool.query(`SELECT * FROM ${TABLE}${where} ORDER BY id DESC LIMIT $${params.length}`, params);
  return r.rows;
}
router.get('/feature-pack/records', authenticateToken, async (req, res) => { try { const rows = await fetchRecords(req); res.json({ data: rows, count: rows.length }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/feature-pack/export', authenticateToken, async (req, res) => {
  const format = String((req.query && req.query.format) || 'json').toLowerCase();
  if (!['csv', 'json'].includes(format)) return res.status(400).json({ error: 'format must be csv or json' });
  try { const rows = await fetchRecords(req);
    if (format === 'csv') { res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="flight_schedule.csv"'); return res.send(fp.toCsv(rows, EXPORT_FIELDS)); }
    res.setHeader('Content-Disposition', 'attachment; filename="flight_schedule.json"'); return res.json({ data: rows, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/feature-pack/ai', authenticateToken, (req, res) => res.json({ features: fp.AI_FEATURES, aiGenerated: false }));
router.post('/feature-pack/ai/:feature', authenticateToken, async (req, res) => {
  if (!fp.AI_FEATURES.some((f) => f.id === req.params.feature)) return res.status(404).json({ error: 'unknown AI feature' });
  try { const rows = (req.body && Array.isArray(req.body.records)) ? req.body.records : await fetchRecords({ query: {} });
    res.json(await fp.runAi(req.params.feature, rows));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
