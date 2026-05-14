import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'crew_name', label: 'Crew Name' },
  { key: 'crew_type', label: 'Crew Type' },
  { key: 'members_count', label: 'Members' },
  { key: 'shift_start', label: 'Shift Start', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'shift_end', label: 'Shift End', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'assigned_terminal', label: 'Terminal' },
  { key: 'status', label: 'Status', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
  { key: 'specialization', label: 'Specialization' },
];

const formFields = [
  { key: 'crew_name', label: 'Crew Name', required: true },
  { key: 'crew_type', label: 'Crew Type', type: 'select', options: ['ramp', 'fueling', 'baggage', 'catering', 'maintenance', 'cleaning', 'pushback', 'de-icing', 'cargo', 'security', 'ground_support'], required: true },
  { key: 'members_count', label: 'Members Count', type: 'number', min: 1, required: true },
  { key: 'shift_start', label: 'Shift Start', type: 'datetime-local', required: true },
  { key: 'shift_end', label: 'Shift End', type: 'datetime-local', required: true },
  { key: 'assigned_terminal', label: 'Terminal', type: 'select', options: ['T1', 'T2', 'T3', 'T4'], required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['available', 'active', 'standby', 'scheduled', 'off_duty'], defaultValue: 'available' },
  { key: 'specialization', label: 'Specialization', required: true },
];

const severityColor = (s) => {
  const m = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
  return m[(s || '').toLowerCase()] || '#94a3b8';
};

function GroundCrew({ token, api }) {
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
      const res = await fetch(`${api}/api/crews?page=${page}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
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
    if (!window.confirm('Delete this crew?')) return;
    try {
      await fetch(`${api}/api/crews/${id}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error(err);
    }
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    const url = editItem ? `${api}/api/crews/${editItem.id}` : `${api}/api/crews`;
    const method = editItem ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        alert(err.errors ? err.errors.map(e => e.msg).join(', ') : err.error || 'Save failed');
        return;
      }
    } catch (err) {
      alert('Network error: ' + err.message);
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
      const res = await fetch(`${api}/api/ai/optimize-crews`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI analysis failed');
      setAiData(data);
    } catch (err) {
      setAiData({ raw_response: 'Error: ' + err.message });
    }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-users"></i> Ground Crew Scheduling</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Crew
          </button>
          <button className="btn-ai" onClick={runAI} disabled={aiLoading}>
            <i className="fas fa-robot"></i> AI Optimize
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
                <th>Crew Name</th>
                <th>Type</th>
                <th>Members</th>
                <th>Shift Start</th>
                <th>Shift End</th>
                <th>Terminal</th>
                <th>Specialization</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => setSelected(item)}>
                  <td><strong>{item.crew_name}</strong></td>
                  <td>{item.crew_type}</td>
                  <td>{item.members_count}</td>
                  <td>{new Date(item.shift_start).toLocaleString()}</td>
                  <td>{new Date(item.shift_end).toLocaleString()}</td>
                  <td>{item.assigned_terminal}</td>
                  <td>{item.specialization}</td>
                  <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No crews found.</td></tr>
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
          <div className="ai-loading"><div className="spinner"></div><span>AI is optimizing crew schedules...</span></div>
        </div>
      )}

      {aiData && !aiLoading && (
        <div style={{ marginTop: 24 }}>
          {(aiData.coverage_score !== undefined || aiData.efficiency_score !== undefined) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {aiData.coverage_score !== undefined && (
                <div style={{ flex: 1, minWidth: 180, padding: 20, borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Coverage Score</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: aiData.coverage_score > 70 ? '#22c55e' : aiData.coverage_score > 40 ? '#f59e0b' : '#ef4444' }}>{aiData.coverage_score}</div>
                </div>
              )}
              {aiData.efficiency_score !== undefined && (
                <div style={{ flex: 1, minWidth: 180, padding: 20, borderRadius: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Efficiency Score</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#38bdf8' }}>{aiData.efficiency_score}</div>
                </div>
              )}
            </div>
          )}

          {Array.isArray(aiData.scheduling_conflicts) && aiData.scheduling_conflicts.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exclamation-circle" style={{ color: '#ef4444' }}></i> Scheduling Conflicts</h3>
              <table className="data-table">
                <thead><tr><th>Crew</th><th>Issue</th><th>Severity</th></tr></thead>
                <tbody>
                  {aiData.scheduling_conflicts.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.crew_name}</strong></td>
                      <td style={{ fontSize: 13 }}>{c.issue}</td>
                      <td><span className="status-badge" style={{ background: severityColor(c.severity), color: '#fff' }}>{c.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.fatigue_risks) && aiData.fatigue_risks.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-tired" style={{ color: '#f97316' }}></i> Fatigue Risks</h3>
              <table className="data-table">
                <thead><tr><th>Crew</th><th>Risk Level</th><th>Reason</th></tr></thead>
                <tbody>
                  {aiData.fatigue_risks.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{f.crew_name}</strong></td>
                      <td><span className="status-badge" style={{ background: severityColor(f.risk_level), color: '#fff' }}>{f.risk_level}</span></td>
                      <td style={{ fontSize: 13 }}>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.recommended_adjustments) && aiData.recommended_adjustments.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 8px' }}><i className="fas fa-lightbulb"></i> Recommended Adjustments</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {aiData.recommended_adjustments.map((a, i) => (
                  <li key={i} style={{ marginBottom: 4 }}><strong style={{ color: '#e2e8f0' }}>{a.crew_name}</strong>: {a.action} — {a.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(aiData.understaffed_terminals) && aiData.understaffed_terminals.length > 0 && (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
              <strong style={{ color: '#ef4444' }}>Understaffed Terminals:</strong>
              <span style={{ color: '#fca5a5', marginLeft: 8 }}>{aiData.understaffed_terminals.join(', ')}</span>
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
          title={`Crew - ${selected.crew_name}`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Crew' : 'New Crew'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default GroundCrew;
