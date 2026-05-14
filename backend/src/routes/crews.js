const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const crewValidation = [
  body('crew_name').trim().notEmpty().withMessage('crew_name is required'),
  body('crew_type').trim().notEmpty().withMessage('crew_type is required'),
  body('members_count').isInt({ min: 1 }).withMessage('members_count must be a positive integer'),
  body('shift_start').isISO8601().withMessage('shift_start must be a valid datetime'),
  body('shift_end').isISO8601().withMessage('shift_end must be a valid datetime'),
  body('status').optional().isIn(['available', 'active', 'standby', 'scheduled', 'off_duty']).withMessage('invalid status'),
];

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM ground_crews'),
      pool.query('SELECT * FROM ground_crews ORDER BY shift_start ASC LIMIT $1 OFFSET $2', [limit, offset]),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

router.post('/', authenticateToken, crewValidation, validate, async (req, res) => {
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

router.put('/:id', authenticateToken, crewValidation, validate, async (req, res) => {
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
