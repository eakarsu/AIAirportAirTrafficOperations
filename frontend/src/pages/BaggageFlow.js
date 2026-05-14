import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'tag_id', label: 'Tag ID' },
  { key: 'flight_number', label: 'Flight Number' },
  { key: 'passenger_name', label: 'Passenger' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'current_location', label: 'Current Location' },
  { key: 'status', label: 'Status', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
  { key: 'weight_kg', label: 'Weight', render: v => `${v} kg` },
  { key: 'priority', label: 'Priority' },
  { key: 'last_scan_time', label: 'Last Scan', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
];

const formFields = [
  { key: 'tag_id', label: 'Tag ID', required: true },
  { key: 'flight_number', label: 'Flight Number', required: true },
  { key: 'passenger_name', label: 'Passenger Name', required: true },
  { key: 'origin', label: 'Origin (IATA)', required: true },
  { key: 'destination', label: 'Destination (IATA)', required: true },
  { key: 'current_location', label: 'Current Location', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['checked_in', 'screening', 'sorting', 'in_transit', 'loaded', 'transfer', 'customs', 'arriving', 'delivered', 'mishandled'], defaultValue: 'checked_in' },
  { key: 'weight_kg', label: 'Weight (kg)', type: 'number', step: 0.1, min: 0, defaultValue: 0 },
  { key: 'priority', label: 'Priority', type: 'select', options: ['normal', 'priority', 'first_class', 'fragile', 'diplomatic', 'oversized', 'urgent'], defaultValue: 'normal' },
];

function BaggageFlow({ token, api }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/baggage?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : (data.data || []));
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this baggage record?')) return;
    await fetch(`${api}/api/baggage/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    if (editItem) {
      await fetch(`${api}/api/baggage/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    } else {
      await fetch(`${api}/api/baggage`, { method: 'POST', headers, body: JSON.stringify(data) });
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
      const res = await fetch(`${api}/api/ai/optimize-baggage`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI analysis failed');
      setAiData(data);
    } catch (err) {
      setAiData({ raw_response: 'Error: ' + err.message });
    }
    setAiLoading(false);
  };

  const getPriorityColor = (p) => {
    const colors = { urgent: '#ef4444', first_class: '#a855f7', diplomatic: '#f59e0b', priority: '#38bdf8', fragile: '#fb923c', oversized: '#818cf8', normal: '#94a3b8' };
    return colors[p] || '#94a3b8';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-suitcase-rolling"></i> Baggage Flow Tracking</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Baggage
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
              <th>Tag ID</th>
              <th>Flight</th>
              <th>Passenger</th>
              <th>Route</th>
              <th>Location</th>
              <th>Weight</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td><strong>{item.tag_id}</strong></td>
                <td>{item.flight_number}</td>
                <td>{item.passenger_name}</td>
                <td>{item.origin} → {item.destination}</td>
                <td>{item.current_location}</td>
                <td>{item.weight_kg} kg</td>
                <td><span style={{ color: getPriorityColor(item.priority), fontWeight: 600 }}>{item.priority}</span></td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aiLoading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is optimizing baggage flow...</span></div>
        </div>
      )}

      {aiData && !aiLoading && (
        <div style={{ marginTop: 24 }}>
          {aiData.flow_efficiency_score !== undefined && (
            <div style={{ padding: 24, borderRadius: 12, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Flow Efficiency Score</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: aiData.flow_efficiency_score > 70 ? '#22c55e' : aiData.flow_efficiency_score > 40 ? '#f59e0b' : '#ef4444' }}>{aiData.flow_efficiency_score}</div>
              {aiData.mishandled_bags != null && <div style={{ color: '#94a3b8', marginTop: 8 }}>Mishandled bags: <strong style={{ color: '#ef4444' }}>{aiData.mishandled_bags}</strong></div>}
            </div>
          )}

          {Array.isArray(aiData.bottlenecks) && aiData.bottlenecks.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exclamation-circle" style={{ color: '#ef4444' }}></i> Bottlenecks</h3>
              <table className="data-table">
                <thead><tr><th>Location</th><th>Severity</th><th>Bags Affected</th><th>Recommended Action</th></tr></thead>
                <tbody>
                  {aiData.bottlenecks.map((b, i) => (
                    <tr key={i}>
                      <td><strong>{b.location}</strong></td>
                      <td><span className="status-badge" style={{ background: b.severity === 'high' ? '#ef4444' : b.severity === 'medium' ? '#f59e0b' : '#22c55e', color: '#fff' }}>{b.severity}</span></td>
                      <td>{b.bags_affected}</td>
                      <td style={{ fontSize: 13 }}>{b.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.lost_baggage_risks) && aiData.lost_baggage_risks.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-search-location" style={{ color: '#f59e0b' }}></i> Lost Baggage Risks</h3>
              <table className="data-table">
                <thead><tr><th>Tag</th><th>Flight</th><th>Risk</th><th>Reason</th><th>Action Required</th></tr></thead>
                <tbody>
                  {aiData.lost_baggage_risks.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.tag_id}</strong></td>
                      <td>{r.flight_number}</td>
                      <td><span className="status-badge" style={{ background: r.risk_level === 'high' ? '#ef4444' : r.risk_level === 'medium' ? '#f59e0b' : '#22c55e', color: '#fff' }}>{r.risk_level}</span></td>
                      <td style={{ fontSize: 13 }}>{r.reason}</td>
                      <td style={{ fontSize: 13, color: '#38bdf8' }}>{r.action_required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.routing_optimizations) && aiData.routing_optimizations.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px' }}><i className="fas fa-route"></i> Routing Optimizations</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {aiData.routing_optimizations.map((r, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{r.current_path} → <strong style={{ color: '#22c55e' }}>{r.optimized_path}</strong> ({r.time_saving_min} min saved)</li>
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
          title={`Baggage - ${selected.tag_id}`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Baggage' : 'New Baggage'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default BaggageFlow;
