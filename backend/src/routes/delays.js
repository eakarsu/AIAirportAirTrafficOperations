const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const delayValidation = [
  body('flight_number').trim().notEmpty().withMessage('flight_number is required'),
  body('airline').trim().notEmpty().withMessage('airline is required'),
  body('origin').trim().notEmpty().isLength({ min: 2, max: 10 }).withMessage('origin IATA code is required'),
  body('destination').trim().notEmpty().isLength({ min: 2, max: 10 }).withMessage('destination IATA code is required'),
  body('scheduled_departure').isISO8601().withMessage('scheduled_departure must be a valid datetime'),
  body('predicted_delay_min').isInt({ min: 0 }).withMessage('predicted_delay_min must be a non-negative integer'),
  body('confidence_score').optional().isFloat({ min: 0, max: 1 }).withMessage('confidence_score must be between 0 and 1'),
  body('affected_passengers').optional().isInt({ min: 0 }).withMessage('affected_passengers must be non-negative'),
];

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM delay_predictions'),
      pool.query('SELECT * FROM delay_predictions ORDER BY predicted_delay_min DESC LIMIT $1 OFFSET $2', [limit, offset]),
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
    const result = await pool.query('SELECT * FROM delay_predictions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, delayValidation, validate, async (req, res) => {
  try {
    const { flight_number, airline, origin, destination, scheduled_departure, predicted_delay_min, delay_reason, confidence_score, rebooking_suggested, affected_passengers } = req.body;
    const result = await pool.query(
      `INSERT INTO delay_predictions (flight_number, airline, origin, destination, scheduled_departure, predicted_delay_min, delay_reason, confidence_score, rebooking_suggested, affected_passengers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [flight_number, airline, origin, destination, scheduled_departure, predicted_delay_min, delay_reason, confidence_score || 0.85, rebooking_suggested || false, affected_passengers || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, delayValidation, validate, async (req, res) => {
  try {
    const { flight_number, airline, origin, destination, scheduled_departure, predicted_delay_min, delay_reason, confidence_score, rebooking_suggested, affected_passengers } = req.body;
    const result = await pool.query(
      `UPDATE delay_predictions SET flight_number=$1, airline=$2, origin=$3, destination=$4, scheduled_departure=$5, predicted_delay_min=$6, delay_reason=$7, confidence_score=$8, rebooking_suggested=$9, affected_passengers=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [flight_number, airline, origin, destination, scheduled_departure, predicted_delay_min, delay_reason, confidence_score, rebooking_suggested, affected_passengers, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM delay_predictions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
