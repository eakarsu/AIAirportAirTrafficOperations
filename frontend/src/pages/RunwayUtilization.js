import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIAnalysis from '../components/AIAnalysis';

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
    const res = await fetch(`${api}/api/runways`, { headers: { Authorization: `Bearer ${token}` } });
    setItems(await res.json());
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
      setAiData(await res.json());
    } catch (err) {
      setAiData({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString(), model: 'error' });
    }
    setAiLoading(false);
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

      <AIAnalysis data={aiData} loading={aiLoading} />

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
