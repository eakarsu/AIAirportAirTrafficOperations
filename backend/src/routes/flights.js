const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const flightValidation = [
  body('flight_number').trim().notEmpty().withMessage('flight_number is required'),
  body('airline').trim().notEmpty().withMessage('airline is required'),
  body('origin').trim().notEmpty().isLength({ min: 2, max: 10 }).withMessage('origin IATA is required'),
  body('destination').trim().notEmpty().isLength({ min: 2, max: 10 }).withMessage('destination IATA is required'),
  body('scheduled_time').isISO8601().withMessage('scheduled_time must be a valid datetime'),
  body('flight_type').isIn(['departure', 'arrival']).withMessage('flight_type must be departure or arrival'),
  body('aircraft_type').trim().notEmpty().withMessage('aircraft_type is required'),
  body('status').optional().isIn(['on_time', 'delayed', 'boarding', 'departed', 'landed', 'cancelled', 'diverted']).withMessage('invalid status'),
];

// Get all flights with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Optional filter
    const type = req.query.type; // 'departure' | 'arrival'
    let whereClause = '';
    const params = [limit, offset];
    if (type && ['departure', 'arrival'].includes(type)) {
      whereClause = 'WHERE flight_type = $3';
      params.push(type);
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM flight_schedule ${type ? 'WHERE flight_type = $1' : ''}`, type ? [type] : []),
      pool.query(`SELECT * FROM flight_schedule ${whereClause} ORDER BY scheduled_time ASC LIMIT $1 OFFSET $2`, params),
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
router.post('/', authenticateToken, flightValidation, validate, async (req, res) => {
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
router.put('/:id', authenticateToken, flightValidation, validate, async (req, res) => {
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
