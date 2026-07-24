import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard({ token, api }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(null);

  const loadStats = () => {
    fetch(`${api}/api/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); setCountdown(30); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [token, api]);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(c => c <= 1 ? 30 : c - 1);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  const features = [
    { title: 'Gate Assignment Optimization', description: 'AI-powered gate assignment optimization considering terminal proximity, aircraft size, connection times, and passenger flow.', icon: 'fa-door-open', color: '#38bdf8', path: '/gates', statKey: 'total_gates', statLabel: 'Active Assignments' },
    { title: 'Ground Crew Scheduling', description: 'Intelligent crew scheduling with shift optimization, specialization matching, fatigue management, and workload balancing.', icon: 'fa-users', color: '#22c55e', path: '/crews', statKey: 'total_crews', statLabel: 'Crew Teams' },
    { title: 'Delay Prediction & Rebooking', description: 'Predictive delay analytics with cascade analysis, automated rebooking suggestions, and passenger impact assessment.', icon: 'fa-clock', color: '#f59e0b', path: '/delays', statKey: 'delays_total', statLabel: 'Tracked Flights' },
    { title: 'Baggage Flow Tracking', description: 'Real-time baggage tracking with flow optimization, bottleneck detection, lost baggage prevention, and priority routing.', icon: 'fa-suitcase-rolling', color: '#a855f7', path: '/baggage', statKey: 'total_baggage', statLabel: 'Bags Tracked' },
    { title: 'Runway Utilization', description: 'Runway operations optimization with weather-aware scheduling, separation management, and throughput maximization.', icon: 'fa-road', color: '#ec4899', path: '/runways', statKey: 'total_runway_ops', statLabel: 'Operations' },
    { title: 'Flight Schedule Board', description: 'Live departures and arrivals board with real-time status tracking, terminal and gate information.', icon: 'fa-plane', color: '#06b6d4', path: '/flights', statKey: 'total_flights', statLabel: 'Flights' },
    { title: 'Weather & NOTAMs', description: 'Current METAR/TAF weather reports, flight conditions, and active Notices to Airmen for all nearby airports.', icon: 'fa-cloud-sun', color: '#f97316', path: '/weather', statKey: null, statLabel: 'Reports' },
    { title: 'Incident Reports', description: 'Safety and operational incident logging with severity tracking, investigation status, and resolution management.', icon: 'fa-exclamation-triangle', color: '#ef4444', path: '/incidents', statKey: 'total_incidents', statLabel: 'Incidents' },
    { title: 'Maintenance Logs', description: 'Equipment and facility maintenance tracking with work orders, scheduling, priority levels, and assignment management.', icon: 'fa-wrench', color: '#84cc16', path: '/maintenance', statKey: 'total_maintenance', statLabel: 'Work Orders' },
    { title: 'Airport Statistics', description: 'Comprehensive analytics dashboard with breakdowns across all operational areas, real-time KPIs, and weather overview.', icon: 'fa-chart-bar', color: '#6366f1', path: '/statistics', statKey: null, statLabel: 'Analytics' },
    { title: 'AI Gate Conflict Predictor', description: 'Real-time detection of overlapping gate assignments with AI-powered swap recommendations.', icon: 'fa-exclamation-circle', color: '#f59e0b', path: '/ai/gate-conflicts', statKey: null, statLabel: 'AI Feature' },
    { title: 'Passenger Connection Saver', description: 'AI analysis of at-risk connections with rebooking priority recommendations.', icon: 'fa-link', color: '#8b5cf6', path: '/ai/connections', statKey: null, statLabel: 'AI Feature' },
    { title: 'Predictive Maintenance', description: 'AI predicts equipment failures before they occur, with risk scores and scheduling recommendations.', icon: 'fa-tools', color: '#f97316', path: '/ai/predictive-maintenance', statKey: null, statLabel: 'AI Feature' },
    { title: 'Shift Handover Report', description: 'AI-generated comprehensive shift handover reports with critical items and outstanding actions.', icon: 'fa-clipboard-list', color: '#06b6d4', path: '/ai/shift-handover', statKey: null, statLabel: 'AI Feature' },
    { title: 'NOTAM Briefing', description: 'AI-parsed NOTAM briefings with structured runway, taxiway, and navigation aid status.', icon: 'fa-broadcast-tower', color: '#ec4899', path: '/ai/notam-briefing', statKey: null, statLabel: 'AI Feature' },
    { title: 'Runway Capacity Simulator', description: 'Simulate hypothetical scenarios to understand capacity impacts before they happen.', icon: 'fa-flask', color: '#22c55e', path: '/ai/runway-simulator', statKey: null, statLabel: 'AI Feature' },
    { title: 'Sustainability Report', description: 'CO2 emissions tracking, fuel efficiency metrics, and green routing recommendations.', icon: 'fa-leaf', color: '#22c55e', path: '/ai/sustainability', statKey: null, statLabel: 'AI Feature' },
    { title: 'AI Analysis History', description: 'Review all past AI analyses with full input context and model outputs.', icon: 'fa-history', color: '#38bdf8', path: '/ai/history', statKey: null, statLabel: 'AI Feature' },
    { title: 'Traffic Volume Forecast', description: 'AI-generated 24-hour flight and passenger volume forecast with peak hour identification and staffing recommendations.', icon: 'fa-chart-line', color: '#06b6d4', path: '/ai/traffic-forecast', statKey: null, statLabel: 'AI Feature' },
    { title: 'Emergency Response', description: 'AI-generated emergency response plans with immediate actions, agency notifications, and resource deployment guidance.', icon: 'fa-ambulance', color: '#ef4444', path: '/ai/emergency-response', statKey: null, statLabel: 'AI Feature' },
  ];

  const getStatValue = (statKey) => {
    if (!stats || !statKey) return '--';
    return stats.overview?.[statKey] ?? '--';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p>Loading Airport Operations Center...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1><i className="fas fa-plane-departure" style={{ color: '#38bdf8' }}></i> Airport Operations Center</h1>
        <p>AI-Powered Air Traffic & Ground Operations Management System</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          <button className="btn-primary" onClick={loadStats} style={{ fontSize: 12, padding: '6px 14px' }}>
            <i className="fas fa-sync-alt"></i> Refresh Now
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            <i className="fas fa-clock"></i> Auto-refresh in {countdown}s
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> Failed to load stats: {error}
        </div>
      )}

      {stats && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.overview.total_flights}</div>
            <div className="stat-label">Flights</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overview.total_passengers?.toLocaleString()}</div>
            <div className="stat-label">Passengers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overview.total_gates}</div>
            <div className="stat-label">Gate Assignments</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overview.total_crews}</div>
            <div className="stat-label">Ground Crews</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overview.total_baggage}</div>
            <div className="stat-label">Bags Tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overview.total_runway_ops}</div>
            <div className="stat-label">Runway Ops</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.delays?.avg_delay_min ?? 0}<span style={{ fontSize: '1rem' }}> min</span></div>
            <div className="stat-label">Avg Delay</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.overview.open_incidents > 0 ? '#ef4444' : '#22c55e' }}>{stats.overview.open_incidents}</div>
            <div className="stat-label">Open Incidents</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overview.total_maintenance}</div>
            <div className="stat-label">Work Orders</div>
          </div>
        </div>
      )}

      {stats?.current_weather && (
        <div className="stat-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#e2e8f0' }}>
            <i className="fas fa-cloud-sun" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
            Current Weather — {stats.current_weather.station_id}
            <span className="status-badge" style={{ marginLeft: 12, background: stats.current_weather.conditions === 'VFR' ? '#22c55e20' : stats.current_weather.conditions === 'IFR' ? '#ef444420' : '#f59e0b20', color: stats.current_weather.conditions === 'VFR' ? '#22c55e' : stats.current_weather.conditions === 'IFR' ? '#ef4444' : '#f59e0b' }}>{stats.current_weather.conditions}</span>
          </h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', color: '#94a3b8' }}>
            {stats.current_weather.temperature_c != null && <span>Temp: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.temperature_c}°C</strong></span>}
            {stats.current_weather.wind_speed_knots != null && <span>Wind: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.wind_speed_knots} kts {stats.current_weather.wind_direction || ''}</strong></span>}
            {stats.current_weather.visibility_miles != null && <span>Visibility: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.visibility_miles} SM</strong></span>}
            {stats.current_weather.pressure_inhg != null && <span>Pressure: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.pressure_inhg}" Hg</strong></span>}
            {stats.current_weather.notam && <span style={{ color: '#f59e0b' }}><i className="fas fa-exclamation-circle"></i> NOTAM active</span>}
          </div>
        </div>
      )}

      <div className="dashboard-cards">
        {features.map(feature => (
          <div
            key={feature.path}
            className="feature-card"
            style={{ '--card-color': feature.color }}
            onClick={() => navigate(feature.path)}
          >
            <div className="card-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
              <i className={`fas ${feature.icon}`}></i>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <div className="card-stats">
              <div className="card-stat">
                <strong>{getStatValue(feature.statKey)}</strong> {feature.statLabel}
              </div>
              <div className="card-stat">
                <i className="fas fa-arrow-right" style={{ color: feature.color }}></i> View Details
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
