import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : '';
      const res = await fetch(`${api}/api/flights?page=${page}&limit=20${typeParam}`, { headers: { Authorization: `Bearer ${token}` } });
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
  }, [api, token, page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [filter]);

  // 30-second auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  const exportCSV = () => {
    const headers = ['Flight', 'Airline', 'Origin', 'Destination', 'Scheduled Time', 'Type', 'Terminal', 'Gate', 'Status'];
    const rows = items.map(item => [
      item.flight_number, item.airline, item.origin, item.destination,
      new Date(item.scheduled_time).toLocaleString(), item.flight_type, item.terminal, item.gate, item.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `flights-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this flight?')) return;
    await fetch(`${api}/api/flights/${id}`, { method: 'DELETE', headers });
    setSelected(null);
    fetchData();
  };

  const handleSave = async (data) => {
    const url = editItem ? `${api}/api/flights/${editItem.id}` : `${api}/api/flights`;
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
          <button className="btn-cancel" onClick={exportCSV} style={{ fontSize: 13 }}>
            <i className="fas fa-download"></i> Export CSV
          </button>
          <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
            <i className="fas fa-sync-alt"></i> Refresh in {countdown}s
          </span>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Flight
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
              {items.map(item => (
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
              {items.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No flights found.</td></tr>
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
