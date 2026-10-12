import useNativeRecordMutation from '../components/useNativeRecordMutation';
import useNativeRecordList from '../components/useNativeRecordList';
import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'station_id', label: 'Station' },
  { key: 'report_type', label: 'Report Type', render: v => <span className={`status-badge status-${v?.toLowerCase()}`}>{v}</span> },
  { key: 'temperature_c', label: 'Temperature', render: v => v != null ? `${v}°C / ${(v * 9/5 + 32).toFixed(1)}°F` : 'N/A' },
  { key: 'wind_speed_knots', label: 'Wind Speed', render: v => v != null ? `${v} kts` : 'N/A' },
  { key: 'wind_direction', label: 'Wind Direction', render: v => v ? `${v}°` : 'N/A' },
  { key: 'visibility_miles', label: 'Visibility', render: v => v != null ? `${v} mi` : 'N/A' },
  { key: 'ceiling_feet', label: 'Ceiling', render: v => v != null ? `${v} ft` : 'N/A' },
  { key: 'conditions', label: 'Conditions', render: v => <span className={`status-badge status-${v?.toLowerCase()}`}>{v}</span> },
  { key: 'pressure_inhg', label: 'Pressure', render: v => v != null ? `${v} inHg` : 'N/A' },
  { key: 'humidity_percent', label: 'Humidity', render: v => v != null ? `${v}%` : 'N/A' },
  { key: 'notam', label: 'NOTAM' },
  { key: 'reported_at', label: 'Reported At', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
];

const formFields = [
  { key: 'station_id', label: 'Station ID (ICAO)', required: true },
  { key: 'report_type', label: 'Report Type', type: 'select', options: ['METAR', 'TAF', 'NOTAM', 'SIGMET', 'PIREP'], required: true },
  { key: 'temperature_c', label: 'Temperature (°C)', type: 'number' },
  { key: 'wind_speed_knots', label: 'Wind Speed (kts)', type: 'number', min: 0 },
  { key: 'wind_direction', label: 'Wind Direction (°)' },
  { key: 'visibility_miles', label: 'Visibility (miles)', type: 'number', min: 0 },
  { key: 'ceiling_feet', label: 'Ceiling (ft)', type: 'number', min: 0 },
  { key: 'conditions', label: 'Flight Conditions', type: 'select', options: ['VFR', 'MVFR', 'IFR', 'LIFR'] },
  { key: 'pressure_inhg', label: 'Pressure (inHg)', type: 'number' },
  { key: 'humidity_percent', label: 'Humidity (%)', type: 'number', min: 0, max: 100 },
  { key: 'notam', label: 'NOTAM / Notes', type: 'textarea' },
];

function WeatherDashboard({ token, api }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { loading: recordLoading, error: recordError, reload: fetchData } = useNativeRecordList({
    url: `${api}/api/weather?page=${page}&limit=20`, token,
    onLoad: data => { setItems(data.items); if (data.pagination) setPagination(data.pagination); },
  });

  useEffect(() => { fetchData(); }, [fetchData]);

  const recordWrite = useNativeRecordMutation({token,api,route:'weather',reload:fetchData,onSaved:()=>{setShowForm(false);setEditItem(null);},onDeleted:()=>setSelected(null)});

  const handleDelete = id => recordWrite.remove(id);
  const handleSave = data => recordWrite.save(data, editItem?.id);

  const handleEdit = (item) => {
    setSelected(null);
    setEditItem(item);
    setShowForm(true);
  };

  // Use items for display but fetch all METARs from first page for the summary card
  const latestMetar = items.find(i => i.record_kind === 'actual_source' && i.report_type === 'METAR');
  const notams = items.filter(i => i.record_kind === 'actual_source' && i.report_type === 'NOTAM');

  return (
    <div>
      {recordWrite.error && <div role="alert" className="ai-error">{recordWrite.error}</div>}
      <p className="planning-record-notice">Saved planning drafts are proposals. They do not establish flights, clearances, gate assignments, crew authorization, baggage custody, weather observations, predictions, incident occurrence or completed maintenance.</p>
      <div className="page-header">
        <h1><i className="fas fa-cloud-sun"></i> Weather & NOTAMs</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Report
          </button>
        </div>
      </div>

      {latestMetar && (
        <div className="weather-summary">
          <div className="weather-card">
            <div className="weather-icon"><i className="fas fa-thermometer-half"></i></div>
            <div className="weather-value">{latestMetar.temperature_c}°C</div>
            <div className="weather-label">Temperature</div>
          </div>
          <div className="weather-card">
            <div className="weather-icon"><i className="fas fa-wind"></i></div>
            <div className="weather-value">{latestMetar.wind_speed_knots} kts</div>
            <div className="weather-label">Wind {latestMetar.wind_direction}°</div>
          </div>
          <div className="weather-card">
            <div className="weather-icon"><i className="fas fa-eye"></i></div>
            <div className="weather-value">{latestMetar.visibility_miles} mi</div>
            <div className="weather-label">Visibility</div>
          </div>
          <div className="weather-card">
            <div className="weather-icon"><i className="fas fa-cloud"></i></div>
            <div className="weather-value">{latestMetar.ceiling_feet ? `${latestMetar.ceiling_feet} ft` : 'CLR'}</div>
            <div className="weather-label">Ceiling</div>
          </div>
          <div className="weather-card">
            <div className="weather-icon"><i className="fas fa-tachometer-alt"></i></div>
            <div className="weather-value">{latestMetar.pressure_inhg}</div>
            <div className="weather-label">Pressure (inHg)</div>
          </div>
          <div className="weather-card">
            <div className="weather-icon"><i className="fas fa-plane-circle-check"></i></div>
            <div className={`weather-value conditions-${latestMetar.conditions?.toLowerCase()}`}>{latestMetar.conditions}</div>
            <div className="weather-label">Flight Rules</div>
          </div>
        </div>
      )}

      {notams.length > 0 && (
        <div className="notam-section">
          <h3><i className="fas fa-exclamation-triangle"></i> Active NOTAMs</h3>
          {notams.map(n => (
            <div key={n.id} className="notam-item" onClick={() => setSelected(n)}>
              <span className="notam-station">{n.station_id}</span>
              <span className="notam-text">{n.notam}</span>
              <span className="notam-time">{new Date(n.reported_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {recordLoading && (
        <div className="ai-loading" style={{ margin: '20px 0' }}><div className="spinner"></div><span>Loading...</span></div>
      )}

      <div className="data-table-container" style={{ marginTop: '20px' }}>
        {recordError && <div role="alert" className="ai-error">Could not load records: {recordError} <button type="button" className="btn-cancel" onClick={fetchData}>Retry loading records</button></div>}
        <table className="data-table">
          <thead>
            <tr><th>Record classification</th>
              <th>Station</th>
              <th>Type</th>
              <th>Temp</th>
              <th>Wind</th>
              <th>Visibility</th>
              <th>Ceiling</th>
              <th>Conditions</th>
              <th>Reported</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                  <td><small>{item.record_kind === 'planning_draft' ? 'Planning draft — no operational evidence' : 'Recorded source'}</small></td>
                <td><strong>{item.station_id}</strong></td>
                <td><span className={`status-badge status-${item.report_type?.toLowerCase()}`}>{item.report_type}</span></td>
                <td>{item.temperature_c != null ? `${item.temperature_c}°C` : '-'}</td>
                <td>{item.wind_speed_knots != null ? `${item.wind_speed_knots} kts ${item.wind_direction || ''}°` : '-'}</td>
                <td>{item.visibility_miles != null ? `${item.visibility_miles} mi` : '-'}</td>
                <td>{item.ceiling_feet != null ? `${item.ceiling_feet} ft` : '-'}</td>
                <td>{item.conditions ? <span className={`status-badge status-${item.conditions.toLowerCase()}`}>{item.conditions}</span> : '-'}</td>
                <td>{item.reported_at ? new Date(item.reported_at).toLocaleString() : 'Not observed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          title={`Weather Report - ${selected.station_id} ${selected.report_type}`}
          item={selected}
          fields={detailFields}
          onClose={() => {recordWrite.cancel();setSelected(null);}}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Weather Report' : 'New Weather Report'}
          fields={formFields}
          initialData={editItem}
          onClose={() => {recordWrite.cancel();setShowForm(false);setEditItem(null);}}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default WeatherDashboard;
