import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIAnalysis from '../components/AIAnalysis';

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
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/gates`, { headers: { Authorization: `Bearer ${token}` } });
    setItems(await res.json());
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gate assignment?')) return;
    await fetch(`${api}/api/gates/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    if (editItem) {
      await fetch(`${api}/api/gates/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    } else {
      await fetch(`${api}/api/gates`, { method: 'POST', headers, body: JSON.stringify(data) });
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
      setAiData({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString(), model: 'error' });
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
            <i className="fas fa-robot"></i> AI Optimize
          </button>
        </div>
      </div>

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
          </tbody>
        </table>
      </div>

      <AIAnalysis data={aiData} loading={aiLoading} />

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
