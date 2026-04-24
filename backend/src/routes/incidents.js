const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all incidents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incident_reports ORDER BY reported_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single incident
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incident_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create incident
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { incident_type, severity, location, description, reported_by, flight_number, status, resolution } = req.body;
    const result = await pool.query(
      `INSERT INTO incident_reports (incident_type, severity, location, description, reported_by, flight_number, status, resolution)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [incident_type, severity || 'low', location, description, reported_by, flight_number, status || 'open', resolution]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update incident
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { incident_type, severity, location, description, reported_by, flight_number, status, resolution } = req.body;
    const result = await pool.query(
      `UPDATE incident_reports SET incident_type=$1, severity=$2, location=$3, description=$4, reported_by=$5, flight_number=$6, status=$7, resolution=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [incident_type, severity, location, description, reported_by, flight_number, status, resolution, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete incident
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM incident_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
