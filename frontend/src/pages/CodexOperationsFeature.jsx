import React, { useEffect, useRef, useState } from 'react';
import useNativeRecordList from '../components/useNativeRecordList';
import Modal from '../components/AIWorkspaceModal';
import AIReport from '../components/AIReport';

const API = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
const editable = ['draft', 'feed_validated', 'conflict_checked'];
const draftFields = [
  { key: 'planningWindow', label: 'Planning window' },
  { key: 'gatePlan', label: 'Gate planning notes' },
  { key: 'runwayPlan', label: 'Runway planning notes' },
  { key: 'degradedMode', label: 'Degraded-mode planning notes' },
  { key: 'failSafeProcedure', label: 'Fail-safe planning notes' },
];
const empty = () => ({ title: '', ...Object.fromEntries(draftFields.map(field => [field.key, ''])) });

export default function CodexOperationsFeature() {
  const token = localStorage.getItem('token') || '';
  const [items, setItems] = useState([]), [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null), [editing, setEditing] = useState(null), [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [notice, setNotice] = useState('');
  const pending = useRef(null);
  const { loading, error, reload } = useNativeRecordList({ url: `${API}/api/operational-plans`, token, onLoad: data => setItems(data.items) });
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);
  const close = () => { pending.current?.abort();pending.current=null;setBusy(false); setSelected(null); setEditing(null); setDraft(null); setFailure(''); };
  const edit = item => {
    setSelected(null); setEditing(item); setFailure('');
    setDraft({ title: item.title, ...Object.fromEntries(draftFields.map(field => [field.key, typeof item.payload?.[field.key] === 'string' ? item.payload[field.key] : ''])) });
  };
  const save = async event => {
    event.preventDefault(); if (pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setFailure('');
    const payload = { ...(editing?.payload || {}), ...Object.fromEntries(draftFields.filter(field => !editing || typeof editing.payload?.[field.key] !== 'object' || editing.payload?.[field.key] === null).map(field => [field.key, draft[field.key]])) };
    try {
      const response = await fetch(`${API}/api/operational-plans${editing ? '/' + editing.id : ''}`, { method: editing ? 'PATCH' : 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: draft.title, payload, ...(editing ? { expectedVersion: editing.version } : { evidence: [] }) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message || body.error || 'Could not save planning draft.');
      if (!body.id) throw new Error('The planning service returned an incomplete response.');
      if (pending.current !== controller || controller.signal.aborted) return;
      setDraft(null); setEditing(null); setNotice('Planning draft saved. Operational approval and source evidence remain required.'); await reload();
    } catch (err) { if (pending.current === controller && !controller.signal.aborted) setFailure(err.message); }
    finally { if (pending.current === controller) { pending.current = null; setBusy(false); } }
  };
  const visible = items.filter(item => `${item.title} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="ai-workspace">
    <header><h1>Operational planning desk</h1><p>Saved planning drafts use the native PostgreSQL workflow. Flight-feed validation, conflict checks, controller review and approval remain separate steps.</p></header>
    <div className="header-actions"><input aria-label="Search planning drafts" value={query} onChange={event => setQuery(event.target.value)} /><button type="button" className="btn-primary" onClick={() => { setEditing(null); setDraft(empty()); setFailure(''); }}>New planning draft</button></div>
    {loading && <p role="status">Loading planning drafts…</p>}
    {error && <div role="alert">{error} <button type="button" onClick={reload}>Retry loading records</button></div>}
    {notice && <p role="status">{notice}</p>}
    {!loading && !error && <div className="data-table-container"><table className="data-table"><thead><tr><th>Planning draft</th><th>State</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{visible.map(item => <tr key={item.id} onClick={() => setSelected(item)}><td><button type="button" className="btn-cancel" onClick={event => { event.stopPropagation(); setSelected(item); }}>{item.title}</button></td><td>{item.status.replace(/_/g, ' ')}</td><td>{new Date(item.updated_at).toLocaleString()}</td><td>View planning draft</td></tr>)}</tbody></table>{!visible.length && <p>No matching saved planning drafts.</p>}</div>}
    {selected && <Modal title={selected.title} onClose={close} footer={<><button type="button" className="btn-cancel" disabled={!editable.includes(selected.status)} onClick={() => edit(selected)}>Edit</button><button type="button" className="btn-cancel" disabled title="Native planning and audit records are retained; withdrawal requires the governed workflow.">Delete retained record</button><button type="button" className="btn-cancel" onClick={close}>Cancel</button></>}><p>Workflow state: {selected.status.replace(/_/g, ' ')}. This draft does not establish operational clearance.</p><AIReport response={selected.payload} title="Planning notes" /><p>{selected.evidence?.length || 0} actual source-evidence items attached.</p></Modal>}
    {draft && <Modal title={editing ? 'Edit planning draft' : 'New planning draft'} onClose={close} footer={<button type="button" className="btn-cancel" onClick={close}>Cancel</button>}><form onSubmit={save}><div className="form-group"><label htmlFor="planning-title">Title</label><input id="planning-title" value={draft.title} required maxLength={250} disabled={busy} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} /></div>{draftFields.map(field => <div className="form-group" key={field.key}><label htmlFor={'plan-' + field.key}>{field.label}</label>{editing?.payload?.[field.key] && typeof editing.payload[field.key] === 'object' ? <><AIReport response={editing.payload[field.key]} title={field.label} /><p>The saved structured planning value is preserved.</p></> : <textarea id={'plan-' + field.key} value={draft[field.key]} disabled={busy} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))} />}</div>)}{failure && <div role="alert">{failure}</div>}<p>Existing source references and evidence are preserved. Saving a draft does not execute or approve a plan.</p><button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save planning draft'}</button></form></Modal>}
  </section>;
}
