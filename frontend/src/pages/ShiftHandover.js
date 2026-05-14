import React, { useState } from 'react';

const priorityColor = (p) => {
  const map = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
  return map[(p || '').toLowerCase()] || '#94a3b8';
};

function ShiftHandover({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`${api}/api/ai/shift-handover`, { method: 'POST', headers });
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
        <h1><i className="fas fa-clipboard-list"></i> AI Shift Handover Report</h1>
        <div className="header-actions">
          <button className="btn-ai" onClick={runAnalysis} disabled={loading}>
            <i className="fas fa-robot"></i> {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI-generated shift handover covering the last 8 hours of airport operations, critical items, and outstanding actions.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is generating shift handover report...</span></div>
        </div>
      )}

      {data && !loading && (
        <div>
          {data.executive_summary && (
            <div style={{ padding: 20, borderRadius: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', marginBottom: 20 }}>
              <h3 style={{ color: '#38bdf8', margin: '0 0 8px' }}><i className="fas fa-info-circle"></i> Executive Summary</h3>
              <p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{data.executive_summary}</p>
            </div>
          )}

          {data.kpis && (
            <div className="dashboard-stats" style={{ marginBottom: 20 }}>
              <div className="stat-card"><div className="stat-value">{data.kpis.incidents_count || 0}</div><div className="stat-label">Incidents (8h)</div></div>
              <div className="stat-card"><div className="stat-value" style={{ color: data.kpis.critical_incidents > 0 ? '#ef4444' : '#22c55e' }}>{data.kpis.critical_incidents || 0}</div><div className="stat-label">Critical</div></div>
              <div className="stat-card"><div className="stat-value">{data.kpis.delayed_flights || 0}</div><div className="stat-label">Delayed Flights</div></div>
              <div className="stat-card"><div className="stat-value">{data.kpis.average_delay_min || 0}<span style={{ fontSize: '1rem' }}> min</span></div><div className="stat-label">Avg Delay</div></div>
            </div>
          )}

          {Array.isArray(data.critical_items) && data.critical_items.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exclamation-circle" style={{ color: '#ef4444' }}></i> Critical Items</h3>
              {data.critical_items.map((item, i) => (
                <div key={i} style={{ padding: 14, marginBottom: 8, borderRadius: 8, background: 'rgba(30,41,59,0.6)', borderLeft: `3px solid ${priorityColor(item.priority)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{item.description}</span>
                    <span className="status-badge" style={{ background: `${priorityColor(item.priority)}20`, color: priorityColor(item.priority), marginLeft: 8, flexShrink: 0 }}>{item.priority}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>Status: {item.status}</div>
                  {item.action_required && <div style={{ fontSize: 13, color: '#f59e0b', marginTop: 4 }}><i className="fas fa-arrow-right"></i> {item.action_required}</div>}
                </div>
              ))}
            </div>
          )}

          {Array.isArray(data.outstanding_actions) && data.outstanding_actions.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-tasks" style={{ color: '#f59e0b' }}></i> Outstanding Actions</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Action</th><th>Responsible Party</th><th>Deadline</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.outstanding_actions.map((a, i) => (
                    <tr key={i}>
                      <td>{a.action}</td>
                      <td>{a.responsible_party}</td>
                      <td>{a.deadline}</td>
                      <td><span className={`status-badge status-${a.status?.replace(/\s/g, '_')}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.next_shift_alerts) && data.next_shift_alerts.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16 }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 8px' }}><i className="fas fa-bell"></i> Next Shift Alerts</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {data.next_shift_alerts.map((alert, i) => <li key={i} style={{ marginBottom: 4 }}>{alert}</li>)}
              </ul>
            </div>
          )}

          {Array.isArray(data.crew_recommendations) && data.crew_recommendations.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px' }}><i className="fas fa-users"></i> Crew Recommendations</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {data.crew_recommendations.map((rec, i) => <li key={i} style={{ marginBottom: 4 }}>{rec}</li>)}
              </ul>
            </div>
          )}

          {data.weather_advisory && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 8px' }}><i className="fas fa-cloud-sun"></i> Weather Advisory</h4>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{data.weather_advisory}</p>
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
          <i className="fas fa-clipboard-list" style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}></i>
          <p>Click "Generate Report" to create an AI shift handover report for the last 8 hours.</p>
        </div>
      )}
    </div>
  );
}

export default ShiftHandover;
