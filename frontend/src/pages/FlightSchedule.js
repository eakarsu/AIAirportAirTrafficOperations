import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'flight_number', label: 'Flight Number' },
  { key: 'airline', label: 'Airline' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'scheduled_time', label: 'Scheduled Time', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'flight_type', label: 'Type', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
  { key: 'aircraft_type', label: 'Aircraft' },
  { key: 'terminal', label: 'Terminal' },
  { key: 'gate', label: 'Gate' },
  { key: 'status', label: 'Status', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
];

const formFields = [
  { key: 'flight_number', label: 'Flight Number', required: true },
  { key: 'airline', label: 'Airline', required: true },
  { key: 'origin', label: 'Origin (IATA)', required: true },
  { key: 'destination', label: 'Destination (IATA)', required: true },
  { key: 'scheduled_time', label: 'Scheduled Time', type: 'datetime-local', required: true },
  { key: 'flight_type', label: 'Type', type: 'select', options: ['departure', 'arrival'], required: true },
  { key: 'aircraft_type', label: 'Aircraft Type', required: true },
  { key: 'terminal', label: 'Terminal', type: 'select', options: ['T1', 'T2', 'T3', 'T4'] },
  { key: 'gate', label: 'Gate' },
  { key: 'status', label: 'Status', type: 'select', options: ['on_time', 'delayed', 'boarding', 'departed', 'landed', 'cancelled', 'diverted'], defaultValue: 'on_time' },
];

function FlightSchedule({ token, api }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/flights`, { headers: { Authorization: `Bearer ${token}` } });
    setItems(await res.json());
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this flight?')) return;
    await fetch(`${api}/api/flights/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    if (editItem) {
      await fetch(`${api}/api/flights/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    } else {
      await fetch(`${api}/api/flights`, { method: 'POST', headers, body: JSON.stringify(data) });
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

  const filtered = filter === 'all' ? items : items.filter(i => i.flight_type === filter);

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-plane"></i> Flight Schedule Board</h1>
        <div className="header-actions">
          <div className="filter-tabs">
            {['all', 'departure', 'arrival'].map(f => (
              <button
                key={f}
                className={`btn-filter ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All Flights' : f === 'departure' ? 'Departures' : 'Arrivals'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Flight
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Airline</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Time</th>
              <th>Type</th>
              <th>Terminal</th>
              <th>Gate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td><strong>{item.flight_number}</strong></td>
                <td>{item.airline}</td>
                <td>{item.origin}</td>
                <td>{item.destination}</td>
                <td>{new Date(item.scheduled_time).toLocaleString()}</td>
                <td><span className={`status-badge status-${item.flight_type}`}>{item.flight_type}</span></td>
                <td>{item.terminal}</td>
                <td>{item.gate}</td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetailModal
          title={`Flight - ${selected.flight_number}`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Flight' : 'New Flight'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default FlightSchedule;
