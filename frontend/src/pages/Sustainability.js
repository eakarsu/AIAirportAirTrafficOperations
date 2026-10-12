import NativeAIContext from '../components/NativeAIContext';
import AIReport from '../components/AIReport';
import useNativeAIRequest from '../components/useNativeAIRequest';
import React, { useState } from 'react';

function Sustainability({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [planningContext,setPlanningContext]=useState('');
  const aiRequest = useNativeAIRequest(() => setLoading(false));

  const run = async () => {
    const aiOwner = aiRequest.begin(); if (!aiOwner) return;
    try {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await aiRequest.fetch(aiOwner,`${api}/api/ai/sustainability-report`, {
        method: 'POST',
        body: JSON.stringify({planning_context:planningContext}),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) {
      if (!aiRequest.isCurrent(aiOwner)) return; setError(err.message); }
    if (aiRequest.isCurrent(aiOwner)) setLoading(false);
    } finally { if (aiRequest.isCurrent(aiOwner)) { setLoading(false); aiRequest.finish(aiOwner); } }
  };

  const fmt = (n) => typeof n === 'number' ? n.toLocaleString() : n;
  const prioColor = (p) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#22c55e';

  return (
    <div>
      <NativeAIContext title="Sustainability" value={planningContext} onChange={setPlanningContext} disabled={loading}/>
      {aiRequest.notice && <p role="status">{aiRequest.notice}</p>}<button type="button" className="btn-cancel" onClick={aiRequest.cancel}>Cancel AI request</button>
      <div className="page-header">
        <h1><i className="fas fa-leaf"></i> Sustainability Reporter</h1>
        <button className="btn-ai" onClick={run} disabled={loading}>
          <i className="fas fa-robot"></i> {loading ? 'Generating...' : 'Generate with OpenRouter'}
        </button>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Tracks taxiing time, fuel burn, emissions; suggests routes/schedules for green metric improvements.
      </p>

      {error && <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>{error}</div>}
      {loading && <div className="ai-loading"><div className="spinner"></div><span>Calculating green metrics...</span></div>}

      {data && !loading && (
        <div>
          {data.kpis && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Taxi Minutes</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#38bdf8' }}>{fmt(data.kpis.estimated_taxi_minutes_total)}</div>
              </div>
              <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Fuel Burn (L)</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{fmt(data.kpis.estimated_fuel_burn_liters)}</div>
              </div>
              <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>CO2 (kg)</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{fmt(data.kpis.estimated_co2_kg)}</div>
              </div>
            </div>
          )}

          {Array.isArray(data.trends) && data.trends.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}>Trends</h3>
              <table className="data-table">
                <thead><tr><th>Metric</th><th>Change %</th><th>Direction</th></tr></thead>
                <tbody>
                  {data.trends.map((t, i) => (
                    <tr key={i}>
                      <td>{t.metric}</td>
                      <td>{t.change_pct}%</td>
                      <td>{t.direction === 'down' ? '▼' : '▲'} {t.direction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
            <div className="data-table-container">
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}>Recommendations</h3>
              <table className="data-table">
                <thead><tr><th>Action</th><th>CO2 Saving (kg)</th><th>Priority</th></tr></thead>
                <tbody>
                  {data.recommendations.map((r, i) => (
                    <tr key={i}>
                      <td>{r.action}</td>
                      <td style={{ color: '#22c55e' }}>{fmt(r.estimated_co2_saving_kg)}</td>
                      <td><span className="status-badge" style={{ background: prioColor(r.priority), color: '#fff' }}>{r.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.summary && (
            <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, color: '#cbd5e1', marginTop: 16 }}>{data.summary}</div>
          )}

          {data && (
            <AIReport response={data} title="Advisory planning report" />
          )}
        </div>
      )}
    </div>
  );
}

export default Sustainability;
