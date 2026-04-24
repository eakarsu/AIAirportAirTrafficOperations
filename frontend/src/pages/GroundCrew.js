import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIAnalysis from '../components/AIAnalysis';

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

function GroundCrew({ token, api }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/crews`, { headers: { Authorization: `Bearer ${token}` } });
    setItems(await res.json());
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this crew?')) return;
    await fetch(`${api}/api/crews/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    if (editItem) {
      await fetch(`${api}/api/crews/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    } else {
      await fetch(`${api}/api/crews`, { method: 'POST', headers, body: JSON.stringify(data) });
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
      setAiData(await res.json());
    } catch (err) {
      setAiData({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString(), model: 'error' });
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
          </tbody>
        </table>
      </div>

      <AIAnalysis data={aiData} loading={aiLoading} />

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
