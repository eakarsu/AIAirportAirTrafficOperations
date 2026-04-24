const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all flights
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM flight_schedule ORDER BY scheduled_time ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single flight
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM flight_schedule WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create flight
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { flight_number, airline, origin, destination, scheduled_time, flight_type, aircraft_type, terminal, gate, status } = req.body;
    const result = await pool.query(
      `INSERT INTO flight_schedule (flight_number, airline, origin, destination, scheduled_time, flight_type, aircraft_type, terminal, gate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [flight_number, airline, origin, destination, scheduled_time, flight_type || 'departure', aircraft_type, terminal, gate, status || 'on_time']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update flight
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { flight_number, airline, origin, destination, scheduled_time, flight_type, aircraft_type, terminal, gate, status } = req.body;
    const result = await pool.query(
      `UPDATE flight_schedule SET flight_number=$1, airline=$2, origin=$3, destination=$4, scheduled_time=$5, flight_type=$6, aircraft_type=$7, terminal=$8, gate=$9, status=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [flight_number, airline, origin, destination, scheduled_time, flight_type, aircraft_type, terminal, gate, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete flight
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM flight_schedule WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
