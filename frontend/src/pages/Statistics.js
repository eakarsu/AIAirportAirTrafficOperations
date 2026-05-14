import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Statistics({ token, api }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/api/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, api]);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading statistics...</div>;
  if (!stats) return <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>Failed to load statistics</div>;

  const renderBreakdown = (data, colorFn) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
      {Object.entries(data).map(([key, val]) => (
        <span key={key} className="status-badge" style={{ background: colorFn ? `${colorFn(key)}20` : 'rgba(148,163,184,0.15)', color: colorFn ? colorFn(key) : '#94a3b8' }}>
          {key}: {val}
        </span>
      ))}
    </div>
  );

  const statusColors = (s) => {
    const map = { active: '#22c55e', available: '#38bdf8', scheduled: '#a855f7', standby: '#f59e0b', completed: '#22c55e', boarding: '#38bdf8', arrived: '#10b981', departed: '#8b5cf6', delayed: '#f59e0b', on_time: '#22c55e', landed: '#10b981', cancelled: '#ef4444', diverted: '#f97316', approach: '#38bdf8', taxiing: '#a855f7', on_runway: '#f59e0b', pending: '#f59e0b', in_progress: '#8b5cf6', open: '#ef4444', investigating: '#f59e0b', resolved: '#22c55e', closed: '#6b7280' };
    return map[s] || '#6b7280';
  };

  const severityColors = (s) => {
    const map = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444', urgent: '#dc2626', routine: '#22c55e' };
    return map[s] || '#6b7280';
  };

  const sections = [
    {
      title: 'Flights Overview',
      icon: 'fa-plane',
      color: '#06b6d4',
      stats: [
        { label: 'Total Flights', value: stats.flights.total },
        { label: 'Total Passengers', value: stats.flights.total_passengers.toLocaleString() },
      ],
      breakdowns: [
        { label: 'By Type', data: stats.flights.by_type },
        { label: 'By Status', data: stats.flights.by_status, colorFn: statusColors },
      ],
    },
    {
      title: 'Gate Operations',
      icon: 'fa-door-open',
      color: '#38bdf8',
      stats: [
        { label: 'Total Assignments', value: stats.gates.total },
      ],
      breakdowns: [
        { label: 'By Terminal', data: stats.gates.by_terminal },
        { label: 'By Status', data: stats.gates.by_status, colorFn: statusColors },
      ],
    },
    {
      title: 'Delay Analysis',
      icon: 'fa-clock',
      color: '#f59e0b',
      stats: [
        { label: 'Tracked Flights', value: stats.delays.total },
        { label: 'Delayed Flights', value: stats.delays.delayed_flights },
        { label: 'Avg Delay', value: `${stats.delays.avg_delay_min} min` },
        { label: 'Rebooking Suggested', value: stats.delays.rebooking_suggested },
        { label: 'Affected Passengers', value: stats.delays.affected_passengers.toLocaleString() },
      ],
    },
    {
      title: 'Ground Crews',
      icon: 'fa-users',
      color: '#22c55e',
      stats: [
        { label: 'Total Crews', value: stats.crews.total },
        { label: 'Total Members', value: stats.crews.total_members },
      ],
      breakdowns: [
        { label: 'By Status', data: stats.crews.by_status, colorFn: statusColors },
        { label: 'By Type', data: stats.crews.by_type },
      ],
    },
    {
      title: 'Baggage Tracking',
      icon: 'fa-suitcase-rolling',
      color: '#a855f7',
      stats: [
        { label: 'Total Bags', value: stats.baggage.total },
        { label: 'Mishandled', value: stats.baggage.mishandled },
      ],
      breakdowns: [
        { label: 'By Status', data: stats.baggage.by_status, colorFn: statusColors },
        { label: 'By Priority', data: stats.baggage.by_priority },
      ],
    },
    {
      title: 'Runway Operations',
      icon: 'fa-road',
      color: '#ec4899',
      stats: [
        { label: 'Total Operations', value: stats.runways.total },
      ],
      breakdowns: [
        { label: 'By Operation', data: stats.runways.by_operation },
        { label: 'By Status', data: stats.runways.by_status, colorFn: statusColors },
      ],
    },
    {
      title: 'Maintenance',
      icon: 'fa-wrench',
      color: '#f97316',
      stats: [
        { label: 'Total Tasks', value: stats.maintenance.total },
      ],
      breakdowns: [
        { label: 'By Status', data: stats.maintenance.by_status, colorFn: statusColors },
        { label: 'By Priority', data: stats.maintenance.by_priority, colorFn: severityColors },
      ],
    },
    {
      title: 'Incidents',
      icon: 'fa-exclamation-triangle',
      color: '#ef4444',
      stats: [
        { label: 'Total Incidents', value: stats.incidents.total },
        { label: 'Open/Investigating', value: stats.incidents.open },
      ],
      breakdowns: [
        { label: 'By Status', data: stats.incidents.by_status, colorFn: statusColors },
        { label: 'By Severity', data: stats.incidents.by_severity, colorFn: severityColors },
      ],
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-chart-bar"></i> Airport Statistics</h1>
      </div>

      {/* Quick nav to sub-pages */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div
          onClick={() => navigate('/statistics/passenger-experience')}
          style={{ flex: 1, padding: 16, borderRadius: 10, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <i className="fas fa-smile" style={{ color: '#38bdf8', fontSize: 24 }}></i>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>Passenger Experience</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>Satisfaction scores, wait times, NPS</div>
          </div>
          <i className="fas fa-arrow-right" style={{ color: '#38bdf8', marginLeft: 'auto' }}></i>
        </div>
        <div
          onClick={() => navigate('/statistics/carbon')}
          style={{ flex: 1, padding: 16, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <i className="fas fa-leaf" style={{ color: '#22c55e', fontSize: 24 }}></i>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>Carbon Dashboard</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>Emissions, fuel usage, sustainability</div>
          </div>
          <i className="fas fa-arrow-right" style={{ color: '#22c55e', marginLeft: 'auto' }}></i>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="dashboard-stats" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.overview.total_flights}</div>
          <div className="stat-label">Flights</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.overview.total_passengers.toLocaleString()}</div>
          <div className="stat-label">Passengers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.overview.total_gates}</div>
          <div className="stat-label">Gate Assignments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.overview.total_crew_members}</div>
          <div className="stat-label">Crew Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.overview.open_incidents > 0 ? '#ef4444' : '#22c55e' }}>{stats.overview.open_incidents}</div>
          <div className="stat-label">Open Incidents</div>
        </div>
      </div>

      {/* Current Weather */}
      {stats.current_weather && (
        <div className="stat-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#e2e8f0' }}>
            <i className="fas fa-cloud-sun" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
            Current Weather - {stats.current_weather.station_id}
          </h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', color: '#94a3b8' }}>
            {stats.current_weather.temperature_c != null && <span>Temp: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.temperature_c}°C</strong></span>}
            {stats.current_weather.wind_speed_knots != null && <span>Wind: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.wind_speed_knots} kts</strong></span>}
            {stats.current_weather.visibility_miles != null && <span>Visibility: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.visibility_miles} mi</strong></span>}
            {stats.current_weather.conditions && <span>Conditions: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.conditions}</strong></span>}
            {stats.current_weather.pressure_inhg != null && <span>Pressure: <strong style={{ color: '#e2e8f0' }}>{stats.current_weather.pressure_inhg}" Hg</strong></span>}
          </div>
        </div>
      )}

      {/* Detailed Sections */}
      <div className="dashboard-cards">
        {sections.map(section => (
          <div key={section.title} className="feature-card" style={{ '--card-color': section.color, cursor: 'default' }}>
            <div className="card-icon" style={{ background: `${section.color}15`, color: section.color }}>
              <i className={`fas ${section.icon}`}></i>
            </div>
            <h3>{section.title}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', margin: '12px 0' }}>
              {section.stats.map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>{s.value}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {section.breakdowns && section.breakdowns.map(b => (
              <div key={b.label}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>{b.label}</div>
                {renderBreakdown(b.data, b.colorFn)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Statistics;
