import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'incident_type', label: 'Type' },
  { key: 'severity', label: 'Severity', render: v => <span className={`status-badge severity-${v}`}>{v}</span> },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description' },
  { key: 'reported_by', label: 'Reported By' },
  { key: 'flight_number', label: 'Flight Number', render: v => v || 'N/A' },
  { key: 'status', label: 'Status', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
  { key: 'resolution', label: 'Resolution', render: v => v || 'Pending' },
  { key: 'reported_at', label: 'Reported At', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
];

const formFields = [
  { key: 'incident_type', label: 'Incident Type', type: 'select', options: ['Bird Strike', 'Ground Collision', 'FOD', 'Security Breach', 'Medical Emergency', 'Fuel Spill', 'Runway Incursion', 'Equipment Failure', 'Weather Diversion', 'Laser Strike', 'Baggage Mishandled', 'ATC Communication', 'Fire/Smoke', 'Other'], required: true },
  { key: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'], required: true },
  { key: 'location', label: 'Location', required: true },
  { key: 'description', label: 'Description', type: 'textarea', required: true },
  { key: 'reported_by', label: 'Reported By', required: true },
  { key: 'flight_number', label: 'Related Flight (optional)' },
  { key: 'status', label: 'Status', type: 'select', options: ['open', 'investigating', 'resolved', 'closed'], defaultValue: 'open' },
  { key: 'resolution', label: 'Resolution Notes', type: 'textarea' },
];

function IncidentReports({ token, api }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } });
    setItems(await res.json());
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this incident report?')) return;
    await fetch(`${api}/api/incidents/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    if (editItem) {
      await fetch(`${api}/api/incidents/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    } else {
      await fetch(`${api}/api/incidents`, { method: 'POST', headers, body: JSON.stringify(data) });
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

  const openCount = items.filter(i => i.status === 'open' || i.status === 'investigating').length;
  const criticalCount = items.filter(i => i.severity === 'critical' || i.severity === 'high').length;

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-exclamation-triangle"></i> Incident Reports</h1>
        <div className="header-actions">
          {openCount > 0 && (
            <span className="incident-counter open"><i className="fas fa-circle"></i> {openCount} Open</span>
          )}
          {criticalCount > 0 && (
            <span className="incident-counter critical"><i className="fas fa-circle"></i> {criticalCount} High/Critical</span>
          )}
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> Report Incident
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Severity</th>
              <th>Location</th>
              <th>Reported By</th>
              <th>Flight</th>
              <th>Status</th>
              <th>Reported</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td><strong>{item.incident_type}</strong></td>
                <td><span className={`status-badge severity-${item.severity}`}>{item.severity}</span></td>
                <td>{item.location}</td>
                <td>{item.reported_by}</td>
                <td>{item.flight_number || '-'}</td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                <td>{new Date(item.reported_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetailModal
          title={`Incident - ${selected.incident_type}`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Incident Report' : 'New Incident Report'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default IncidentReports;
