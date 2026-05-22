import React, { useEffect, useState } from 'react';

function FlightScheduleEditor({ token, api }) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(null);
  const [savedFlash, setSavedFlash] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${api}/api/custom-views/schedule-editor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) setErr(j.error || 'Failed');
      else { setFlights(j.flights || []); setErr(null); }
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [api, token]);

  const updateField = (id, field, value) => {
    setFlights(fl => fl.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const save = async (id) => {
    const f = flights.find(x => x.id === id);
    if (!f) return;
    setSaving(id);
    try {
      const r = await fetch(`${api}/api/custom-views/schedule-editor/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_time: f.scheduled_time,
          gate: f.gate,
          terminal: f.terminal,
          status: f.status,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setSavedFlash(id);
      setTimeout(() => setSavedFlash(null), 1500);
    } catch (e) { alert(e.message); }
    setSaving(null);
  };

  return (
    <div data-testid="cv-schedule-editor" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-edit" style={{ color: '#a78bfa', marginRight: 8 }}></i>
          Flight Schedule Editor (Inline)
        </h3>
        <button className="btn-cancel" onClick={load} disabled={loading} style={{ fontSize: 12 }}>
          <i className="fas fa-sync"></i> Reload
        </button>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><span>Loading flights...</span></div>
      ) : err ? (
        <div style={{ color: '#fca5a5' }}>Error: {err}</div>
      ) : (
        <div style={{ maxHeight: 380, overflow: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, color: '#e2e8f0', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
                <th style={{ padding: 6, textAlign: 'left' }}>Flight</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Route</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Scheduled</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Terminal</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Gate</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 6 }}></th>
              </tr>
            </thead>
            <tbody>
              {flights.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #1e293b', background: savedFlash === f.id ? '#064e3b' : 'transparent' }}>
                  <td style={{ padding: 6 }}><strong>{f.flight_number}</strong></td>
                  <td style={{ padding: 6, color: '#94a3b8' }}>{f.origin} → {f.destination}</td>
                  <td style={{ padding: 6 }}>
                    <input
                      type="datetime-local"
                      value={f.scheduled_time ? new Date(f.scheduled_time).toISOString().slice(0, 16) : ''}
                      onChange={e => updateField(f.id, 'scheduled_time', new Date(e.target.value).toISOString())}
                      style={{ background: '#020617', color: '#e2e8f0', border: '1px solid #334155', padding: 4, borderRadius: 4 }}
                    />
                  </td>
                  <td style={{ padding: 6 }}>
                    <select value={f.terminal || ''} onChange={e => updateField(f.id, 'terminal', e.target.value)}
                      style={{ background: '#020617', color: '#e2e8f0', border: '1px solid #334155', padding: 4, borderRadius: 4 }}>
                      <option value="">—</option>
                      {['T1', 'T2', 'T3', 'T4'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 6 }}>
                    <input value={f.gate || ''} onChange={e => updateField(f.id, 'gate', e.target.value)}
                      style={{ width: 60, background: '#020617', color: '#e2e8f0', border: '1px solid #334155', padding: 4, borderRadius: 4 }} />
                  </td>
                  <td style={{ padding: 6 }}>
                    <select value={f.status || 'on_time'} onChange={e => updateField(f.id, 'status', e.target.value)}
                      style={{ background: '#020617', color: '#e2e8f0', border: '1px solid #334155', padding: 4, borderRadius: 4 }}>
                      {['on_time', 'delayed', 'boarding', 'departed', 'landed', 'cancelled', 'diverted'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 6 }}>
                    <button className="btn-primary" style={{ fontSize: 11, padding: '4px 8px' }} disabled={saving === f.id} onClick={() => save(f.id)}>
                      {saving === f.id ? '...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {flights.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No flights to edit.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FlightScheduleEditor;
