import React, { useState, useEffect, useCallback } from 'react';

function ConnectionAnalysis({ token, api }) {
  const [flights, setFlights] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch(`${api}/api/flights?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFlights(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      setError(err.message);
    }
  }, [api, token]);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  const toggleFlight = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runAnalysis = async () => {
    if (selectedIds.length === 0) {
      setError('Select at least one flight to analyze.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`${api}/api/ai/connection-analysis`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ flight_ids: selectedIds }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const riskColor = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'critical') return '#dc2626';
    if (l === 'high') return '#ef4444';
    if (l === 'medium') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-people-arrows"></i> Passenger Connection Saver</h1>
        <div className="header-actions">
          <button className="btn-ai" onClick={runAnalysis} disabled={loading || selectedIds.length === 0}>
            <i className="fas fa-robot"></i> {loading ? 'Analyzing...' : `Analyze ${selectedIds.length} Selected`}
          </button>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Select arriving flights — AI will identify at-risk connections and recommend rebooking priority order.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Flight</th>
              <th>Airline</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Scheduled Departure</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f) => (
              <tr key={f.id} style={{ background: selectedIds.includes(f.id) ? 'rgba(56,189,248,0.08)' : '' }}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(f.id)}
                    onChange={() => toggleFlight(f.id)}
                  />
                </td>
                <td><strong>{f.flight_number}</strong></td>
                <td>{f.airline}</td>
                <td>{f.origin}</td>
                <td>{f.destination}</td>
                <td>{(f.scheduled_time || f.scheduled_departure) ? new Date(f.scheduled_time || f.scheduled_departure).toLocaleString() : '-'}</td>
                <td><span className={`status-badge status-${f.status}`}>{f.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && !loading && (
        <div style={{ marginTop: 24 }}>
          {data.summary && (
            <div style={{
              padding: 20, borderRadius: 12,
              background: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.3)',
              marginBottom: 20,
            }}>
              <h3 style={{ margin: '0 0 8px', color: '#38bdf8' }}>Summary</h3>
              <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.6 }}>{data.summary}</p>
            </div>
          )}

          {Array.isArray(data.at_risk_connections) && data.at_risk_connections.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-bell"></i> At-Risk Connections</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Arriving Flight</th>
                    <th>Connection Flight</th>
                    <th>Risk</th>
                    <th>Reason</th>
                    <th>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.at_risk_connections.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.arriving_flight}</strong></td>
                      <td>{c.connection_flight}</td>
                      <td><span className="status-badge" style={{ background: riskColor(c.risk_level), color: '#fff' }}>{c.risk_level}</span></td>
                      <td>{c.reason}</td>
                      <td>{c.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.rebooking_priority_order) && data.rebooking_priority_order.length > 0 && (
            <div style={{
              padding: 20, borderRadius: 12,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              marginBottom: 20,
            }}>
              <h3 style={{ margin: '0 0 12px', color: '#f59e0b' }}><i className="fas fa-list-ol"></i> Rebooking Priority Order</h3>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#fcd34d', lineHeight: 1.8 }}>
                {data.rebooking_priority_order.map((flight, i) => (
                  <li key={i}><strong>{flight}</strong></li>
                ))}
              </ol>
            </div>
          )}

          {data.raw_response && (
            <div className="ai-analysis-container">
              <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 13 }}>{data.raw_response}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConnectionAnalysis;
