import AIReport from '../components/AIReport';
import useNativeAIRequest from '../components/useNativeAIRequest';

import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import React, { useState } from 'react';

// Apply pass 5 — surfaces backlog AI / data endpoints added on the BE.
// Each tool returns 503 with `missing: <ENV>` when its required env var is unset.
function AIBacklogTools({ token, api }) {
  const fullAIExamples = useFullAIExamples();

  const [active, setActive] = useState('passenger-experience');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // form state per tool
  const [pxTerminal, setPxTerminal] = useState('A');
  const [pxPax, setPxPax] = useState(2500);
  const [pxPeak, setPxPeak] = useState(false);

  const [rmStart, setRmStart] = useState('');
  const [rmEnd, setRmEnd] = useState('');
  const [rmBaseGate, setRmBaseGate] = useState(350);
  const [rmBaseSlot, setRmBaseSlot] = useState(1500);

  const [mcType, setMcType] = useState('aircraft_fire');
  const [mcSeverity, setMcSeverity] = useState('high');
  const [mcLocation, setMcLocation] = useState('Runway 04R');

  const [niRunway, setNiRunway] = useState('04R');
  const [niOps, setNiOps] = useState(30);

  const [esType, setEsType] = useState('aircraft_fire');
  const [esSeverity, setEsSeverity] = useState('medium');
  const [esResponders, setEsResponders] = useState(4);

  const tools = [
    { id: 'passenger-experience', label: 'Passenger Experience', method: 'POST', path: '/api/ai/passenger-experience' },
    { id: 'revenue-management', label: 'Revenue Management', method: 'POST', path: '/api/ai/revenue-management' },
    { id: 'multi-agency', label: 'Multi-Agency Coordination', method: 'POST', path: '/api/ai/multi-agency-coordination' },
    { id: 'adsb', label: 'ADS-B Live', method: 'GET', path: '/api/ai/adsb-live' },
    { id: 'faa', label: 'FAA NextGen', method: 'GET', path: '/api/ai/faa-nextgen' },
    { id: 'airline', label: 'Airline Partners', method: 'GET', path: '/api/ai/airline-partners' },
    { id: 'noise', label: 'Noise Impact', method: 'POST', path: '/api/ai/noise-impact' },
    { id: 'emergency-sim', label: 'Emergency Simulation', method: 'POST', path: '/api/ai/emergency-simulation' },
  ];

  const buildBody = () => {
    switch (active) {
      case 'passenger-experience':
        return { terminal: pxTerminal, current_pax_count: Number(pxPax), peak_hour: pxPeak, focus_areas: ['connections', 'crowd_flow'] };
      case 'revenue-management':
        return { window_start: rmStart || undefined, window_end: rmEnd || undefined, base_gate_fee_usd: Number(rmBaseGate), base_slot_fee_usd: Number(rmBaseSlot) };
      case 'multi-agency':
        return { incident_type: mcType, severity: mcSeverity, location: mcLocation, agencies_involved: ['ARFF', 'EMS', 'TSA'] };
      case 'noise':
        return { runway: niRunway, ops_per_hour: Number(niOps), receptors: [{ name: 'School-1', distance_nm: 1.5 }, { name: 'Hospital-1', distance_nm: 3 }] };
      case 'emergency-sim':
        return { incident_type: esType, severity: esSeverity, responders: Number(esResponders) };
      default:
        return {};
    }
  };

  const aiRequest = useNativeAIRequest(() => setLoading(false));

  const run = async () => {
    const aiOwner = aiRequest.begin(); if (!aiOwner) return;
    try {
    setLoading(true); setError(''); setResult(null);
    const tool = tools.find((t) => t.id === active);
    try {
      const opts = {
        method: tool.method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      if (tool.method === 'POST') opts.body = JSON.stringify(buildBody());
      const res = await aiRequest.fetch(aiOwner,`${api}${tool.path}`, opts);
      const data = await res.json();
      if (!res.ok) {
        const missing = data.missing ? ` (missing: ${data.missing})` : '';
        throw new Error((data.error || `HTTP ${res.status}`) + missing);
      }
      setResult(data);
    } catch (err) {
      if (!aiRequest.isCurrent(aiOwner)) return;
      setError(err.message);
    }
    if (aiRequest.isCurrent(aiOwner)) setLoading(false);
    } finally { if (aiRequest.isCurrent(aiOwner)) { setLoading(false); aiRequest.finish(aiOwner); } }
  };

  return (
    <div data-full-ai-workspace="AIBacklogTools"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
      {aiRequest.notice && <p role="status">{aiRequest.notice}</p>}<button type="button" className="btn-cancel" onClick={aiRequest.cancel}>Cancel AI request</button>
      <div className="page-header">
        <h1><i className="fas fa-toolbox"></i> AI Backlog Tools</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 16 }}>
        Review-only planning reports use OpenRouter. Live-source checks require configured credentials. Noise and emergency timeline tools are explicitly illustrative local calculations; no prediction, observation, dispatch or clearance is established.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tools.map((t) => (
          <button key={t.id} onClick={() => { setActive(t.id); setResult(null); setError(''); }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #334155',
              background: active === t.id ? '#38bdf8' : 'transparent',
              color: active === t.id ? '#0f172a' : '#cbd5e1', cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(15,23,42,0.6)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        {active === 'passenger-experience' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Terminal <input value={pxTerminal} onChange={(e) => setPxTerminal(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: pxTerminal, change: (e) => setPxTerminal(e.target.value), label: "pxTerminal", manual: false, json: false, sample: 'A' }, "p1-4902", undefined)} /></label>
            <label>Pax count <input type="number" value={pxPax} onChange={(e) => setPxPax(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: pxPax, change: (e) => setPxPax(e.target.value), label: "pxPax", manual: false, json: false, sample: 2500 }, "p1-5016", undefined)} /></label>
            <label><input type="checkbox" checked={pxPeak} onChange={(e) => setPxPeak(e.target.checked)} data-full-ai-field={fullAIExamples.bind({ current: pxPeak, change: (e) => setPxPeak(e.target.checked), label: "pxPeak", manual: false, json: false, sample: false }, "p1-5124", undefined)} /> Peak hour</label>
          </div>
        )}
        {active === 'revenue-management' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Window start <input type="datetime-local" value={rmStart} onChange={(e) => setRmStart(e.target.value)} placeholder="YYYY-MM-DD HH:MM" data-full-ai-field={fullAIExamples.bind({ current: rmStart, change: (e) => setRmStart(e.target.value), label: "rmStart", manual: false, json: false, sample: '' }, "p1-5408", undefined)} /></label>
            <label>Window end <input type="datetime-local" value={rmEnd} onChange={(e) => setRmEnd(e.target.value)} placeholder="YYYY-MM-DD HH:MM" data-full-ai-field={fullAIExamples.bind({ current: rmEnd, change: (e) => setRmEnd(e.target.value), label: "rmEnd", manual: false, json: false, sample: '' }, "p1-5548", undefined)} /></label>
            <label>Base gate fee USD <input type="number" value={rmBaseGate} onChange={(e) => setRmBaseGate(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: rmBaseGate, change: (e) => setRmBaseGate(e.target.value), label: "rmBaseGate", manual: false, json: false, sample: 350 }, "p1-5691", undefined)} /></label>
            <label>Base slot fee USD <input type="number" value={rmBaseSlot} onChange={(e) => setRmBaseSlot(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: rmBaseSlot, change: (e) => setRmBaseSlot(e.target.value), label: "rmBaseSlot", manual: false, json: false, sample: 1500 }, "p1-5827", undefined)} /></label>
          </div>
        )}
        {active === 'multi-agency' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Incident type <input value={mcType} onChange={(e) => setMcType(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: mcType, change: (e) => setMcType(e.target.value), label: "mcType", manual: false, json: false, sample: 'aircraft_fire' }, "p1-6098", undefined)} /></label>
            <label>Severity
              <select value={mcSeverity} onChange={(e) => setMcSeverity(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: mcSeverity, change: (e) => setMcSeverity(e.target.value), label: "mcSeverity", manual: false, json: false, sample: 'high' }, "p1-6217", undefined)}>
                <option>low</option><option>medium</option><option>high</option><option>critical</option>
              </select>
            </label>
            <label>Location <input value={mcLocation} onChange={(e) => setMcLocation(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: mcLocation, change: (e) => setMcLocation(e.target.value), label: "mcLocation", manual: false, json: false, sample: 'Runway 04R' }, "p1-6472", undefined)} /></label>
          </div>
        )}
        {active === 'noise' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Runway <input value={niRunway} onChange={(e) => setNiRunway(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: niRunway, change: (e) => setNiRunway(e.target.value), label: "niRunway", manual: false, json: false, sample: '04R' }, "p1-6715", undefined)} /></label>
            <label>Ops / hour <input type="number" value={niOps} onChange={(e) => setNiOps(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: niOps, change: (e) => setNiOps(e.target.value), label: "niOps", manual: false, json: false, sample: 30 }, "p1-6826", undefined)} /></label>
          </div>
        )}
        {active === 'emergency-sim' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Incident type <input value={esType} onChange={(e) => setEsType(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: esType, change: (e) => setEsType(e.target.value), label: "esType", manual: false, json: false, sample: 'aircraft_fire' }, "p1-7088", undefined)} /></label>
            <label>Severity
              <select value={esSeverity} onChange={(e) => setEsSeverity(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: esSeverity, change: (e) => setEsSeverity(e.target.value), label: "esSeverity", manual: false, json: false, sample: 'medium' }, "p1-7207", undefined)}>
                <option>low</option><option>medium</option><option>high</option><option>critical</option>
              </select>
            </label>
            <label>Responders <input type="number" value={esResponders} onChange={(e) => setEsResponders(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: esResponders, change: (e) => setEsResponders(e.target.value), label: "esResponders", manual: false, json: false, sample: 4 }, "p1-7464", undefined)} /></label>
          </div>
        )}
        {(active === 'adsb' || active === 'faa' || active === 'airline') && (
          <p style={{ color: '#94a3b8', margin: 0 }}>No input required — returns 503 with <code>missing: &lt;ENV&gt;</code> when key is unset.</p>
        )}
        <div style={{ marginTop: 12 }}>
          <button className="btn-ai" onClick={run} disabled={loading}>
            <i className="fas fa-robot"></i> {loading ? 'Running…' : ['noise','emergency-sim'].includes(active) ? 'Calculate illustrative local model' : ['adsb','faa','airline'].includes(active) ? 'Check configured source' : 'Generate with OpenRouter'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <AIReport response={result} sourceLabel={['noise','emergency-sim'].includes(active)?'Illustrative local calculation':['adsb','faa','airline'].includes(active)?'Configured source check':'OpenRouter advisory report'} title={['noise','emergency-sim'].includes(active)?'Illustrative local model':'Advisory planning report'} />
      )}
    </div>
  );
}

export default AIBacklogTools;
