import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'flight_number', label: 'Flight Number' },
  { key: 'airline', label: 'Airline' },
  { key: 'gate_number', label: 'Gate' },
  { key: 'terminal', label: 'Terminal' },
  { key: 'aircraft_type', label: 'Aircraft Type' },
  { key: 'scheduled_time', label: 'Scheduled Time', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'status', label: 'Status', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
  { key: 'passenger_count', label: 'Passengers' },
];

const formFields = [
  { key: 'flight_number', label: 'Flight Number', required: true },
  { key: 'airline', label: 'Airline', required: true },
  { key: 'gate_number', label: 'Gate Number', required: true },
  { key: 'terminal', label: 'Terminal', type: 'select', options: ['T1', 'T2', 'T3', 'T4'], required: true },
  { key: 'aircraft_type', label: 'Aircraft Type', required: true },
  { key: 'scheduled_time', label: 'Scheduled Time', type: 'datetime-local', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'boarding', 'arrived', 'departed', 'delayed'], defaultValue: 'scheduled' },
  { key: 'passenger_count', label: 'Passengers', type: 'number', min: 0, defaultValue: 0 },
];

function GateAssignment({ token, api }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/gates?page=${page}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.data) {
        setItems(data.data);
        setPagination(data.pagination);
      } else {
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [api, token, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gate assignment?')) return;
    await fetch(`${api}/api/gates/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    const url = editItem ? `${api}/api/gates/${editItem.id}` : `${api}/api/gates`;
    const method = editItem ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
    if (!res.ok) {
      const err = await res.json();
      alert(err.errors ? err.errors.map(e => e.msg).join(', ') : err.error || 'Save failed');
      return;
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
      const res = await fetch(`${api}/api/ai/optimize-gates`, { method: 'POST', headers });
      const data = await res.json();
      setAiData(data);
    } catch (err) {
      setAiData({ error: err.message });
    }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-door-open"></i> Gate Assignment Optimization</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Assignment
          </button>
          <button className="btn-ai" onClick={runAI} disabled={aiLoading}>
            <i className="fas fa-robot"></i> {aiLoading ? 'Analyzing...' : 'AI Optimize'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><span>Loading...</span></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Flight</th>
                <th>Airline</th>
                <th>Gate</th>
                <th>Terminal</th>
                <th>Aircraft</th>
                <th>Scheduled</th>
                <th>Passengers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => setSelected(item)}>
                  <td><strong>{item.flight_number}</strong></td>
                  <td>{item.airline}</td>
                  <td>{item.gate_number}</td>
                  <td>{item.terminal}</td>
                  <td>{item.aircraft_type}</td>
                  <td>{new Date(item.scheduled_time).toLocaleString()}</td>
                  <td>{item.passenger_count}</td>
                  <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No assignments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button className="btn-cancel" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <i className="fas fa-chevron-left"></i> Prev
          </button>
          <span style={{ color: '#94a3b8' }}>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
          <button className="btn-cancel" disabled={page >= pagination.totalPages} onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}>
            Next <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      {aiLoading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is optimizing gate assignments...</span></div>
        </div>
      )}

      {aiData && !aiLoading && (
        <div style={{ marginTop: 24 }}>
          {aiData.optimization_score !== undefined && (
            <div style={{ padding: 24, borderRadius: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Optimization Score</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: aiData.optimization_score > 70 ? '#22c55e' : aiData.optimization_score > 40 ? '#f59e0b' : '#ef4444' }}>
                {aiData.optimization_score}
              </div>
              {aiData.estimated_delay_reduction_min != null && (
                <div style={{ color: '#94a3b8', marginTop: 8 }}>Estimated delay reduction: <strong style={{ color: '#22c55e' }}>{aiData.estimated_delay_reduction_min} min</strong></div>
              )}
            </div>
          )}

          {Array.isArray(aiData.conflict_alerts) && aiData.conflict_alerts.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-bell" style={{ color: '#ef4444' }}></i> Conflict Alerts</h3>
              {aiData.conflict_alerts.map((a, i) => (
                <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: a.severity === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', borderLeft: `3px solid ${a.severity === 'high' ? '#ef4444' : '#f59e0b'}` }}>
                  <strong style={{ color: '#e2e8f0' }}>{a.gate}</strong>: {a.issue}
                  <span className="status-badge" style={{ float: 'right', background: a.severity === 'high' ? '#ef444420' : '#f59e0b20', color: a.severity === 'high' ? '#ef4444' : '#f59e0b' }}>{a.severity}</span>
                </div>
              ))}
            </div>
          )}

          {Array.isArray(aiData.gate_swap_recommendations) && aiData.gate_swap_recommendations.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exchange-alt" style={{ color: '#38bdf8' }}></i> Swap Recommendations</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Flight</th><th>From Gate</th><th>To Gate</th><th>Reason</th><th>Impact</th></tr>
                </thead>
                <tbody>
                  {aiData.gate_swap_recommendations.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.flight_number}</strong></td>
                      <td>{s.from_gate}</td>
                      <td>{s.to_gate}</td>
                      <td style={{ fontSize: 13 }}>{s.reason}</td>
                      <td><span className={`status-badge status-${s.passenger_impact}`}>{s.passenger_impact}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.efficiency_improvements) && aiData.efficiency_improvements.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px' }}><i className="fas fa-lightbulb"></i> Efficiency Improvements</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {aiData.efficiency_improvements.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
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
          title={`Gate Assignment - ${selected.flight_number}`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Gate Assignment' : 'New Gate Assignment'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default GateAssignment;
