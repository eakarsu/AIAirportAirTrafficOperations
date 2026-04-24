import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIAnalysis from '../components/AIAnalysis';

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
    const res = await fetch(`${api}/api/baggage`, { headers: { Authorization: `Bearer ${token}` } });
    setItems(await res.json());
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
      setAiData(await res.json());
    } catch (err) {
      setAiData({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString(), model: 'error' });
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

      <AIAnalysis data={aiData} loading={aiLoading} />

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
