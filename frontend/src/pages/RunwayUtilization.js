import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'runway_id', label: 'Runway' },
  { key: 'flight_number', label: 'Flight Number' },
  { key: 'operation_type', label: 'Operation' },
  { key: 'aircraft_type', label: 'Aircraft Type' },
  { key: 'scheduled_time', label: 'Scheduled', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'actual_time', label: 'Actual', render: v => v ? new Date(v).toLocaleString() : 'Pending' },
  { key: 'wind_speed_knots', label: 'Wind Speed', render: v => `${v} knots` },
  { key: 'visibility_miles', label: 'Visibility', render: v => `${v} miles` },
  { key: 'status', label: 'Status', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
];

const formFields = [
  { key: 'runway_id', label: 'Runway ID', type: 'select', options: ['RWY-04L', 'RWY-04R', 'RWY-22L', 'RWY-22R', 'RWY-13L', 'RWY-13R', 'RWY-31L', 'RWY-31R'], required: true },
  { key: 'flight_number', label: 'Flight Number', required: true },
  { key: 'operation_type', label: 'Operation', type: 'select', options: ['arrival', 'departure'], required: true },
  { key: 'aircraft_type', label: 'Aircraft Type', required: true },
  { key: 'scheduled_time', label: 'Scheduled Time', type: 'datetime-local', required: true },
  { key: 'actual_time', label: 'Actual Time', type: 'datetime-local' },
  { key: 'wind_speed_knots', label: 'Wind (knots)', type: 'number', min: 0, defaultValue: 0 },
  { key: 'visibility_miles', label: 'Visibility (miles)', type: 'number', step: 0.1, min: 0, defaultValue: 10 },
  { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'approach', 'taxiing', 'on_runway', 'completed', 'cancelled'], defaultValue: 'scheduled' },
];

function RunwayUtilization({ token, api }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/runways?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : (data.data || []));
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this runway operation?')) return;
    await fetch(`${api}/api/runways/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    if (editItem) {
      await fetch(`${api}/api/runways/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    } else {
      await fetch(`${api}/api/runways`, { method: 'POST', headers, body: JSON.stringify(data) });
    }
    setShowForm(false);
    setEditItem(null);
    fetchData();
  };

  const handleEdit = (item) => {
    setSelected(null);
    setEditItem(item);
    setShowForm(true);
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiData(null);
    try {
      const res = await fetch(`${api}/api/ai/optimize-runways`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI analysis failed');
      setAiData(data);
    } catch (err) {
      setAiData({ raw_response: 'Error: ' + err.message });
    }
    setAiLoading(false);
  };

  const severityColor = (s) => {
    const m = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
    return m[(s || '').toLowerCase()] || '#94a3b8';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-road"></i> Runway Utilization</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Operation
          </button>
          <button className="btn-ai" onClick={runAI} disabled={aiLoading}>
            <i className="fas fa-robot"></i> AI Optimize
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Runway</th>
              <th>Flight</th>
              <th>Operation</th>
              <th>Aircraft</th>
              <th>Scheduled</th>
              <th>Actual</th>
              <th>Wind</th>
              <th>Visibility</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td><strong>{item.runway_id}</strong></td>
                <td>{item.flight_number}</td>
                <td><span style={{ color: item.operation_type === 'arrival' ? '#22c55e' : '#38bdf8', fontWeight: 600 }}>{item.operation_type}</span></td>
                <td>{item.aircraft_type}</td>
                <td>{new Date(item.scheduled_time).toLocaleString()}</td>
                <td>{item.actual_time ? new Date(item.actual_time).toLocaleString() : '—'}</td>
                <td>{item.wind_speed_knots} kt</td>
                <td>{item.visibility_miles} mi</td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aiLoading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is optimizing runway utilization...</span></div>
        </div>
      )}

      {aiData && !aiLoading && (
        <div style={{ marginTop: 24 }}>
          {(aiData.utilization_score !== undefined || aiData.throughput_efficiency_pct !== undefined) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {aiData.utilization_score !== undefined && (
                <div style={{ flex: 1, minWidth: 180, padding: 20, borderRadius: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Utilization Score</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: aiData.utilization_score > 70 ? '#22c55e' : aiData.utilization_score > 40 ? '#f59e0b' : '#ef4444' }}>{aiData.utilization_score}</div>
                  {aiData.estimated_delay_reduction_min != null && (
                    <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 13 }}>Est. delay reduction: <strong style={{ color: '#22c55e' }}>{aiData.estimated_delay_reduction_min} min</strong></div>
                  )}
                </div>
              )}
              {aiData.throughput_efficiency_pct !== undefined && (
                <div style={{ flex: 1, minWidth: 180, padding: 20, borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Throughput Efficiency</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#22c55e' }}>{aiData.throughput_efficiency_pct}%</div>
                </div>
              )}
            </div>
          )}

          {Array.isArray(aiData.safety_flags) && aiData.safety_flags.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i> Safety Flags</h3>
              <table className="data-table">
                <thead><tr><th>Runway</th><th>Issue</th><th>Severity</th><th>Action Required</th></tr></thead>
                <tbody>
                  {aiData.safety_flags.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{f.runway_id}</strong></td>
                      <td style={{ fontSize: 13 }}>{f.issue}</td>
                      <td><span className="status-badge" style={{ background: severityColor(f.severity), color: '#fff' }}>{f.severity}</span></td>
                      <td style={{ fontSize: 13, color: '#f59e0b' }}>{f.action_required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.capacity_recommendations) && aiData.capacity_recommendations.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-chart-bar" style={{ color: '#38bdf8' }}></i> Capacity Recommendations</h3>
              <table className="data-table">
                <thead><tr><th>Runway</th><th>Current Ops/Hr</th><th>Max Capacity</th><th>Recommendation</th></tr></thead>
                <tbody>
                  {aiData.capacity_recommendations.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.runway_id}</strong></td>
                      <td>{r.current_ops_per_hour}</td>
                      <td>{r.max_capacity_per_hour}</td>
                      <td style={{ fontSize: 13 }}>{r.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.weather_impacts) && aiData.weather_impacts.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-cloud-rain" style={{ color: '#f59e0b' }}></i> Weather Impacts</h3>
              <table className="data-table">
                <thead><tr><th>Runway</th><th>Condition</th><th>Impact</th><th>Mitigation</th></tr></thead>
                <tbody>
                  {aiData.weather_impacts.map((w, i) => (
                    <tr key={i}>
                      <td><strong>{w.runway_id}</strong></td>
                      <td>{w.condition}</td>
                      <td style={{ fontSize: 13 }}>{w.impact}</td>
                      <td style={{ fontSize: 13, color: '#38bdf8' }}>{w.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.sequencing_improvements) && aiData.sequencing_improvements.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px' }}><i className="fas fa-sort-amount-down"></i> Sequencing Improvements</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {aiData.sequencing_improvements.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong style={{ color: '#e2e8f0' }}>{s.runway_id}</strong>: {s.current_sequence} → <strong style={{ color: '#22c55e' }}>{s.optimized_sequence}</strong>
                    {s.time_saving_min && <span style={{ color: '#22c55e' }}> ({s.time_saving_min} min saved)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiData.summary && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', color: '#cbd5e1', fontSize: 14 }}>
              {aiData.summary}
            </div>
          )}

          {aiData.raw_response && (
            <div className="ai-analysis-container">
              <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 13 }}>{aiData.raw_response}</pre>
            </div>
          )}
        </div>
      )}

      {selected && (
        <DetailModal
          title={`Runway Op - ${selected.runway_id} / ${selected.flight_number}`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Runway Operation' : 'New Runway Operation'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default RunwayUtilization;
