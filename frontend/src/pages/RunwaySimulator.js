import AIReport from '../components/AIReport';
import useNativeAIRequest from '../components/useNativeAIRequest';
import React, { useState } from 'react';

function RunwaySimulator({ token, api }) {
  const [scenario, setScenario] = useState({
    description: '',
    extra_flights: 0,
    runway_closure: '',
    weather_change: '',
    ground_stop_minutes: 0,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const impactColor = (i) => {
    const map = { minimal: '#22c55e', moderate: '#f59e0b', significant: '#f97316', severe: '#ef4444' };
    return map[(i || '').toLowerCase()] || '#94a3b8';
  };

  const aiRequest = useNativeAIRequest(() => setLoading(false));

  const runSimulation = async () => {
    const aiOwner = aiRequest.begin(); if (!aiOwner) return;
    try {
    if (!scenario.description) { setError('Please describe the scenario.'); return; }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await aiRequest.fetch(aiOwner,`${api}/api/ai/runway-simulator`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scenario }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Simulation failed');
      setData(result);
    } catch (err) {
      if (!aiRequest.isCurrent(aiOwner)) return;
      setError(err.message);
    }
    if (aiRequest.isCurrent(aiOwner)) setLoading(false);
    } finally { if (aiRequest.isCurrent(aiOwner)) { setLoading(false); aiRequest.finish(aiOwner); } }
  };

  return (
    <div>
      <div className="ai-example-actions">{['Quick review','Planning scenario','Detailed review'].map((label,index)=><button type="button" className="btn-cancel" disabled={loading} key={label} onClick={()=>{setScenario({description:['Fictional training scenario: review additional flights before human capacity review.','Fictional planning scenario: assess a proposed runway closure with verified sources required.','Fictional detailed scenario: assess adverse weather assumptions for human review.'][index],extra_flights:[5,10,15][index],runway_closure:['Proposed 04L closure','Proposed 04R closure','Proposed 13L closure'][index],weather_change:['Illustrative clear weather assumption','Illustrative reduced visibility assumption','Illustrative crosswind assumption'][index],ground_stop_minutes:[10,20,30][index]});setData(null);setError('');}}>{label}</button>)}</div><p>Examples fill all editable scenario fields, including optional fields. Review assumptions before requesting AI; actual sources and permissions remain separate.</p>
      {aiRequest.notice && <p role="status">{aiRequest.notice}</p>}<button type="button" className="btn-cancel" onClick={aiRequest.cancel}>Cancel AI request</button>
      <div className="page-header">
        <h1><i className="fas fa-flask"></i> AI Runway Capacity Simulator</h1>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Simulate hypothetical scenarios to understand runway capacity impacts, delay cascades, and mitigation strategies before they occur.
      </p>

      <div className="stat-card" style={{ marginBottom: 20, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}><i className="fas fa-edit"></i> Configure Scenario</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Scenario Description *</label>
            <input
              className="form-input"
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }}
              value={scenario.description}
              onChange={e => setScenario(s => ({ ...s, description: e.target.value }))}
              placeholder="e.g. RWY 04L closed for emergency"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Extra Flights</label>
            <input
              type="number"
              min="0"
              className="form-input"
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }}
              value={scenario.extra_flights}
              onChange={e => setScenario(s => ({ ...s, extra_flights: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Runway Closure</label>
            <input
              className="form-input"
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }}
              value={scenario.runway_closure}
              onChange={e => setScenario(s => ({ ...s, runway_closure: e.target.value }))}
              placeholder="e.g. RWY 04L"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Weather Change</label>
            <input
              className="form-input"
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }}
              value={scenario.weather_change}
              onChange={e => setScenario(s => ({ ...s, weather_change: e.target.value }))}
              placeholder="e.g. IFR, visibility 1/4 SM"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Ground Stop (minutes)</label>
            <input
              type="number"
              min="0"
              className="form-input"
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }}
              value={scenario.ground_stop_minutes}
              onChange={e => setScenario(s => ({ ...s, ground_stop_minutes: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-ai" onClick={runSimulation} disabled={loading}>
            <i className="fas fa-play"></i> {loading ? 'Simulating...' : 'Generate with OpenRouter'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is simulating scenario...</span></div>
        </div>
      )}

      {data && !loading && (
        <div>
          {data.overall_impact && (
            <div style={{ padding: 20, borderRadius: 12, background: `${impactColor(data.overall_impact)}10`, border: `1px solid ${impactColor(data.overall_impact)}40`, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Overall Impact</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: impactColor(data.overall_impact), textTransform: 'uppercase' }}>{data.overall_impact}</div>
            </div>
          )}

          {(data.baseline_throughput_per_hour != null || data.simulated_throughput_per_hour != null) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160, padding: 16, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Baseline Throughput/hr</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>{data.baseline_throughput_per_hour}</div>
              </div>
              <div style={{ flex: 1, minWidth: 160, padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Simulated Throughput/hr</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>{data.simulated_throughput_per_hour}</div>
              </div>
              {data.throughput_change_pct != null && (
                <div style={{ flex: 1, minWidth: 160, padding: 16, borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Throughput Change</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{data.throughput_change_pct}%</div>
                </div>
              )}
            </div>
          )}

          {data.scenario_summary && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.15)', marginBottom: 16 }}>
              <strong style={{ color: '#e2e8f0' }}>Scenario: </strong>
              <span style={{ color: '#94a3b8', fontSize: 14 }}>{data.scenario_summary}</span>
            </div>
          )}

          {Array.isArray(data.delay_cascade) && data.delay_cascade.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-stream" style={{ color: '#ef4444' }}></i> Delay Cascade Timeline</h3>
              <table className="data-table">
                <thead><tr><th>Time Offset (min)</th><th>Affected Flights</th><th>Cumulative Delay (min)</th></tr></thead>
                <tbody>
                  {data.delay_cascade.map((c, i) => (
                    <tr key={i}>
                      <td>+{c.time_offset_min} min</td>
                      <td style={{ color: '#f59e0b' }}>{c.affected_flights}</td>
                      <td style={{ color: '#ef4444' }}>{c.cumulative_delay_min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.mitigation_strategies) && data.mitigation_strategies.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-shield-alt" style={{ color: '#22c55e' }}></i> Mitigation Strategies</h3>
              <table className="data-table">
                <thead><tr><th>Action</th><th>Recovery Time (min)</th><th>Effectiveness</th></tr></thead>
                <tbody>
                  {data.mitigation_strategies.map((m, i) => (
                    <tr key={i}>
                      <td>{m.action}</td>
                      <td>{m.recovery_time_min}</td>
                      <td><span className={`status-badge status-${m.effectiveness}`}>{m.effectiveness}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.recommendation && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px' }}><i className="fas fa-lightbulb"></i> AI Recommendation</h4>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: 14 }}>{data.recommendation}</p>
            </div>
          )}

          {data && (
            <div className="ai-analysis-container">
              <AIReport response={data} title="Advisory planning report" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RunwaySimulator;
