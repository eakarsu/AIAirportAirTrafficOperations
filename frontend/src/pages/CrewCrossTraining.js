import NativeAIContext from '../components/NativeAIContext';
import AIReport from '../components/AIReport';
import useNativeAIRequest from '../components/useNativeAIRequest';
import React, { useState } from 'react';

function CrewCrossTraining({ token, api }) {
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
      const res = await aiRequest.fetch(aiOwner,`${api}/api/ai/crew-cross-training`, {
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

  return (
    <div>
      <NativeAIContext title="Crew Cross Training" value={planningContext} onChange={setPlanningContext} disabled={loading}/>
      {aiRequest.notice && <p role="status">{aiRequest.notice}</p>}<button type="button" className="btn-cancel" onClick={aiRequest.cancel}>Cancel AI request</button>
      <div className="page-header">
        <h1><i className="fas fa-graduation-cap"></i> Crew Cross-Training Optimizer</h1>
        <button className="btn-ai" onClick={run} disabled={loading}>
          <i className="fas fa-robot"></i> {loading ? 'Analyzing...' : 'Generate with OpenRouter'}
        </button>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI identifies skill gaps and recommends pairings to improve redundancy and minimize delays from absences.
      </p>

      {error && <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>{error}</div>}
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

          {data && (
            <AIReport response={data} title="Advisory planning report" />
          )}
        </div>
      )}
    </div>
  );
}

export default CrewCrossTraining;
