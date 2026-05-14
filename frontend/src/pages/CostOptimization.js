import React, { useState } from 'react';

function CostOptimization({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`${api}/api/ai/cost-optimization`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const fmt = (n) => typeof n === 'number' ? `$${n.toLocaleString()}` : n;
  const prioColor = (p) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#22c55e';

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-dollar-sign"></i> AI Cost Optimization Suggester</h1>
        <button className="btn-ai" onClick={run} disabled={loading}>
          <i className="fas fa-robot"></i> {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Analyzes fuel burn, crew OT, gate premiums; proposes schedule tweaks with ROI forecasts.
      </p>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>{error}</div>}
      {loading && <div className="ai-loading"><div className="spinner"></div><span>Analyzing costs...</span></div>}

      {data && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: 20, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Current Cost</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#38bdf8' }}>{fmt(data.current_estimated_cost_usd)}</div>
            </div>
            <div style={{ flex: 1, padding: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Potential Savings</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e' }}>{fmt(data.total_potential_savings_usd)}</div>
            </div>
          </div>

          {Array.isArray(data.suggestions) && data.suggestions.length > 0 && (
            <div className="data-table-container">
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}>Suggestions</h3>
              <table className="data-table">
                <thead><tr><th>Category</th><th>Action</th><th>Savings</th><th>ROI Days</th><th>Priority</th></tr></thead>
                <tbody>
                  {data.suggestions.map((s, i) => (
                    <tr key={i}>
                      <td>{s.category}</td>
                      <td>{s.action}</td>
                      <td style={{ color: '#22c55e' }}>{fmt(s.estimated_savings_usd)}</td>
                      <td>{s.roi_days}</td>
                      <td><span className="status-badge" style={{ background: prioColor(s.priority), color: '#fff' }}>{s.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.summary && <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, color: '#cbd5e1', marginTop: 16 }}>{data.summary}</div>}

          {data.raw_response && (
            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{data.raw_response}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default CostOptimization;
