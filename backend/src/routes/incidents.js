const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const incidentValidation = [
  body('incident_type').trim().notEmpty().withMessage('incident_type is required'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('severity must be low, medium, high, or critical'),
  body('location').trim().notEmpty().withMessage('location is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('reported_by').trim().notEmpty().withMessage('reported_by is required'),
  body('status').optional().isIn(['open', 'investigating', 'resolved', 'closed']).withMessage('invalid status'),
];

// Get all incidents with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const severity = req.query.severity;
    let where = '';
    const params = [limit, offset];
    if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
      where = 'WHERE severity = $3';
      params.push(severity);
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM incident_reports ${severity ? 'WHERE severity = $1' : ''}`, severity ? [severity] : []),
      pool.query(`SELECT * FROM incident_reports ${where} ORDER BY reported_at DESC LIMIT $1 OFFSET $2`, params),
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

// Get single incident
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incident_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create incident
router.post('/', authenticateToken, incidentValidation, validate, async (req, res) => {
  try {
    const { incident_type, severity, location, description, reported_by, flight_number, status, resolution } = req.body;
    const result = await pool.query(
      `INSERT INTO incident_reports (incident_type, severity, location, description, reported_by, flight_number, status, resolution)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [incident_type, severity || 'low', location, description, reported_by, flight_number, status || 'open', resolution]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update incident
router.put('/:id', authenticateToken, incidentValidation, validate, async (req, res) => {
  try {
    const { incident_type, severity, location, description, reported_by, flight_number, status, resolution } = req.body;
    const result = await pool.query(
      `UPDATE incident_reports SET incident_type=$1, severity=$2, location=$3, description=$4, reported_by=$5, flight_number=$6, status=$7, resolution=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [incident_type, severity, location, description, reported_by, flight_number, status, resolution, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete incident
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM incident_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
