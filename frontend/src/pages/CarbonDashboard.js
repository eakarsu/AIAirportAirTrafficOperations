import React, { useState, useEffect } from 'react';

function CarbonDashboard({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${api}/api/stats/carbon`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load');
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [token, api]);

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-leaf"></i> Carbon Footprint Dashboard</h1>
        <div className="header-actions">
          <button className="btn-cancel" onClick={load} disabled={loading}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Estimated CO2 emissions from taxi operations, by airline and per flight, with reduction opportunity analysis.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading && <div className="ai-loading"><div className="spinner"></div><span>Loading...</span></div>}

      {data && !loading && (
        <div>
          <div className="dashboard-stats" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-value">{data.summary.total_flights}</div>
              <div className="stat-label">Total Flights</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{(data.summary.total_estimated_co2_kg / 1000).toFixed(1)}<span style={{ fontSize: '1rem' }}>t</span></div>
              <div className="stat-label">Total CO2 (est.)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f59e0b' }}>{(data.summary.delay_additional_co2_kg / 1000).toFixed(1)}<span style={{ fontSize: '1rem' }}>t</span></div>
              <div className="stat-label">Delay CO2</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.summary.co2_per_flight_avg_kg}<span style={{ fontSize: '1rem' }}>kg</span></div>
              <div className="stat-label">CO2/Flight (avg)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.summary.avg_taxi_time_min}<span style={{ fontSize: '1rem' }}>min</span></div>
              <div className="stat-label">Avg Taxi Time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: data.summary.avg_delay_min > 30 ? '#ef4444' : '#f59e0b' }}>{data.summary.avg_delay_min}<span style={{ fontSize: '1rem' }}>min</span></div>
              <div className="stat-label">Avg Delay</div>
            </div>
          </div>

          {Array.isArray(data.by_airline) && data.by_airline.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-plane" style={{ color: '#22c55e' }}></i> CO2 by Airline</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Airline</th><th>Flights</th><th>Est. CO2 (kg)</th><th>CO2/Flight</th></tr>
                </thead>
                <tbody>
                  {data.by_airline.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.airline}</strong></td>
                      <td>{a.flights}</td>
                      <td style={{ color: a.estimated_co2_kg > 10000 ? '#ef4444' : a.estimated_co2_kg > 5000 ? '#f59e0b' : '#22c55e' }}>
                        {a.estimated_co2_kg.toLocaleString()} kg
                      </td>
                      <td style={{ color: '#94a3b8' }}>{a.co2_per_flight_kg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.reduction_opportunities) && data.reduction_opportunities.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 12px' }}><i className="fas fa-leaf"></i> Reduction Opportunities</h4>
              {data.reduction_opportunities.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < data.reduction_opportunities.length - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none' }}>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>{r.action}</span>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>-{r.potential_saving_pct}%</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#475569', textAlign: 'right', marginTop: 12 }}>
            Last updated: {new Date(data.timestamp).toLocaleString()} — Estimates based on average taxi times and aircraft type fuel burn rates.
          </div>
        </div>
      )}
    </div>
  );
}

export default CarbonDashboard;
