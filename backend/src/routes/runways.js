const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM runway_utilization ORDER BY scheduled_time ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM runway_utilization WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { runway_id, flight_number, operation_type, aircraft_type, scheduled_time, actual_time, wind_speed_knots, visibility_miles, status } = req.body;
    const result = await pool.query(
      `INSERT INTO runway_utilization (runway_id, flight_number, operation_type, aircraft_type, scheduled_time, actual_time, wind_speed_knots, visibility_miles, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [runway_id, flight_number, operation_type, aircraft_type, scheduled_time, actual_time, wind_speed_knots || 0, visibility_miles || 10, status || 'scheduled']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { runway_id, flight_number, operation_type, aircraft_type, scheduled_time, actual_time, wind_speed_knots, visibility_miles, status } = req.body;
    const result = await pool.query(
      `UPDATE runway_utilization SET runway_id=$1, flight_number=$2, operation_type=$3, aircraft_type=$4, scheduled_time=$5, actual_time=$6, wind_speed_knots=$7, visibility_miles=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [runway_id, flight_number, operation_type, aircraft_type, scheduled_time, actual_time, wind_speed_knots, visibility_miles, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM runway_utilization WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
