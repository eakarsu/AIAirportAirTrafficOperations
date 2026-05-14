import React, { useState, useEffect } from 'react';

function PassengerExperience({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${api}/api/stats/passenger-experience`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load');
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [token, api]);

  const gradeColor = (g) => {
    const map = { A: '#22c55e', B: '#84cc16', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
    return map[g] || '#94a3b8';
  };

  const scoreColor = (s) => s >= 80 ? '#22c55e' : s >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-smile"></i> Passenger Experience Score</h1>
        <div className="header-actions">
          <button className="btn-cancel" onClick={load} disabled={loading}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Composite passenger experience score combining on-time performance, baggage handling, and safety record.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading && <div className="ai-loading"><div className="spinner"></div><span>Loading...</span></div>}

      {data && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 180, padding: 32, borderRadius: 16, background: 'rgba(30,41,59,0.6)', border: `2px solid ${gradeColor(data.grade)}40`, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Overall Grade</div>
              <div style={{ fontSize: 80, fontWeight: 900, color: gradeColor(data.grade), lineHeight: 1 }}>{data.grade}</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: scoreColor(data.overall_score), marginTop: 8 }}>{data.overall_score}/100</div>
            </div>
            <div style={{ flex: 2, minWidth: 240, padding: 24, borderRadius: 16, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.15)' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Benchmark</div>
              <div style={{ fontSize: 16, color: '#e2e8f0', marginBottom: 20, fontWeight: 600 }}>{data.benchmark}</div>
              {data.components && Object.entries(data.components).map(([key, comp]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8', fontSize: 13, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')} ({comp.weight})</span>
                    <span style={{ color: scoreColor(comp.score), fontWeight: 600 }}>{comp.score}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(148,163,184,0.15)' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${comp.score}%`, background: scoreColor(comp.score), transition: 'width 0.5s ease' }}></div>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{comp.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#475569', textAlign: 'right' }}>
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default PassengerExperience;
