const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get comprehensive airport statistics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [gates, crews, delays, baggage, runways, flights, maintenance, incidents, weather] = await Promise.all([
      pool.query('SELECT * FROM gate_assignments'),
      pool.query('SELECT * FROM ground_crews'),
      pool.query('SELECT * FROM delay_predictions'),
      pool.query('SELECT * FROM baggage_tracking'),
      pool.query('SELECT * FROM runway_utilization'),
      pool.query('SELECT * FROM flight_schedule'),
      pool.query('SELECT * FROM maintenance_logs'),
      pool.query('SELECT * FROM incident_reports'),
      pool.query('SELECT * FROM weather_reports ORDER BY reported_at DESC LIMIT 1'),
    ]);

    // Gate statistics
    const gateData = gates.rows;
    const gatesByTerminal = {};
    const gatesByStatus = {};
    gateData.forEach(g => {
      gatesByTerminal[g.terminal] = (gatesByTerminal[g.terminal] || 0) + 1;
      gatesByStatus[g.status] = (gatesByStatus[g.status] || 0) + 1;
    });

    // Delay statistics
    const delayData = delays.rows;
    const totalDelayMin = delayData.reduce((sum, d) => sum + (d.predicted_delay_min || 0), 0);
    const avgDelay = delayData.length ? Math.round(totalDelayMin / delayData.length) : 0;
    const delayedFlights = delayData.filter(d => d.predicted_delay_min > 0).length;
    const rebookingSuggested = delayData.filter(d => d.rebooking_suggested).length;
    const totalAffectedPassengers = delayData.reduce((sum, d) => sum + (d.affected_passengers || 0), 0);

    // Baggage statistics
    const baggageData = baggage.rows;
    const baggageByStatus = {};
    const baggageByPriority = {};
    baggageData.forEach(b => {
      baggageByStatus[b.status] = (baggageByStatus[b.status] || 0) + 1;
      baggageByPriority[b.priority] = (baggageByPriority[b.priority] || 0) + 1;
    });
    const mishandledBags = baggageData.filter(b => b.status === 'mishandled').length;

    // Crew statistics
    const crewData = crews.rows;
    const crewsByStatus = {};
    const crewsByType = {};
    crewData.forEach(c => {
      crewsByStatus[c.status] = (crewsByStatus[c.status] || 0) + 1;
      crewsByType[c.crew_type] = (crewsByType[c.crew_type] || 0) + 1;
    });
    const totalCrewMembers = crewData.reduce((sum, c) => sum + (c.members_count || 0), 0);

    // Runway statistics
    const runwayData = runways.rows;
    const runwaysByOperation = {};
    const runwaysByStatus = {};
    runwayData.forEach(r => {
      runwaysByOperation[r.operation_type] = (runwaysByOperation[r.operation_type] || 0) + 1;
      runwaysByStatus[r.status] = (runwaysByStatus[r.status] || 0) + 1;
    });

    // Flight statistics
    const flightData = flights.rows;
    const flightsByType = {};
    const flightsByStatus = {};
    const airlines = {};
    flightData.forEach(f => {
      flightsByType[f.flight_type] = (flightsByType[f.flight_type] || 0) + 1;
      flightsByStatus[f.status] = (flightsByStatus[f.status] || 0) + 1;
      airlines[f.airline] = (airlines[f.airline] || 0) + 1;
    });
    const totalPassengers = gateData.reduce((sum, g) => sum + (g.passenger_count || 0), 0);

    // Maintenance statistics
    const maintData = maintenance.rows;
    const maintByStatus = {};
    const maintByPriority = {};
    maintData.forEach(m => {
      maintByStatus[m.status] = (maintByStatus[m.status] || 0) + 1;
      maintByPriority[m.priority] = (maintByPriority[m.priority] || 0) + 1;
    });

    // Incident statistics
    const incidentData = incidents.rows;
    const incidentsByStatus = {};
    const incidentsBySeverity = {};
    incidentData.forEach(i => {
      incidentsByStatus[i.status] = (incidentsByStatus[i.status] || 0) + 1;
      incidentsBySeverity[i.severity] = (incidentsBySeverity[i.severity] || 0) + 1;
    });
    const openIncidents = incidentData.filter(i => i.status === 'open' || i.status === 'investigating').length;

    res.json({
      overview: {
        total_flights: flightData.length,
        total_passengers: totalPassengers,
        total_gates: gateData.length,
        total_crews: crewData.length,
        total_crew_members: totalCrewMembers,
        total_baggage: baggageData.length,
        total_runway_ops: runwayData.length,
        total_maintenance: maintData.length,
        total_incidents: incidentData.length,
        open_incidents: openIncidents,
      },
      gates: { total: gateData.length, by_terminal: gatesByTerminal, by_status: gatesByStatus },
      delays: { total: delayData.length, delayed_flights: delayedFlights, avg_delay_min: avgDelay, rebooking_suggested: rebookingSuggested, affected_passengers: totalAffectedPassengers },
      baggage: { total: baggageData.length, by_status: baggageByStatus, by_priority: baggageByPriority, mishandled: mishandledBags },
      crews: { total: crewData.length, total_members: totalCrewMembers, by_status: crewsByStatus, by_type: crewsByType },
      runways: { total: runwayData.length, by_operation: runwaysByOperation, by_status: runwaysByStatus },
      flights: { total: flightData.length, total_passengers: totalPassengers, by_type: flightsByType, by_status: flightsByStatus, airlines },
      maintenance: { total: maintData.length, by_status: maintByStatus, by_priority: maintByPriority },
      incidents: { total: incidentData.length, open: openIncidents, by_status: incidentsByStatus, by_severity: incidentsBySeverity },
      current_weather: weather.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
