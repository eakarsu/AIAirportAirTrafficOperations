const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const runwayValidation = [
  body('runway_id').trim().notEmpty().withMessage('runway_id is required'),
  body('flight_number').trim().notEmpty().withMessage('flight_number is required'),
  body('operation_type').isIn(['departure', 'arrival', 'touch_and_go', 'maintenance']).withMessage('invalid operation_type'),
  body('aircraft_type').trim().notEmpty().withMessage('aircraft_type is required'),
  body('scheduled_time').isISO8601().withMessage('scheduled_time must be a valid datetime'),
  body('wind_speed_knots').optional().isInt({ min: 0 }).withMessage('wind_speed_knots must be non-negative'),
  body('visibility_miles').optional().isFloat({ min: 0 }).withMessage('visibility_miles must be non-negative'),
  body('status').optional().isIn(['scheduled', 'approach', 'on_runway', 'completed', 'cancelled', 'taxiing']).withMessage('invalid status'),
];

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM runway_utilization'),
      pool.query('SELECT * FROM runway_utilization ORDER BY scheduled_time ASC LIMIT $1 OFFSET $2', [limit, offset]),
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
    const result = await pool.query('SELECT * FROM runway_utilization WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, runwayValidation, validate, async (req, res) => {
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

router.put('/:id', authenticateToken, runwayValidation, validate, async (req, res) => {
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
