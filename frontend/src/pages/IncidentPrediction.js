import React, { useState } from 'react';

function IncidentPrediction({ token, api }) {
  const [hoursAhead, setHoursAhead] = useState(24);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`${api}/api/ai/incident-prediction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours_ahead: Number(hoursAhead) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const riskColor = (l) => {
    const x = (l || '').toLowerCase();
    if (x === 'critical') return '#dc2626';
    if (x === 'high') return '#ef4444';
    if (x === 'medium') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-shield-alt"></i> AI Incident Prediction</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Historical incident + weather patterns; flags high-risk windows with preventive staffing recommendations.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ color: '#cbd5e1' }}>Hours ahead:</label>
        <input
          type="number" min={1} max={168} value={hoursAhead}
          onChange={(e) => setHoursAhead(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: 8, borderRadius: 6, width: 100 }}
        />
        <button className="btn-ai" onClick={run} disabled={loading}>
          <i className="fas fa-robot"></i> {loading ? 'Predicting...' : 'Predict Incidents'}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>{error}</div>}
      {loading && <div className="ai-loading"><div className="spinner"></div><span>Predicting incidents...</span></div>}

      {data && !loading && (
        <div>
          <div style={{ padding: 20, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 12, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Overall Risk</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: riskColor(data.overall_risk_level) }}>
              {(data.overall_risk_level || 'unknown').toUpperCase()}
            </div>
          </div>

          {Array.isArray(data.high_risk_windows) && data.high_risk_windows.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}>High-Risk Windows</h3>
              <table className="data-table">
                <thead><tr><th>Start</th><th>End</th><th>Type</th><th>Probability</th><th>Recommended Staffing</th></tr></thead>
                <tbody>
                  {data.high_risk_windows.map((w, i) => (
                    <tr key={i}>
                      <td>{w.starts_at}</td><td>{w.ends_at}</td>
                      <td>{w.incident_type}</td>
                      <td>{(w.probability * 100).toFixed(0)}%</td>
                      <td>{w.recommended_staffing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.preventive_actions) && data.preventive_actions.length > 0 && (
            <div style={{ background: '#0f172a', padding: 16, borderRadius: 8 }}>
              <h3 style={{ marginTop: 0, color: '#fff' }}>Preventive Actions</h3>
              <ul style={{ color: '#cbd5e1' }}>
                {data.preventive_actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {data.raw_response && (
            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{data.raw_response}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default IncidentPrediction;
