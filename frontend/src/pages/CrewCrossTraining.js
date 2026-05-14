import React, { useState } from 'react';

function CrewCrossTraining({ token, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`${api}/api/ai/crew-cross-training`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-graduation-cap"></i> Crew Cross-Training Optimizer</h1>
        <button className="btn-ai" onClick={run} disabled={loading}>
          <i className="fas fa-robot"></i> {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI identifies skill gaps and recommends pairings to improve redundancy and minimize delays from absences.
      </p>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>{error}</div>}
      {loading && <div className="ai-loading"><div className="spinner"></div><span>Analyzing crew skills...</span></div>}

      {data && !loading && (
        <div>
          {data.redundancy_score !== undefined && (
            <div style={{ padding: 24, borderRadius: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Redundancy Score</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#38bdf8' }}>{data.redundancy_score}</div>
              {data.expected_delay_reduction_pct !== undefined && (
                <div style={{ marginTop: 8, color: '#22c55e' }}>
                  Expected delay reduction: <strong>{data.expected_delay_reduction_pct}%</strong>
                </div>
              )}
            </div>
          )}

          {Array.isArray(data.skill_gaps) && data.skill_gaps.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}>Skill Gaps</h3>
              <table className="data-table">
                <thead><tr><th>Skill</th><th>Current Coverage %</th><th>Target Coverage %</th></tr></thead>
                <tbody>
                  {data.skill_gaps.map((g, i) => (
                    <tr key={i}><td>{g.skill}</td><td>{g.current_coverage_pct}%</td><td>{g.target_coverage_pct}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.training_pairings) && data.training_pairings.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}>Recommended Pairings</h3>
              <table className="data-table">
                <thead><tr><th>Trainer</th><th>Trainee</th><th>Skill</th><th>Hours</th></tr></thead>
                <tbody>
                  {data.training_pairings.map((p, i) => (
                    <tr key={i}><td>{p.trainer_crew || p.trainer_id}</td><td>{p.trainee_crew || p.trainee_id}</td><td>{p.skill}</td><td>{p.estimated_hours}h</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.summary && (
            <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, color: '#cbd5e1' }}>{data.summary}</div>
          )}

          {data.raw_response && (
            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{data.raw_response}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default CrewCrossTraining;
