import React, { useState } from 'react';

const INCIDENT_TYPES = [
  'Aircraft Crash', 'Aircraft Fire', 'Runway Incursion', 'Security Threat', 'Bomb Threat',
  'Medical Emergency', 'Fuel Spill', 'Structural Failure', 'Electrical Failure', 'Cyber Attack',
  'Mass Casualty', 'Hazmat Incident', 'Active Shooter', 'Bird Strike', 'Other',
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function EmergencyResponse({ token, api }) {
  const [form, setForm] = useState({ incident_type: '', severity: 'high', location: '', description: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!form.incident_type || !form.location) {
      setError('Incident type and location are required.');
      return;
    }
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`${api}/api/ai/emergency-response`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const threatColor = (t) => {
    const m = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444', extreme: '#dc2626' };
    return m[(t || '').toLowerCase()] || '#94a3b8';
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-ambulance"></i> Emergency Response Coordinator</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 20 }}>
        AI-powered emergency response planning with immediate action checklists, agency notifications, and resource deployment guidance.
        <strong style={{ color: '#ef4444' }}> For training and simulation purposes only.</strong>
      </p>

      {/* Incident Input Form */}
      <div style={{ padding: 24, borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', color: '#ef4444' }}><i className="fas fa-exclamation-triangle"></i> Incident Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Incident Type *</label>
            <select
              value={form.incident_type}
              onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}
            >
              <option value="">-- Select Type --</option>
              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Severity *</label>
            <select
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}
            >
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Location *</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Runway 04L, Terminal 2, Gate B12"
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '10px 12px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Additional details about the incident..."
              rows={2}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '10px 12px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-ai" onClick={run} disabled={loading} style={{ background: '#ef4444' }}>
            <i className="fas fa-robot"></i> {loading ? 'Generating Response Plan...' : 'Generate Emergency Response Plan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}
      {loading && (
        <div className="ai-loading"><div className="spinner"></div><span>AI is generating emergency response plan...</span></div>
      )}

      {data && !loading && (
        <div>
          {/* Threat Level + Classification Banner */}
          <div style={{ padding: 24, borderRadius: 12, background: `${threatColor(data.threat_level)}12`, border: `1px solid ${threatColor(data.threat_level)}50`, marginBottom: 20, textAlign: 'center' }}>
            {data.incident_classification && (
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Incident Classification</div>
            )}
            {data.incident_classification && (
              <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>{data.incident_classification}</div>
            )}
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Threat Level</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: threatColor(data.threat_level) }}>{(data.threat_level || '').toUpperCase()}</div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              {data.estimated_resolution_minutes != null && (
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Est. resolution: <strong style={{ color: '#e2e8f0' }}>{data.estimated_resolution_minutes} min</strong></span>
              )}
              {data.escalation_required != null && (
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Escalation required: <strong style={{ color: data.escalation_required ? '#ef4444' : '#22c55e' }}>{data.escalation_required ? 'YES' : 'NO'}</strong></span>
              )}
            </div>
          </div>

          {/* Immediate Actions */}
          {Array.isArray(data.immediate_actions) && data.immediate_actions.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16 }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 12px' }}><i className="fas fa-bolt"></i> Immediate Actions</h4>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 14 }}>
                {data.immediate_actions.map((a, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{a}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Triage Checklist */}
          {Array.isArray(data.triage_checklist) && data.triage_checklist.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16 }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 12px' }}><i className="fas fa-clipboard-check"></i> Triage Checklist</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 14 }}>
                {data.triage_checklist.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Agency Notifications */}
          {Array.isArray(data.agency_notifications) && data.agency_notifications.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-phone" style={{ color: '#38bdf8' }}></i> Agency Notifications</h3>
              <table className="data-table">
                <thead><tr><th>Agency</th><th>Priority</th><th>Contact Method</th><th>Message</th></tr></thead>
                <tbody>
                  {data.agency_notifications.map((n, i) => (
                    <tr key={i}>
                      <td><strong>{n.agency}</strong></td>
                      <td><span className="status-badge" style={{ background: threatColor(n.priority) + '30', color: threatColor(n.priority) }}>{n.priority}</span></td>
                      <td>{n.contact_method}</td>
                      <td style={{ fontSize: 13 }}>{n.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Resource Deployment */}
          {Array.isArray(data.resource_deployment) && data.resource_deployment.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#fff' }}><i className="fas fa-truck" style={{ color: '#f97316' }}></i> Resource Deployment</h3>
              <table className="data-table">
                <thead><tr><th>Resource</th><th>Quantity</th><th>Deploy To</th><th>ETA</th></tr></thead>
                <tbody>
                  {data.resource_deployment.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.resource}</strong></td>
                      <td>{r.quantity}</td>
                      <td>{r.deploy_to}</td>
                      <td style={{ color: '#38bdf8' }}>{r.eta_minutes ? `${r.eta_minutes} min` : r.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Area Restrictions */}
          {Array.isArray(data.area_restrictions) && data.area_restrictions.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 8px' }}><i className="fas fa-ban"></i> Area Restrictions</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#fca5a5', fontSize: 14 }}>
                {data.area_restrictions.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Passenger Communication */}
          {data.passenger_communication && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 16 }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 8px' }}><i className="fas fa-bullhorn"></i> Passenger Communication</h4>
              <div style={{ color: '#cbd5e1', fontSize: 14 }}>{data.passenger_communication}</div>
            </div>
          )}

          {/* Post-incident Actions */}
          {Array.isArray(data.post_incident_actions) && data.post_incident_actions.length > 0 && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', marginBottom: 16 }}>
              <h4 style={{ color: '#94a3b8', margin: '0 0 8px' }}><i className="fas fa-tasks"></i> Post-Incident Actions</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 14 }}>
                {data.post_incident_actions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
              </ul>
            </div>
          )}

          {data.summary && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', color: '#cbd5e1', fontSize: 14 }}>
              {data.summary}
            </div>
          )}

          {data.raw_response && (
            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 13 }}>{data.raw_response}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default EmergencyResponse;
