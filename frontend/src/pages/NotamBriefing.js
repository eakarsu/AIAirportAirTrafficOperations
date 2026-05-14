import React, { useState } from 'react';

function NotamBriefing({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`${api}/api/ai/notam-briefing`, { method: 'POST', headers });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const statusColor = (s) => {
    const map = { open: '#22c55e', closed: '#ef4444', restricted: '#f59e0b', operational: '#22c55e', degraded: '#f59e0b', out_of_service: '#ef4444' };
    return map[(s || '').toLowerCase().replace(/ /g, '_')] || '#94a3b8';
  };

  const catColor = (c) => {
    const map = { VFR: '#22c55e', MVFR: '#f59e0b', IFR: '#f97316', LIFR: '#ef4444' };
    return map[c] || '#94a3b8';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-broadcast-tower"></i> AI NOTAM Briefing</h1>
        <div className="header-actions">
          <button className="btn-ai" onClick={runAnalysis} disabled={loading}>
            <i className="fas fa-robot"></i> {loading ? 'Generating...' : 'Generate Briefing'}
          </button>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI parses active NOTAMs and current weather to generate a structured operational briefing for pilots and crew.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is generating NOTAM briefing...</span></div>
        </div>
      )}

      {data && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {data.flight_category && (
              <div style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 10, background: `${catColor(data.flight_category)}10`, border: `1px solid ${catColor(data.flight_category)}40`, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Flight Category</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: catColor(data.flight_category) }}>{data.flight_category}</div>
              </div>
            )}
            {data.validity_period && (
              <div style={{ flex: 2, minWidth: 200, padding: 16, borderRadius: 10, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.15)' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Validity</div>
                <div style={{ color: '#e2e8f0', fontSize: 14 }}>{data.validity_period}</div>
                {data.weather_summary && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>{data.weather_summary}</div>}
              </div>
            )}
          </div>

          {Array.isArray(data.runway_status) && data.runway_status.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-road"></i> Runway Status</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Runway</th><th>Status</th><th>Restrictions</th><th>Alternative</th></tr>
                </thead>
                <tbody>
                  {data.runway_status.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.runway}</strong></td>
                      <td><span className="status-badge" style={{ background: `${statusColor(r.status)}20`, color: statusColor(r.status) }}>{r.status}</span></td>
                      <td style={{ fontSize: 13 }}>{(r.restrictions || []).join(', ') || '—'}</td>
                      <td style={{ fontSize: 13, color: '#94a3b8' }}>{r.alternative || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.taxiway_restrictions) && data.taxiway_restrictions.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-route" style={{ color: '#f59e0b' }}></i> Taxiway Restrictions</h3>
              <table className="data-table">
                <thead><tr><th>Taxiway</th><th>Restriction</th><th>Alternative</th></tr></thead>
                <tbody>
                  {data.taxiway_restrictions.map((t, i) => (
                    <tr key={i}>
                      <td><strong>{t.taxiway}</strong></td>
                      <td style={{ color: '#f59e0b', fontSize: 13 }}>{t.restriction}</td>
                      <td style={{ fontSize: 13 }}>{t.alternative || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.navigation_aids) && data.navigation_aids.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-satellite-dish" style={{ color: '#38bdf8' }}></i> Navigation Aids</h3>
              <table className="data-table">
                <thead><tr><th>Aid</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                  {data.navigation_aids.map((n, i) => (
                    <tr key={i}>
                      <td><strong>{n.aid}</strong></td>
                      <td><span className="status-badge" style={{ background: `${statusColor(n.status)}20`, color: statusColor(n.status) }}>{n.status}</span></td>
                      <td style={{ fontSize: 13 }}>{n.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.crew_actions_required) && data.crew_actions_required.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16 }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 8px' }}><i className="fas fa-exclamation-circle"></i> Crew Actions Required</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {data.crew_actions_required.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
              </ul>
            </div>
          )}

          {Array.isArray(data.special_procedures) && data.special_procedures.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16 }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 8px' }}><i className="fas fa-list-alt"></i> Special Procedures</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {data.special_procedures.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
              </ul>
            </div>
          )}

          {data.notam_summary && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', color: '#cbd5e1', fontSize: 14 }}>
              <strong style={{ color: '#e2e8f0' }}>NOTAM Summary: </strong>{data.notam_summary}
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
          <i className="fas fa-broadcast-tower" style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}></i>
          <p>Click "Generate Briefing" to create an AI NOTAM operational briefing.</p>
        </div>
      )}
    </div>
  );
}

export default NotamBriefing;
