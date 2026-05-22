import React, { useEffect, useState, useCallback } from 'react';

const EMPTY = { scope: 'runway', target: '', rule_type: '', detail: '', priority: 3, active: true };

function AirspaceRulesEditor({ token, api }) {
  const [rules, setRules] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${api}/api/custom-views/airspace-rules`, { headers });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load failed');
      setRules(j.rules || []);
    } catch (e) { setMsg(String(e.message || e)); }
  }, [api, token]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true); setMsg('');
    try {
      if (editingId) {
        const r = await fetch(`${api}/api/custom-views/airspace-rules/${editingId}`, {
          method: 'PUT', headers, body: JSON.stringify(draft),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'update failed');
        setMsg(`Updated rule #${editingId}`);
      } else {
        const r = await fetch(`${api}/api/custom-views/airspace-rules`, {
          method: 'POST', headers, body: JSON.stringify(draft),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'create failed');
        setMsg(`Created rule #${j.rule?.id}`);
      }
      setDraft(EMPTY); setEditingId(null);
      await load();
    } catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setDraft({
      scope: rule.scope,
      target: rule.target,
      rule_type: rule.rule_type,
      detail: rule.detail || '',
      priority: rule.priority || 3,
      active: !!rule.active,
    });
  };

  const remove = async (id) => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${api}/api/custom-views/airspace-rules/${id}`, { method: 'DELETE', headers });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'delete failed');
      setMsg(`Deleted rule #${id}`);
      await load();
    } catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  };

  return (
    <div data-testid="cv-airspace-rules" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-gavel" style={{ color: '#fbbf24', marginRight: 8 }}></i>
          Airspace / Runway Rules Editor
        </h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{rules.length} rules</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px 80px', gap: 6, marginBottom: 8 }}>
        <select value={draft.scope} onChange={e => setDraft(d => ({ ...d, scope: e.target.value }))} style={inputStyle}>
          <option value="runway">runway</option>
          <option value="sector">sector</option>
          <option value="airspace">airspace</option>
        </select>
        <input placeholder="Target (e.g. 09L, SECTOR-N)" value={draft.target} onChange={e => setDraft(d => ({ ...d, target: e.target.value }))} style={inputStyle} />
        <input placeholder="Rule type" value={draft.rule_type} onChange={e => setDraft(d => ({ ...d, rule_type: e.target.value }))} style={inputStyle} />
        <input type="number" min="1" max="5" value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: +e.target.value }))} style={inputStyle} />
        <label style={{ color: '#cbd5e1', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={!!draft.active} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))} /> active
        </label>
      </div>
      <input placeholder="Detail" value={draft.detail} onChange={e => setDraft(d => ({ ...d, detail: e.target.value }))} style={{ ...inputStyle, width: '100%', marginBottom: 8 }} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={submit} disabled={busy} style={btn('#38bdf8')}>
          <i className={`fas fa-${editingId ? 'save' : 'plus'}`}></i> {editingId ? `Update #${editingId}` : 'Create Rule'}
        </button>
        {editingId && (
          <button onClick={() => { setEditingId(null); setDraft(EMPTY); }} style={btn('#64748b')}>
            Cancel
          </button>
        )}
      </div>

      {msg && <div style={{ color: '#fbbf24', fontSize: 12, marginBottom: 8 }}>{msg}</div>}

      <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #1e293b', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ background: '#1e293b' }}>
            <tr>
              <th style={th}>#</th>
              <th style={th}>Scope</th>
              <th style={th}>Target</th>
              <th style={th}>Type</th>
              <th style={th}>Detail</th>
              <th style={th}>Pri</th>
              <th style={th}>Active</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #1e293b', color: '#cbd5e1' }}>
                <td style={td}>{r.id}</td>
                <td style={td}>{r.scope}</td>
                <td style={td}>{r.target}</td>
                <td style={td}>{r.rule_type}</td>
                <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detail}</td>
                <td style={td}>{r.priority}</td>
                <td style={td}>{r.active ? 'yes' : 'no'}</td>
                <td style={td}>
                  <button onClick={() => startEdit(r)} style={miniBtn('#38bdf8')}>edit</button>
                  <button onClick={() => remove(r.id)} style={miniBtn('#ef4444')}>del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '6px 8px',
  background: '#020617',
  border: '1px solid #1e293b',
  borderRadius: 4,
  color: '#e2e8f0',
  fontSize: 12,
};

const btn = (color) => ({
  background: color,
  color: '#0f172a',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 4,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 12,
});

const miniBtn = (color) => ({
  background: 'transparent',
  color,
  border: `1px solid ${color}`,
  padding: '2px 6px',
  borderRadius: 3,
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  marginRight: 4,
});

const th = { padding: '6px 8px', color: '#94a3b8', textAlign: 'left', fontWeight: 600 };
const td = { padding: '6px 8px' };

export default AirspaceRulesEditor;
