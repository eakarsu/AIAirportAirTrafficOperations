const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all gate assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gate_assignments ORDER BY scheduled_time ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single gate assignment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gate_assignments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create gate assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { flight_number, airline, gate_number, terminal, aircraft_type, scheduled_time, status, passenger_count } = req.body;
    const result = await pool.query(
      `INSERT INTO gate_assignments (flight_number, airline, gate_number, terminal, aircraft_type, scheduled_time, status, passenger_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [flight_number, airline, gate_number, terminal, aircraft_type, scheduled_time, status || 'scheduled', passenger_count || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update gate assignment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { flight_number, airline, gate_number, terminal, aircraft_type, scheduled_time, status, passenger_count } = req.body;
    const result = await pool.query(
      `UPDATE gate_assignments SET flight_number=$1, airline=$2, gate_number=$3, terminal=$4, aircraft_type=$5, scheduled_time=$6, status=$7, passenger_count=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [flight_number, airline, gate_number, terminal, aircraft_type, scheduled_time, status, passenger_count, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete gate assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM gate_assignments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
