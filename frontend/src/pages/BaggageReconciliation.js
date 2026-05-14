import React, { useState } from 'react';

function BaggageReconciliation({ token, api }) {
  const [tagId, setTagId] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [originFlight, setOriginFlight] = useState('');
  const [reportedAt, setReportedAt] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!tagId) { setError('Tag ID is required'); return; }
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`${api}/api/ai/baggage-reconciliation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missing_bag: {
            tag_id: tagId,
            passenger_name: passengerName,
            origin_flight: originFlight,
            reported_at: reportedAt || new Date().toISOString(),
          },
        }),
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
        <h1><i className="fas fa-search-location"></i> Baggage Reconciliation AI</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI cross-checks tracking data and suggests recovery locations with confidence scores.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <input className="form-input" placeholder="Tag ID *" value={tagId} onChange={(e) => setTagId(e.target.value)} />
        <input className="form-input" placeholder="Passenger Name" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} />
        <input className="form-input" placeholder="Origin Flight" value={originFlight} onChange={(e) => setOriginFlight(e.target.value)} />
        <input className="form-input" placeholder="Reported at (ISO date)" value={reportedAt} onChange={(e) => setReportedAt(e.target.value)} />
      </div>
      <button className="btn-ai" onClick={run} disabled={loading}>
        <i className="fas fa-robot"></i> {loading ? 'Searching...' : 'Find Bag'}
      </button>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginTop: 16 }}>{error}</div>}
      {loading && <div className="ai-loading" style={{ marginTop: 16 }}><div className="spinner"></div><span>Tracing bag...</span></div>}

      {data && !loading && (
        <div style={{ marginTop: 20 }}>
          {Array.isArray(data.candidate_locations) && data.candidate_locations.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}>Candidate Locations</h3>
              <table className="data-table">
                <thead><tr><th>Location</th><th>Confidence</th><th>Evidence</th><th>Next Action</th></tr></thead>
                <tbody>
                  {data.candidate_locations.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.location}</strong></td>
                      <td>{(c.confidence * 100).toFixed(0)}%</td>
                      <td>{c.evidence}</td>
                      <td>{c.next_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.estimated_recovery_minutes !== undefined && (
            <div style={{ padding: 16, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 12, marginBottom: 16 }}>
              Estimated Recovery: <strong>{data.estimated_recovery_minutes} minutes</strong>
            </div>
          )}

          {Array.isArray(data.recommended_recovery_steps) && (
            <div style={{ background: '#0f172a', padding: 16, borderRadius: 8 }}>
              <h3 style={{ marginTop: 0, color: '#fff' }}>Recovery Steps</h3>
              <ol style={{ color: '#cbd5e1' }}>
                {data.recommended_recovery_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}

          {data.raw_response && (
            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{data.raw_response}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default BaggageReconciliation;
