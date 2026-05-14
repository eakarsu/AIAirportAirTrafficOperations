const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const baggageValidation = [
  body('tag_id').trim().notEmpty().withMessage('tag_id is required'),
  body('flight_number').trim().notEmpty().withMessage('flight_number is required'),
  body('passenger_name').trim().notEmpty().withMessage('passenger_name is required'),
  body('origin').trim().notEmpty().withMessage('origin is required'),
  body('destination').trim().notEmpty().withMessage('destination is required'),
  body('current_location').trim().notEmpty().withMessage('current_location is required'),
  body('status').optional().isIn(['checked_in', 'screening', 'sorting', 'in_transit', 'loaded', 'arriving', 'delivered', 'mishandled', 'customs', 'transfer', 'oversized']).withMessage('invalid status'),
  body('weight_kg').optional().isFloat({ min: 0 }).withMessage('weight_kg must be non-negative'),
  body('priority').optional().isIn(['normal', 'priority', 'fragile', 'first_class', 'diplomatic', 'urgent', 'oversized']).withMessage('invalid priority'),
];

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM baggage_tracking'),
      pool.query('SELECT * FROM baggage_tracking ORDER BY last_scan_time DESC LIMIT $1 OFFSET $2', [limit, offset]),
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
    const result = await pool.query('SELECT * FROM baggage_tracking WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, baggageValidation, validate, async (req, res) => {
  try {
    const { tag_id, flight_number, passenger_name, origin, destination, current_location, status, weight_kg, priority } = req.body;
    const result = await pool.query(
      `INSERT INTO baggage_tracking (tag_id, flight_number, passenger_name, origin, destination, current_location, status, weight_kg, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tag_id, flight_number, passenger_name, origin, destination, current_location, status || 'checked_in', weight_kg || 0, priority || 'normal']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, baggageValidation, validate, async (req, res) => {
  try {
    const { tag_id, flight_number, passenger_name, origin, destination, current_location, status, weight_kg, priority } = req.body;
    const result = await pool.query(
      `UPDATE baggage_tracking SET tag_id=$1, flight_number=$2, passenger_name=$3, origin=$4, destination=$5, current_location=$6, status=$7, weight_kg=$8, priority=$9, last_scan_time=NOW(), updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [tag_id, flight_number, passenger_name, origin, destination, current_location, status, weight_kg, priority, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM baggage_tracking WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
