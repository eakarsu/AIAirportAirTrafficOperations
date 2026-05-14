import React, { useState, useEffect, useCallback } from 'react';

const ANALYSIS_LABELS = {
  'optimize-gates': 'Gate Optimization',
  'optimize-crews': 'Crew Optimization',
  'predict-delays': 'Delay Prediction',
  'optimize-baggage': 'Baggage Optimization',
  'optimize-runways': 'Runway Optimization',
  'gate-conflicts': 'Gate Conflict Predictor',
  'connection-analysis': 'Connection Analysis',
  'weather-routing': 'Weather Routing',
  'crew-cross-training': 'Crew Cross-Training',
  'cost-optimization': 'Cost Optimization',
  'incident-prediction': 'Incident Prediction',
  'baggage-reconciliation': 'Baggage Reconciliation',
  'sustainability-report': 'Sustainability Report',
  'shift-handover': 'Shift Handover Report',
  'predictive-maintenance': 'Predictive Maintenance',
  'notam-briefing': 'NOTAM Briefing',
  'runway-simulator': 'Runway Capacity Simulator',
  'traffic-forecast': 'Traffic Volume Forecast',
  'emergency-response': 'Emergency Response',
};

const ALL_TYPES = Object.entries(ANALYSIS_LABELS).map(([value, label]) => ({ value, label }));

function AIHistory({ token, api }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const typeParam = typeFilter ? `&type=${encodeURIComponent(typeFilter)}` : '';
      const res = await fetch(`${api}/api/ai/history?page=${page}&limit=20${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load history');
      setItems(data.data || []);
      setPagination(data.pagination || { page: 1, total_pages: 1, total: 0, limit: 20 });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [api, token, page, typeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [typeFilter]);

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-history"></i> AI Analysis History</h1>
        <div className="header-actions">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}
          >
            <option value="">All Types</option>
            {ALL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        Past AI analyses run by you, with full input context and model output.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><span>Loading...</span></div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Input Summary</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} onClick={() => setSelected(it)} style={{ cursor: 'pointer' }}>
                    <td><strong>{ANALYSIS_LABELS[it.analysis_type] || it.analysis_type}</strong></td>
                    <td>{new Date(it.created_at).toLocaleString()}</td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>
                      {typeof it.input_data === 'string' ? it.input_data : JSON.stringify(it.input_data)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No analyses yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.total_pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
              <button
                className="btn-cancel"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="fas fa-chevron-left"></i> Prev
              </button>
              <span style={{ color: '#94a3b8' }}>Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)</span>
              <button
                className="btn-cancel"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2><i className="fas fa-robot"></i> {ANALYSIS_LABELS[selected.analysis_type] || selected.analysis_type}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
                {new Date(selected.created_at).toLocaleString()}
              </div>
              <h4 style={{ color: '#fff', marginTop: 0 }}>Input</h4>
              <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', fontSize: 12 }}>
                {JSON.stringify(selected.input_data, null, 2)}
              </pre>
              <h4 style={{ color: '#fff' }}>Result</h4>
              <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {typeof selected.result === 'string'
                  ? selected.result
                  : JSON.stringify(selected.result, null, 2)}
              </pre>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIHistory;
