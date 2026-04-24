const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ground_crews ORDER BY shift_start ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ground_crews WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { crew_name, crew_type, members_count, shift_start, shift_end, assigned_terminal, status, specialization } = req.body;
    const result = await pool.query(
      `INSERT INTO ground_crews (crew_name, crew_type, members_count, shift_start, shift_end, assigned_terminal, status, specialization)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [crew_name, crew_type, members_count, shift_start, shift_end, assigned_terminal, status || 'available', specialization]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { crew_name, crew_type, members_count, shift_start, shift_end, assigned_terminal, status, specialization } = req.body;
    const result = await pool.query(
      `UPDATE ground_crews SET crew_name=$1, crew_type=$2, members_count=$3, shift_start=$4, shift_end=$5, assigned_terminal=$6, status=$7, specialization=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [crew_name, crew_type, members_count, shift_start, shift_end, assigned_terminal, status, specialization, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ground_crews WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
