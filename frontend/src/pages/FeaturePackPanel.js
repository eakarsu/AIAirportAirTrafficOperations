import React, { useCallback, useEffect, useState } from 'react';
const FEATURES = [{"id": "delay-risk-summary", "label": "Delay risk summary"}, {"id": "gate-pressure", "label": "Gate pressure"}, {"id": "route-concentration", "label": "Route concentration"}];
function renderValue(v) {
  if (v === false) return 'false'; if (v === 0) return '0'; if (v === '') return '(empty)';
  if (v === null || v === undefined) return '(none)';
  if (Array.isArray(v)) return v.length ? v.map((x, i) => <div key={i}>{typeof x === 'object' ? JSON.stringify(x) : String(x)}</div>) : '(empty)';
  if (typeof v === 'object') return Object.entries(v).map(([k, val]) => <div key={k}><strong>{k}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '(none)')}</div>);
  return String(v);
}
export function AiSections({ result }) {
  if (!result) return null;
  const sections = result.sections || result.result || {};
  return <div>
    <p>{result.aiGenerated ? `AI-generated via ${result.provider || 'provider'}` : 'Deterministic fallback — not AI-generated (aiGenerated: false)'}</p>
    {result.disclaimer ? <p><em>{result.disclaimer}</em></p> : null}
    {Object.entries(sections).map(([label, value]) => <section key={label}><h4>{label}</h4><div>{renderValue(value)}</div></section>)}
  </div>;
}
export default function FeaturePackPanel({ api = `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api`, token: tokenProp }) {
  const token = tokenProp || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  const headers = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const [tasks, setTasks] = useState([]); const [title, setTitle] = useState('');
  const [q, setQ] = useState(''); const [records, setRecords] = useState([]);
  const [ai, setAi] = useState(null); const [error, setError] = useState('');
  const loadTasks = useCallback(async () => { try { const r = await fetch(`${api}/tasks`, { headers: headers() }); const d = await r.json(); setTasks(d.data || []); } catch (e) { setError(e.message); } }, [api, headers]);
  useEffect(() => { loadTasks(); }, [loadTasks]);
  async function search() { const r = await fetch(`${api}/feature-pack/records?q=${encodeURIComponent(q)}`, { headers: headers() }); const d = await r.json(); setRecords(d.data || []); }
  async function download(format) { const r = await fetch(`${api}/feature-pack/export?format=${format}&q=${encodeURIComponent(q)}`, { headers: headers() }); const b = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `records.${format}`; a.click(); }
  async function runAi(id) { const r = await fetch(`${api}/feature-pack/ai/${id}`, { method: 'POST', headers: headers(), body: '{}' }); setAi(await r.json()); }
  async function createTask(e) { e.preventDefault(); await fetch(`${api}/tasks`, { method: 'POST', headers: headers(), body: JSON.stringify({ title }) }); setTitle(''); loadTasks(); }
  async function setStatus(t, status) { await fetch(`${api}/tasks/${t.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }); loadTasks(); }
  return <div style={{ padding: 20 }}><h2>Feature Pack — Tasks, Search, Export &amp; AI</h2>
    {error ? <p role="alert">{error}</p> : null}
    <form onSubmit={createTask}><input aria-label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task title" /><button type="submit">Add task</button></form>
    <ul>{tasks.map((t) => <li key={t.id}>{t.title} — {t.status} <button onClick={() => setStatus(t, t.status === 'done' ? 'todo' : 'done')}>Toggle done</button></li>)}</ul>
    <div><input aria-label="Search records" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search records" /><button onClick={search}>Search</button>
    <button onClick={() => download('csv')}>Export CSV</button><button onClick={() => download('json')}>Export JSON</button></div>
    <p>{records.length} record(s)</p>
    <div>{FEATURES.map((f) => <button key={f.id} onClick={() => runAi(f.id)}>{f.label}</button>)}</div>
    <AiSections result={ai} />
  </div>;
}
