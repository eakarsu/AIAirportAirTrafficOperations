import NativeAIContext from '../components/NativeAIContext';
import AIReport from '../components/AIReport';
import useNativeAIRequest from '../components/useNativeAIRequest';
import useNativeRecordMutation from '../components/useNativeRecordMutation';
import useNativeRecordList from '../components/useNativeRecordList';
import React, { useState, useEffect, useCallback } from 'react';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'flight_number', label: 'Flight Number' },
  { key: 'airline', label: 'Airline' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'scheduled_departure', label: 'Scheduled Departure', render: v => v ? new Date(v).toLocaleString() : 'N/A' },
  { key: 'predicted_delay_min', label: 'Predicted Delay', render: v => `${v} minutes` },
  { key: 'delay_reason', label: 'Delay Reason' },
  { key: 'confidence_score', label: 'Confidence', render: v => v == null ? 'Not measured' : `${(v * 100).toFixed(0)}%` },
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
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { loading: recordLoading, error: recordError, reload: fetchData } = useNativeRecordList({
    url: `${api}/api/delays?page=${page}&limit=20`, token,
    onLoad: data => { setItems(data.items); if (data.pagination) setPagination(data.pagination); },
  });

  useEffect(() => { fetchData(); }, [fetchData]);

  const recordWrite = useNativeRecordMutation({token,api,route:'delays',reload:fetchData,onSaved:()=>{setShowForm(false);setEditItem(null);},onDeleted:()=>setSelected(null)});

  const handleDelete = id => recordWrite.remove(id);
  const handleSave = data => recordWrite.save(data, editItem?.id);

  const handleEdit = (item) => {
    setSelected(null);
    setEditItem({ ...item, rebooking_suggested: String(item.rebooking_suggested) });
    setShowForm(true);
  };

  const [planningContext,setPlanningContext]=useState('');
  const aiRequest = useNativeAIRequest(() => setAiLoading(false));

  const runAI = async () => {
    const aiOwner = aiRequest.begin(); if (!aiOwner) return;
    try {
    setAiLoading(true);setAiError('');
    setAiData(null);
    try {
      const res = await aiRequest.fetch(aiOwner,`${api}/api/ai/predict-delays`, { method: 'POST', headers,
        body: JSON.stringify({planning_context:planningContext}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI analysis failed');
      setAiData(data);
    } catch (err) {
      if (!aiRequest.isCurrent(aiOwner)) return;
      setAiData(null);setAiError(err.message);
    }
    if (aiRequest.isCurrent(aiOwner)) setAiLoading(false);
    } finally { if (aiRequest.isCurrent(aiOwner)) { setAiLoading(false); aiRequest.finish(aiOwner); } }
  };

  const getDelayColor = (min) => {
    if (min === 0) return '#22c55e';
    if (min <= 30) return '#facc15';
    if (min <= 90) return '#fb923c';
    return '#ef4444';
  };

  const cascadeColor = (s) => {
    const m = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
    return m[(s || '').toLowerCase()] || '#94a3b8';
  };

  return (
    <div>
      <NativeAIContext title="DelayPrediction" value={planningContext} onChange={setPlanningContext} disabled={aiLoading}/>
      {recordWrite.error && <div role="alert" className="ai-error">{recordWrite.error}</div>}
      <p className="planning-record-notice">Saved planning drafts are proposals. They do not establish flights, clearances, gate assignments, crew authorization, baggage custody, weather observations, predictions, incident occurrence or completed maintenance.</p>
      {aiError && <div role="alert" className="ai-error">{aiError}</div>}
      {aiRequest.notice && <p role="status">{aiRequest.notice}</p>}<button type="button" className="btn-cancel" onClick={aiRequest.cancel}>Cancel AI request</button>
      <div className="page-header">
        <h1><i className="fas fa-clock"></i> Delay Prediction & Rebooking</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <i className="fas fa-plus"></i> New Prediction
          </button>
          <button className="btn-ai" onClick={runAI} disabled={aiLoading}>
            <i className="fas fa-robot"></i> {aiLoading ? 'Analyzing...' : 'Generate with OpenRouter'}
          </button>
        </div>
      </div>

      {recordLoading ? (
        <div className="ai-loading"><div className="spinner"></div><span>Loading...</span></div>
      ) : (
        <div className="data-table-container">
          {recordError && <div role="alert" className="ai-error">Could not load records: {recordError} <button type="button" className="btn-cancel" onClick={fetchData}>Retry loading records</button></div>}
          <table className="data-table">
            <thead>
              <tr><th>Record classification</th>
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
                  <td><small>{item.record_kind === 'planning_draft' ? 'Planning draft — no operational evidence' : 'Recorded source'}</small></td>
                  <td><strong>{item.flight_number}</strong></td>
                  <td>{item.airline}</td>
                  <td>{item.origin} → {item.destination}</td>
                  <td>{new Date(item.scheduled_departure).toLocaleString()}</td>
                  <td><strong style={{ color: getDelayColor(item.predicted_delay_min) }}>{item.predicted_delay_min == null ? 'Not predicted' : item.predicted_delay_min + ' min'}</strong></td>
                  <td>{item.delay_reason}</td>
                  <td>{item.confidence_score == null ? 'Not measured' : (item.confidence_score * 100).toFixed(0) + '%'}</td>
                  <td>{item.rebooking_suggested ? <span style={{ color: '#ef4444' }}>Yes</span> : <span style={{ color: '#22c55e' }}>No</span>}</td>
                  <td>{item.affected_passengers}</td>
                </tr>
              ))}
              {!recordError && items.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No delay predictions found.</td></tr>
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

      {aiLoading && (
        <div className="ai-analysis-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is analyzing delays...</span></div>
        </div>
      )}

      {aiData && !aiLoading && (
        <div style={{ marginTop: 24 }}>
          {aiData.cascade_risk_score !== undefined && (
            <div style={{ padding: 24, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Cascade Risk Score</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: aiData.cascade_risk_score > 70 ? '#ef4444' : aiData.cascade_risk_score > 40 ? '#f59e0b' : '#22c55e' }}>
                {aiData.cascade_risk_score}
              </div>
              {aiData.total_affected_passengers != null && (
                <div style={{ color: '#94a3b8', marginTop: 8 }}>
                  Total affected passengers: <strong style={{ color: '#f59e0b' }}>{aiData.total_affected_passengers?.toLocaleString()}</strong>
                </div>
              )}
              {aiData.estimated_revenue_impact_usd != null && (
                <div style={{ color: '#94a3b8', marginTop: 4 }}>
                  Revenue impact: <strong style={{ color: '#ef4444' }}>${aiData.estimated_revenue_impact_usd?.toLocaleString()}</strong>
                </div>
              )}
            </div>
          )}

          {Array.isArray(aiData.high_risk_flights) && aiData.high_risk_flights.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i> High-Risk Flights</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Flight</th><th>Airline</th><th>Delay (min)</th><th>Cascade Risk</th><th>Connections Affected</th></tr>
                </thead>
                <tbody>
                  {aiData.high_risk_flights.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{f.flight_number}</strong></td>
                      <td>{f.airline}</td>
                      <td style={{ color: getDelayColor(f.delay_minutes) }}>{f.delay_minutes}</td>
                      <td><span className="status-badge" style={{ background: cascadeColor(f.cascade_risk), color: '#fff' }}>{f.cascade_risk}</span></td>
                      <td>{f.affected_connections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.rebooking_priorities) && aiData.rebooking_priorities.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-exchange-alt" style={{ color: '#38bdf8' }}></i> Rebooking Priorities</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Flight</th><th>Urgency</th><th>Reason</th><th>Suggested Action</th></tr>
                </thead>
                <tbody>
                  {aiData.rebooking_priorities.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.flight_number}</strong></td>
                      <td><span className="status-badge" style={{ background: cascadeColor(r.urgency), color: '#fff' }}>{r.urgency}</span></td>
                      <td style={{ fontSize: 13 }}>{r.reason}</td>
                      <td style={{ fontSize: 13 }}>{r.suggested_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(aiData.passenger_communication_templates) && aiData.passenger_communication_templates.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 8px' }}><i className="fas fa-comments"></i> Passenger Communication Templates</h4>
              {aiData.passenger_communication_templates.map((t, i) => (
                <div key={i} style={{ marginBottom: 10, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{t.scenario}</div>
                  <div style={{ color: '#cbd5e1', fontSize: 13 }}>{t.message}</div>
                </div>
              ))}
            </div>
          )}

          {Array.isArray(aiData.resource_reallocation) && aiData.resource_reallocation.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px' }}><i className="fas fa-people-arrows"></i> Resource Reallocation</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                {aiData.resource_reallocation.map((r, i) => (
                  <li key={i} style={{ marginBottom: 4 }}><strong style={{ color: '#e2e8f0' }}>{r.resource}</strong>: {r.action} — {r.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {aiData.summary && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', color: '#cbd5e1', fontSize: 14 }}>
              {aiData.summary}
            </div>
          )}

          {aiData && (
            <div className="ai-analysis-container">
              <AIReport response={aiData} title="Advisory planning report" />
            </div>
          )}
        </div>
      )}

      {selected && (
        <DetailModal
          title={`Delay - ${selected.flight_number}`}
          item={selected}
          fields={detailFields}
          onClose={() => {recordWrite.cancel();setSelected(null);}}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editItem ? 'Edit Delay Prediction' : 'New Delay Prediction'}
          fields={formFields}
          initialData={editItem}
          onClose={() => {recordWrite.cancel();setShowForm(false);setEditItem(null);}}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default DelayPrediction;
