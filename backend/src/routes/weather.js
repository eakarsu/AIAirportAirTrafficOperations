const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const weatherValidation = [
  body('station_id').trim().notEmpty().withMessage('station_id is required'),
  body('report_type').optional().isIn(['METAR', 'TAF', 'SPECI', 'NOTAM']).withMessage('invalid report_type'),
  body('temperature_c').optional().isFloat().withMessage('temperature_c must be a number'),
  body('wind_speed_knots').optional().isInt({ min: 0 }).withMessage('wind_speed_knots must be non-negative'),
  body('visibility_miles').optional().isFloat({ min: 0 }).withMessage('visibility_miles must be non-negative'),
  body('ceiling_feet').optional().isInt({ min: 0 }).withMessage('ceiling_feet must be non-negative'),
  body('conditions').optional().isIn(['VFR', 'MVFR', 'IFR', 'LIFR']).withMessage('invalid conditions'),
  body('pressure_inhg').optional().isFloat({ min: 25, max: 32 }).withMessage('pressure_inhg out of range'),
  body('humidity_percent').optional().isInt({ min: 0, max: 100 }).withMessage('humidity_percent must be 0-100'),
];

// Get all weather reports with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const station = req.query.station;
    let where = '';
    const params = [limit, offset];
    if (station) {
      where = 'WHERE station_id = $3';
      params.push(station.toUpperCase());
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM weather_reports ${station ? 'WHERE station_id = $1' : ''}`, station ? [station.toUpperCase()] : []),
      pool.query(`SELECT * FROM weather_reports ${where} ORDER BY reported_at DESC LIMIT $1 OFFSET $2`, params),
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

// Get single weather report
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM weather_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create weather report
router.post('/', authenticateToken, weatherValidation, validate, async (req, res) => {
  try {
    const { station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam } = req.body;
    const result = await pool.query(
      `INSERT INTO weather_reports (station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [station_id.toUpperCase(), report_type || 'METAR', temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions || 'VFR', pressure_inhg, humidity_percent, notam]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update weather report
router.put('/:id', authenticateToken, weatherValidation, validate, async (req, res) => {
  try {
    const { station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam } = req.body;
    const result = await pool.query(
      `UPDATE weather_reports SET station_id=$1, report_type=$2, temperature_c=$3, wind_speed_knots=$4, wind_direction=$5, visibility_miles=$6, ceiling_feet=$7, conditions=$8, pressure_inhg=$9, humidity_percent=$10, notam=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [station_id ? station_id.toUpperCase() : station_id, report_type, temperature_c, wind_speed_knots, wind_direction, visibility_miles, ceiling_feet, conditions, pressure_inhg, humidity_percent, notam, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete weather report
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM weather_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
