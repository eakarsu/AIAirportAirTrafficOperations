const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all weather reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM weather_reports ORDER BY reported_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single weather report
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM weather_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create weather report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam } = req.body;
    const result = await pool.query(
      `INSERT INTO weather_reports (station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [station_id, report_type || 'METAR', temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions || 'VFR', pressure_inhg, humidity_percent, notam]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update weather report
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam } = req.body;
    const result = await pool.query(
      `UPDATE weather_reports SET station_id=$1, report_type=$2, temperature_c=$3, wind_speed_knots=$4, wind_direction=$5, visibility_miles=$6, ceiling_feet=$7, conditions=$8, pressure_inhg=$9, humidity_percent=$10, notam=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete weather report
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM weather_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
