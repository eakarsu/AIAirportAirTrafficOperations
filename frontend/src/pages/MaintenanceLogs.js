import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'equipment_type', label: 'Equipment Type' },
  { key: 'equipment_id', label: 'Equipment ID' },
  { key: 'maintenance_type', label: 'Maintenance Type', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
  { key: 'description', label: 'Description' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'scheduled_date', label: 'Scheduled Date', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'priority', label: 'Priority', render: v => <span className={`status-badge severity-${v}`}>{v}</span> },
  { key: 'status', label: 'Status', render: v => <span className={`status-badge status-${v}`}>{v}</span> },
  { key: 'location', label: 'Location' },
];

const formFields = [
  { key: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['Runway Lights', 'Baggage Carousel', 'Jet Bridge', 'HVAC System', 'Radar System', 'Ground Power Unit', 'Taxiway Signs', 'Fire Truck', 'ILS System', 'Elevator', 'De-icing Truck', 'Security Scanner', 'Other'], required: true },
  { key: 'equipment_id', label: 'Equipment ID', required: true },
  { key: 'maintenance_type', label: 'Maintenance Type', type: 'select', options: ['routine', 'repair', 'inspection', 'emergency', 'upgrade'], required: true },
  { key: 'description', label: 'Description', type: 'textarea', required: true },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'scheduled_date', label: 'Scheduled Date', type: 'datetime-local', required: true },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'], defaultValue: 'medium' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'], defaultValue: 'pending' },
  { key: 'location', label: 'Location' },
];

function MaintenanceLogs({ token, api }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    const res = await fetch(`${api}/api/maintenance?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : (data.data || []));
  }, [api, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance record?')) return;
    await fetch(`${api}/api/maintenance/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    if (editItem) {
      await fetch(`${api}/api/maintenance/${editItem.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    } else {
      await fetch(`${api}/api/maintenance`, { method: 'POST', headers, body: JSON.stringify(data) });
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

  const exportCSV = () => {
    const hdrs = ['Equipment Type', 'Equipment ID', 'Maintenance Type', 'Description', 'Assigned To', 'Scheduled Date', 'Priority', 'Status', 'Location'];
    const rows = items.map(i => [
      i.equipment_type, i.equipment_id, i.maintenance_type,
      (i.description || '').replace(/\n/g, ' '), i.assigned_to || '',
      new Date(i.scheduled_date).toLocaleString(), i.priority, i.status, i.location || '',
    ]);
    const csv = [hdrs, ...rows].map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `maintenance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-wrench"></i> Maintenance Logs</h1>
        <div className="header-actions">
          <button className="btn-cancel" onClick={exportCSV} style={{ fontSize: 13 }}>
            <i className="fas fa-download"></i> Export CSV
          </button>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Work Order
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipment</th>
              <th>ID</th>
              <th>Type</th>
              <th>Assigned To</th>
              <th>Scheduled</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td><strong>{item.equipment_type}</strong></td>
                <td>{item.equipment_id}</td>
                <td><span className={`status-badge status-${item.maintenance_type}`}>{item.maintenance_type}</span></td>
                <td>{item.assigned_to || '-'}</td>
                <td>{new Date(item.scheduled_date).toLocaleString()}</td>
                <td><span className={`status-badge severity-${item.priority}`}>{item.priority}</span></td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                <td>{item.location || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetailModal
          title={`Maintenance - ${selected.equipment_type} (${selected.equipment_id})`}
          item={selected}
          fields={detailFields}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Work Order' : 'New Work Order'}
          fields={formFields}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default MaintenanceLogs;
