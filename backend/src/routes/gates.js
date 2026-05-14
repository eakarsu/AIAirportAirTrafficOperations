const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const gateValidation = [
  body('flight_number').trim().notEmpty().withMessage('flight_number is required'),
  body('airline').trim().notEmpty().withMessage('airline is required'),
  body('gate_number').trim().notEmpty().withMessage('gate_number is required'),
  body('terminal').trim().notEmpty().withMessage('terminal is required'),
  body('aircraft_type').trim().notEmpty().withMessage('aircraft_type is required'),
  body('scheduled_time').isISO8601().withMessage('scheduled_time must be a valid datetime'),
  body('status').optional().isIn(['scheduled', 'boarding', 'arrived', 'departed', 'delayed']).withMessage('invalid status'),
  body('passenger_count').optional().isInt({ min: 0 }).withMessage('passenger_count must be a non-negative integer'),
];

// GET all gate assignments with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM gate_assignments'),
      pool.query('SELECT * FROM gate_assignments ORDER BY scheduled_time ASC LIMIT $1 OFFSET $2', [limit, offset]),
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

// GET single gate assignment
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
router.post('/', authenticateToken, gateValidation, validate, async (req, res) => {
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
router.put('/:id', authenticateToken, gateValidation, validate, async (req, res) => {
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
