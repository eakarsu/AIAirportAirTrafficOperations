import React, { useState } from 'react';

function WeatherRouting({ token, api }) {
  const [conditions, setConditions] = useState({
    wind_speed: '',
    visibility: '',
    ceiling: '',
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metarLoading, setMetarLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const update = (field) => (e) =>
    setConditions((prev) => ({ ...prev, [field]: e.target.value }));

  const loadMetar = async () => {
    setMetarLoading(true);
    setError('');
    try {
      const res = await fetch(`${api}/api/weather?page=1&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const records = Array.isArray(json) ? json : (json.data || []);
      const metar = records.find(r => r.report_type === 'METAR');
      if (!metar) { setError('No METAR report found in weather database.'); setMetarLoading(false); return; }
      setConditions({
        wind_speed: metar.wind_speed_knots != null ? String(metar.wind_speed_knots) : '',
        visibility: metar.visibility_miles != null ? String(metar.visibility_miles) : '',
        ceiling: metar.ceiling_feet != null ? String(metar.ceiling_feet) : '',
      });
    } catch (err) {
      setError('Failed to load METAR: ' + err.message);
    }
    setMetarLoading(false);
  };

  const runAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);
    try {
      const payload = { conditions: {} };
      Object.entries(conditions).forEach(([k, v]) => {
        if (v !== '') payload.conditions[k] = Number(v);
      });
      const res = await fetch(`${api}/api/ai/weather-routing`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const suitabilityColor = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'preferred') return '#22c55e';
    if (v === 'acceptable') return '#f59e0b';
    if (v === 'not_recommended') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-cloud-meatball"></i> Weather-Aware Route Planner</h1>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Enter current weather conditions — AI suggests runway selection, taxiway alternatives, and ground hold recommendations.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ margin: 0, color: '#fff' }}><i className="fas fa-thermometer-half"></i> Weather Conditions</h3>
            <button type="button" onClick={loadMetar} disabled={metarLoading} className="btn-cancel" style={{ fontSize: 12, padding: '6px 12px' }}>
              <i className="fas fa-cloud-download-alt"></i> {metarLoading ? 'Loading...' : 'Load METAR'}
            </button>
          </div>
          <form onSubmit={runAnalysis}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#94a3b8', fontSize: 13 }}>Wind Speed (knots)</label>
              <input
                type="number"
                step="0.1"
                value={conditions.wind_speed}
                onChange={update('wind_speed')}
                placeholder="e.g., 15"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#94a3b8', fontSize: 13 }}>Visibility (statute miles)</label>
              <input
                type="number"
                step="0.1"
                value={conditions.visibility}
                onChange={update('visibility')}
                placeholder="e.g., 10"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#94a3b8', fontSize: 13 }}>Ceiling (feet AGL)</label>
              <input
                type="number"
                step="50"
                value={conditions.ceiling}
                onChange={update('ceiling')}
                placeholder="e.g., 3000"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
              />
            </div>
            <button type="submit" className="btn-ai" disabled={loading} style={{ width: '100%' }}>
              <i className="fas fa-robot"></i> {loading ? 'Analyzing...' : 'Get Recommendations'}
            </button>
          </form>
        </div>

        <div>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}

          {loading && (
            <div className="ai-analysis-container">
              <div className="ai-loading">
                <div className="spinner"></div>
                <span>AI is analyzing weather routing...</span>
              </div>
            </div>
          )}

          {data && !loading && (
            <div>
              {Array.isArray(data.runway_recommendations) && data.runway_recommendations.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ color: '#fff', marginBottom: 12 }}><i className="fas fa-road"></i> Runway Recommendations</h3>
                  {data.runway_recommendations.map((r, i) => (
                    <div key={i} style={{
                      padding: 14, borderRadius: 10, marginBottom: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${suitabilityColor(r.suitability)}40`,
                      borderLeft: `4px solid ${suitabilityColor(r.suitability)}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong style={{ color: '#fff', fontSize: 16 }}>Runway {r.runway}</strong>
                        <span style={{ padding: '4px 12px', borderRadius: 12, background: suitabilityColor(r.suitability), color: '#fff', fontSize: 12, textTransform: 'uppercase' }}>
                          {r.suitability}
                        </span>
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: 14 }}>{r.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(data.taxiway_alternatives) && data.taxiway_alternatives.length > 0 && (
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 8px', color: '#a855f7' }}><i className="fas fa-route"></i> Taxiway Alternatives</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#e9d5ff' }}>
                    {data.taxiway_alternatives.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}

              {data.ground_hold_minutes !== undefined && data.ground_hold_minutes !== null && (
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 8px', color: '#f59e0b' }}><i className="fas fa-hourglass-half"></i> Ground Hold</h4>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fcd34d' }}>{data.ground_hold_minutes} min</div>
                  {data.ground_hold_reason && <div style={{ color: '#fde68a', fontSize: 14, marginTop: 4 }}>{data.ground_hold_reason}</div>}
                </div>
              )}

              {Array.isArray(data.operational_notes) && data.operational_notes.length > 0 && (
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 8px', color: '#22c55e' }}><i className="fas fa-clipboard-list"></i> Operational Notes</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#bbf7d0' }}>
                    {data.operational_notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}

              {data.faa_advisory && (
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#ef4444' }}><i className="fas fa-shield-alt"></i> FAA / ATC Advisory</h4>
                  <div style={{ color: '#fecaca', fontSize: 14, lineHeight: 1.6 }}>{data.faa_advisory}</div>
                </div>
              )}

              {data.raw_response && (
                <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 13 }}>{data.raw_response}</pre>
              )}
            </div>
          )}

          {!data && !loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-cloud" style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}></i>
              <p>Enter weather conditions and click "Get Recommendations".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeatherRouting;
