const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

router.use(generalLimiter);

const maintenanceValidation = [
  body('equipment_type').trim().notEmpty().withMessage('equipment_type is required'),
  body('equipment_id').trim().notEmpty().withMessage('equipment_id is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('scheduled_date').isISO8601().withMessage('scheduled_date must be a valid datetime'),
  body('maintenance_type').optional().isIn(['routine', 'repair', 'inspection', 'emergency', 'overhaul']).withMessage('invalid maintenance_type'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('invalid priority'),
  body('status').optional().isIn(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']).withMessage('invalid status'),
];

// Get all maintenance records with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const status = req.query.status;
    let where = '';
    const params = [limit, offset];
    if (status && ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      where = 'WHERE status = $3';
      params.push(status);
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM maintenance_logs ${status ? 'WHERE status = $1' : ''}`, status ? [status] : []),
      pool.query(`SELECT * FROM maintenance_logs ${where} ORDER BY scheduled_date ASC LIMIT $1 OFFSET $2`, params),
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
router.post('/', authenticateToken, maintenanceValidation, validate, async (req, res) => {
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
router.put('/:id', authenticateToken, maintenanceValidation, validate, async (req, res) => {
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
