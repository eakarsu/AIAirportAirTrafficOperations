import React, { useState } from 'react';

function TrafficForecast({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`${api}/api/ai/traffic-forecast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const peakColor = (level) => {
    const m = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    return m[(level || '').toLowerCase()] || '#94a3b8';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-chart-line"></i> Traffic Volume Forecast</h1>
        <button className="btn-ai" onClick={run} disabled={loading}>
          <i className="fas fa-robot"></i> {loading ? 'Forecasting...' : 'Run Forecast'}
        </button>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI-generated 24-hour flight volume forecast with passenger projections, peak hour identification, and staffing recommendations.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}
      {loading && (
        <div className="ai-loading"><div className="spinner"></div><span>AI is forecasting traffic volume...</span></div>
      )}

      {data && !loading && (
        <div>
          {(data.total_expected_flights !== undefined || data.total_expected_passengers !== undefined) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {data.total_expected_flights !== undefined && (
                <div style={{ flex: 1, minWidth: 180, padding: 20, borderRadius: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Expected Flights (24h)</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#38bdf8' }}>{data.total_expected_flights}</div>
                </div>
              )}
              {data.total_expected_passengers !== undefined && (
                <div style={{ flex: 1, minWidth: 180, padding: 20, borderRadius: 12, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Expected Passengers (24h)</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#a855f7' }}>{data.total_expected_passengers?.toLocaleString()}</div>
                </div>
              )}
              {data.bottleneck_risk && (
                <div style={{ flex: 1, minWidth: 180, padding: 20, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Bottleneck Risk</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: peakColor(data.bottleneck_risk) }}>{data.bottleneck_risk.toUpperCase()}</div>
                </div>
              )}
            </div>
          )}

          {Array.isArray(data.hourly_forecast) && data.hourly_forecast.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-clock" style={{ color: '#38bdf8' }}></i> Hourly Forecast</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hour</th>
                    <th>Expected Flights</th>
                    <th>Expected Passengers</th>
                    <th>Load Level</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hourly_forecast.map((h, i) => (
                    <tr key={i}>
                      <td><strong>{h.hour}</strong></td>
                      <td>{h.expected_flights}</td>
                      <td>{h.expected_passengers?.toLocaleString()}</td>
                      <td>
                        <span className="status-badge" style={{ background: peakColor(h.load_level) + '20', color: peakColor(h.load_level) }}>
                          {h.load_level}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#94a3b8' }}>{h.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.peak_hours) && data.peak_hours.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 8px' }}><i className="fas fa-exclamation-circle"></i> Peak Hours</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.peak_hours.map((h, i) => (
                  <span key={i} className="status-badge" style={{ background: '#ef444430', color: '#ef4444', fontSize: 13, padding: '4px 12px' }}>{h}</span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(data.off_peak_hours) && data.off_peak_hours.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px' }}><i className="fas fa-moon"></i> Off-Peak Hours</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.off_peak_hours.map((h, i) => (
                  <span key={i} className="status-badge" style={{ background: '#22c55e20', color: '#22c55e', fontSize: 13, padding: '4px 12px' }}>{h}</span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(data.staffing_recommendations) && data.staffing_recommendations.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-users" style={{ color: '#22c55e' }}></i> Staffing Recommendations</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Time Period</th><th>Area</th><th>Current Staff</th><th>Recommended Staff</th><th>Reason</th></tr>
                </thead>
                <tbody>
                  {data.staffing_recommendations.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.time_period}</strong></td>
                      <td>{s.area}</td>
                      <td>{s.current_staff}</td>
                      <td><strong style={{ color: s.recommended_staff > s.current_staff ? '#ef4444' : '#22c55e' }}>{s.recommended_staff}</strong></td>
                      <td style={{ fontSize: 13 }}>{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.summary && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', color: '#cbd5e1', fontSize: 14 }}>
              {data.summary}
            </div>
          )}

          {data.raw_response && (
            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 13 }}>{data.raw_response}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default TrafficForecast;
