const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all maintenance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maintenance_logs ORDER BY scheduled_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single maintenance record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maintenance_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create maintenance record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { equipment_type, equipment_id, maintenance_type, description, assigned_to, scheduled_date, priority, status, location } = req.body;
    const result = await pool.query(
      `INSERT INTO maintenance_logs (equipment_type, equipment_id, maintenance_type, description, assigned_to, scheduled_date, priority, status, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [equipment_type, equipment_id, maintenance_type || 'routine', description, assigned_to, scheduled_date, priority || 'medium', status || 'pending', location]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update maintenance record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { equipment_type, equipment_id, maintenance_type, description, assigned_to, scheduled_date, priority, status, location } = req.body;
    const result = await pool.query(
      `UPDATE maintenance_logs SET equipment_type=$1, equipment_id=$2, maintenance_type=$3, description=$4, assigned_to=$5, scheduled_date=$6, priority=$7, status=$8, location=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [equipment_type, equipment_id, maintenance_type, description, assigned_to, scheduled_date, priority, status, location, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete maintenance record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM maintenance_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
