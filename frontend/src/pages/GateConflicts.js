import React, { useState } from 'react';

function GateConflicts({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`${api}/api/ai/gate-conflicts`, { method: 'POST', headers });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const severityColor = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'high' || s === 'critical') return '#ef4444';
    if (s === 'medium') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-exclamation-circle"></i> AI Gate Conflict Predictor</h1>
        <div className="header-actions">
          <button className="btn-ai" onClick={runAnalysis} disabled={loading}>
            <i className="fas fa-robot"></i> {loading ? 'Analyzing...' : 'Detect Conflicts'}
          </button>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Real-time detection of overlapping gate assignments for the next 4 hours with auto-swap recommendations and impact simulation.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading && (
        <div className="ai-analysis-container">
          <div className="ai-loading">
            <div className="spinner"></div>
            <span>AI is analyzing gate conflicts...</span>
          </div>
        </div>
      )}

      {data && !loading && (
        <div>
          {data.impact_score !== undefined && data.impact_score !== null && (
            <div style={{
              padding: 24, borderRadius: 12,
              background: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.3)',
              marginBottom: 20, textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                Impact Score (0=minimal, 100=maximum disruption)
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: data.impact_score > 70 ? '#ef4444' : data.impact_score > 40 ? '#f59e0b' : '#22c55e' }}>
                {data.impact_score}
              </div>
            </div>
          )}

          {Array.isArray(data.conflicts) && data.conflicts.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-bell"></i> Detected Conflicts</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Flight A</th>
                    <th>Flight B</th>
                    <th>Overlap (min)</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.conflicts.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.gate}</strong></td>
                      <td>{c.flight_a}</td>
                      <td>{c.flight_b}</td>
                      <td>{c.overlap_minutes}</td>
                      <td><span className="status-badge" style={{ background: severityColor(c.severity), color: '#fff' }}>{c.severity || 'medium'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.suggested_swaps) && data.suggested_swaps.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exchange-alt"></i> Suggested Swaps</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Move Flight</th>
                    <th>From Gate</th>
                    <th>To Gate</th>
                    <th>Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suggested_swaps.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.move_flight}</strong></td>
                      <td>{s.from_gate}</td>
                      <td>{s.to_gate}</td>
                      <td>{s.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.raw_response && (
            <div className="ai-analysis-container">
              <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 13 }}>{data.raw_response}</pre>
            </div>
          )}

          {(!data.conflicts || data.conflicts.length === 0) && !data.raw_response && (
            <div style={{ padding: 32, textAlign: 'center', color: '#22c55e' }}>
              <i className="fas fa-check-circle" style={{ fontSize: 36, marginBottom: 8 }}></i>
              <p>No gate conflicts detected.</p>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-robot" style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}></i>
          <p>Click "Detect Conflicts" to scan upcoming gate assignments for the next 4 hours.</p>
        </div>
      )}
    </div>
  );
}

export default GateConflicts;
