import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIAnalysis from '../components/AIAnalysis';

const detailFields = [
  { key: 'flight_number', label: 'Flight Number' },
  { key: 'airline', label: 'Airline' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'scheduled_departure', label: 'Scheduled Departure', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'predicted_delay_min', label: 'Predicted Delay', render: v => `${v} minutes` },
  { key: 'delay_reason', label: 'Delay Reason' },
  { key: 'confidence_score', label: 'Confidence', render: v => `${(v * 100).toFixed(0)}%` },
  { key: 'rebooking_suggested', label: 'Rebooking Suggested', render: v => v ? 'Yes' : 'No' },
  { key: 'affected_passengers', label: 'Affected Passengers' },
];

const formFields = [
  { key: 'flight_number', label: 'Flight Number', required: true },
  { key: 'airline', label: 'Airline', required: true },
  { key: 'origin', label: 'Origin (IATA)', required: true },
  { key: 'destination', label: 'Destination (IATA)', required: true },
  { key: 'scheduled_departure', label: 'Scheduled Departure', type: 'datetime-local', required: true },
  { key: 'predicted_delay_min', label: 'Predicted Delay (min)', type: 'number', min: 0, defaultValue: 0 },
  { key: 'delay_reason', label: 'Delay Reason', required: true },
  { key: 'confidence_score', label: 'Confidence Score', type: 'number', step: 0.01, min: 0, max: 1, defaultValue: 0.85 },
  { key: 'rebooking_suggested', label: 'Rebooking', type: 'select', options: ['true', 'false'], defaultValue: 'false' },
  { key: 'affected_passengers', label: 'Affected Passengers', type: 'number', min: 0, defaultValue: 0 },
];

function DelayPrediction({ token, api }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/delays`, { headers: { Authorization: `Bearer ${token}` } });
    setItems(await res.json());
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this delay prediction?')) return;
    await fetch(`${api}/api/delays/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    const payload = { ...data, rebooking_suggested: data.rebooking_suggested === 'true' || data.rebooking_suggested === true };
    if (editItem) {
      await fetch(`${api}/api/delays/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
    } else {
      await fetch(`${api}/api/delays`, { method: 'POST', headers, body: JSON.stringify(payload) });
    }
    setShowForm(false);
    setEditItem(null);
    fetchData();
  };

  const handleEdit = (item) => {
    setSelected(null);
    setEditItem({ ...item, rebooking_suggested: String(item.rebooking_suggested) });
    setShowForm(true);
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiData(null);
    try {
      const res = await fetch(`${api}/api/ai/predict-delays`, { method: 'POST', headers });
      setAiData(await res.json());
    } catch (err) {
      setAiData({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString(), model: 'error' });
    }
    setAiLoading(false);
  };

  const getDelayColor = (min) => {
    if (min === 0) return '#22c55e';
    if (min <= 30) return '#facc15';
    if (min <= 90) return '#fb923c';
    return '#ef4444';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-clock"></i> Delay Prediction & Rebooking</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Prediction
          </button>
          <button className="btn-ai" onClick={runAI} disabled={aiLoading}>
            <i className="fas fa-robot"></i> AI Predict
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Airline</th>
              <th>Route</th>
              <th>Departure</th>
              <th>Delay</th>
              <th>Reason</th>
              <th>Confidence</th>
              <th>Rebook</th>
              <th>Passengers</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td><strong>{item.flight_number}</strong></td>
                <td>{item.airline}</td>
                <td>{item.origin} → {item.destination}</td>
                <td>{new Date(item.scheduled_departure).toLocaleString()}</td>
                <td><strong style={{ color: getDelayColor(item.predicted_delay_min) }}>{item.predicted_delay_min} min</strong></td>
                <td>{item.delay_reason}</td>
                <td>{(item.confidence_score * 100).toFixed(0)}%</td>
                <td>{item.rebooking_suggested ? <span style={{ color: '#ef4444' }}>Yes</span> : <span style={{ color: '#22c55e' }}>No</span>}</td>
                <td>{item.affected_passengers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIAnalysis data={aiData} loading={aiLoading} />

      {selected && (
        <DetailModal
          title={`Delay - ${selected.flight_number}`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Delay Prediction' : 'New Delay Prediction'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default DelayPrediction;
