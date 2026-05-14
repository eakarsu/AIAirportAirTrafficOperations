const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');

router.use(generalLimiter);

// GET /api/stats - Comprehensive airport statistics
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

// GET /api/stats/passenger-experience - Passenger Experience Score
router.get('/passenger-experience', authenticateToken, async (req, res) => {
  try {
    const [delays, baggage, incidents] = await Promise.all([
      pool.query('SELECT predicted_delay_min, rebooking_suggested, affected_passengers FROM delay_predictions'),
      pool.query('SELECT status FROM baggage_tracking'),
      pool.query("SELECT severity FROM incident_reports WHERE status IN ('open', 'investigating')"),
    ]);

    const delayData = delays.rows;
    const totalFlights = Math.max(delayData.length, 1);
    const delayedCount = delayData.filter(d => d.predicted_delay_min > 15).length;
    const avgDelay = delayData.reduce((s, d) => s + (d.predicted_delay_min || 0), 0) / totalFlights;
    const delayScore = Math.max(0, 100 - (delayedCount / totalFlights) * 50 - Math.min(avgDelay / 2, 30));

    const baggageData = baggage.rows;
    const totalBags = Math.max(baggageData.length, 1);
    const mishandledCount = baggageData.filter(b => b.status === 'mishandled').length;
    const baggageScore = Math.max(0, 100 - (mishandledCount / totalBags) * 200);

    const incidentData = incidents.rows;
    const criticalCount = incidentData.filter(i => i.severity === 'critical').length;
    const highCount = incidentData.filter(i => i.severity === 'high').length;
    const incidentPenalty = criticalCount * 10 + highCount * 5;
    const safetyScore = Math.max(0, 100 - incidentPenalty);

    const overallScore = Math.round((delayScore * 0.4 + baggageScore * 0.35 + safetyScore * 0.25));

    const getGrade = (score) => {
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    };

    res.json({
      overall_score: overallScore,
      grade: getGrade(overallScore),
      components: {
        on_time_performance: { score: Math.round(delayScore), weight: '40%', detail: `${delayedCount}/${totalFlights} flights delayed >15min, avg ${Math.round(avgDelay)}min delay` },
        baggage_handling: { score: Math.round(baggageScore), weight: '35%', detail: `${mishandledCount}/${totalBags} bags mishandled` },
        safety_record: { score: Math.round(safetyScore), weight: '25%', detail: `${criticalCount} critical, ${highCount} high severity open incidents` },
      },
      benchmark: overallScore >= 80 ? 'Above industry average' : overallScore >= 65 ? 'At industry average' : 'Below industry average',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/carbon - Carbon Footprint Dashboard
router.get('/carbon', authenticateToken, async (req, res) => {
  try {
    const flights = await pool.query('SELECT airline, aircraft_type, flight_type, status FROM flight_schedule ORDER BY scheduled_time DESC LIMIT 500');
    const delays = await pool.query('SELECT flight_number, predicted_delay_min FROM delay_predictions');

    const flightData = flights.rows;
    const delayData = delays.rows;

    // Rough CO2 estimations by aircraft type
    const co2PerMinuteTaxi = {
      'Boeing 737': 1.2, 'Airbus A320': 1.1, 'Boeing 757': 1.5, 'Boeing 747': 2.8,
      'Boeing 777': 2.5, 'Airbus A380': 3.2, 'Boeing 787': 1.8, 'Airbus A350': 1.7,
      'Airbus A330': 2.0, 'default': 1.5,
    };

    const getRate = (aircraftType) => {
      if (!aircraftType) return co2PerMinuteTaxi.default;
      const key = Object.keys(co2PerMinuteTaxi).find(k => aircraftType.includes(k));
      return key ? co2PerMinuteTaxi[key] : co2PerMinuteTaxi.default;
    };

    const avgTaxiMin = 15;
    const totalAvgDelayMin = delayData.reduce((s, d) => s + (d.predicted_delay_min || 0), 0) / Math.max(delayData.length, 1);

    const airlineMap = {};
    flightData.forEach(f => {
      if (!airlineMap[f.airline]) airlineMap[f.airline] = { count: 0, co2_kg: 0 };
      airlineMap[f.airline].count++;
      const rate = getRate(f.aircraft_type);
      airlineMap[f.airline].co2_kg += rate * avgTaxiMin;
    });

    const totalCo2 = Object.values(airlineMap).reduce((s, a) => s + a.co2_kg, 0);
    const delayCo2 = delayData.reduce((s, d) => {
      const rate = 1.5;
      return s + rate * (d.predicted_delay_min || 0);
    }, 0);

    const byAirline = Object.entries(airlineMap).map(([airline, data]) => ({
      airline,
      flights: data.count,
      estimated_co2_kg: Math.round(data.co2_kg),
      co2_per_flight_kg: Math.round(data.co2_kg / data.count),
    })).sort((a, b) => b.estimated_co2_kg - a.estimated_co2_kg);

    res.json({
      summary: {
        total_flights: flightData.length,
        total_estimated_co2_kg: Math.round(totalCo2),
        delay_additional_co2_kg: Math.round(delayCo2),
        co2_per_flight_avg_kg: Math.round(totalCo2 / Math.max(flightData.length, 1)),
        avg_taxi_time_min: avgTaxiMin,
        avg_delay_min: Math.round(totalAvgDelayMin),
      },
      by_airline: byAirline,
      reduction_opportunities: [
        { action: 'Implement CDM (Collaborative Decision Making)', potential_saving_pct: 8 },
        { action: 'Optimize gate proximity for connections', potential_saving_pct: 5 },
        { action: 'Reduce ground holds via ATIS auto-update', potential_saving_pct: 4 },
        { action: 'Single-engine taxi procedures', potential_saving_pct: 12 },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/crew-performance - Crew Performance Analytics
router.get('/crew-performance', authenticateToken, async (req, res) => {
  try {
    const crews = await pool.query('SELECT * FROM ground_crews ORDER BY crew_type ASC');
    const crewData = crews.rows;

    const byType = {};
    crewData.forEach(c => {
      if (!byType[c.crew_type]) byType[c.crew_type] = { crews: 0, members: 0, active: 0, standby: 0, off: 0 };
      byType[c.crew_type].crews++;
      byType[c.crew_type].members += c.members_count || 0;
      if (c.status === 'active') byType[c.crew_type].active++;
      else if (c.status === 'standby') byType[c.crew_type].standby++;
      else byType[c.crew_type].off++;
    });

    const now = new Date();
    const overlapShifts = crewData.filter(c => {
      const end = new Date(c.shift_end);
      return end < now;
    });

    const activeCount = crewData.filter(c => c.status === 'active').length;
    const utilizationRate = Math.round((activeCount / Math.max(crewData.length, 1)) * 100);

    const typeBreakdown = Object.entries(byType).map(([type, data]) => ({
      crew_type: type,
      total_crews: data.crews,
      total_members: data.members,
      active: data.active,
      standby: data.standby,
      utilization_pct: Math.round((data.active / Math.max(data.crews, 1)) * 100),
    }));

    res.json({
      summary: {
        total_crews: crewData.length,
        total_members: crewData.reduce((s, c) => s + (c.members_count || 0), 0),
        active_crews: activeCount,
        standby_crews: crewData.filter(c => c.status === 'standby').length,
        utilization_rate_pct: utilizationRate,
        overdue_shift_handovers: overlapShifts.length,
      },
      by_type: typeBreakdown,
      staffing_adequacy: utilizationRate > 80 ? 'Adequate' : utilizationRate > 60 ? 'Marginal' : 'Understaffed',
      recommendations: utilizationRate < 70 ? ['Consider activating standby crews', 'Review shift coverage gaps'] : ['Current staffing levels adequate'],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
