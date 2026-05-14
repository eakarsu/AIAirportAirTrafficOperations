import React, { useState } from 'react';

const urgencyColor = (u) => {
  const map = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
  return map[(u || '').toLowerCase()] || '#94a3b8';
};

function PredictiveMaintenance({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`${api}/api/ai/predictive-maintenance`, { method: 'POST', headers });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-tools"></i> AI Predictive Maintenance</h1>
        <div className="header-actions">
          <button className="btn-ai" onClick={runAnalysis} disabled={loading}>
            <i className="fas fa-robot"></i> {loading ? 'Analyzing...' : 'Predict Failures'}
          </button>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI analyzes maintenance log patterns and incident history to predict equipment failures before they occur.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is predicting equipment failures...</span></div>
        </div>
      )}

      {data && !loading && (
        <div>
          {data.total_risk_score !== undefined && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, padding: 20, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Overall Risk Score</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: data.total_risk_score > 70 ? '#ef4444' : data.total_risk_score > 40 ? '#f59e0b' : '#22c55e' }}>{data.total_risk_score}</div>
              </div>
              {data.estimated_prevention_savings_usd != null && (
                <div style={{ flex: 1, minWidth: 200, padding: 20, borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Est. Prevention Savings</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#22c55e' }}>${data.estimated_prevention_savings_usd?.toLocaleString()}</div>
                </div>
              )}
            </div>
          )}

          {Array.isArray(data.failure_predictions) && data.failure_predictions.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i> Predicted Failures</h3>
              {data.failure_predictions.map((p, i) => (
                <div key={i} style={{ padding: 16, marginBottom: 10, borderRadius: 8, background: 'rgba(30,41,59,0.6)', borderLeft: `3px solid ${urgencyColor(p.urgency)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <strong style={{ color: '#e2e8f0' }}>{p.equipment_id}</strong>
                      <span style={{ color: '#64748b', marginLeft: 8, fontSize: 13 }}>{p.equipment_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="status-badge" style={{ background: `${urgencyColor(p.urgency)}20`, color: urgencyColor(p.urgency) }}>{p.urgency}</span>
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>{Math.round((p.failure_probability || 0) * 100)}% risk</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                    <i className="fas fa-clock" style={{ marginRight: 4 }}></i> Window: {p.predicted_failure_window}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Mode: {p.failure_mode}</div>
                  {p.recommended_action && (
                    <div style={{ fontSize: 13, color: '#38bdf8', marginTop: 6 }}>
                      <i className="fas fa-arrow-right"></i> {p.recommended_action}
                    </div>
                  )}
                  {p.cost_if_ignored_usd != null && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                      Cost if ignored: ${p.cost_if_ignored_usd?.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {Array.isArray(data.overdue_inspections) && data.overdue_inspections.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-calendar-times" style={{ color: '#f59e0b' }}></i> Overdue Inspections</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Equipment</th><th>Last Maintained</th><th>Days Overdue</th><th>Risk</th></tr>
                </thead>
                <tbody>
                  {data.overdue_inspections.map((o, i) => (
                    <tr key={i}>
                      <td><strong>{o.equipment_id}</strong></td>
                      <td>{o.last_maintenance}</td>
                      <td style={{ color: '#ef4444' }}>{o.days_overdue}</td>
                      <td><span className="status-badge" style={{ background: `${urgencyColor(o.risk)}20`, color: urgencyColor(o.risk) }}>{o.risk}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.maintenance_schedule_optimization) && data.maintenance_schedule_optimization.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 8px' }}><i className="fas fa-calendar-check"></i> Schedule Optimizations</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {data.maintenance_schedule_optimization.map((opt, i) => <li key={i} style={{ marginBottom: 4 }}>{opt}</li>)}
              </ul>
            </div>
          )}

          {data.summary && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', color: '#cbd5e1', fontSize: 14 }}>
              {data.summary}
            </div>
          )}

          {data.raw_response && (
            <div className="ai-analysis-container">
              <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12 }}>{data.raw_response}</pre>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-tools" style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}></i>
          <p>Click "Predict Failures" to analyze maintenance patterns and identify at-risk equipment.</p>
        </div>
      )}
    </div>
  );
}

export default PredictiveMaintenance;
