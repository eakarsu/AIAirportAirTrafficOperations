import React, { useState } from 'react';

// Apply pass 5 — surfaces backlog AI / data endpoints added on the BE.
// Each tool returns 503 with `missing: <ENV>` when its required env var is unset.
function AIBacklogTools({ token, api }) {
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

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    const tool = tools.find((t) => t.id === active);
    try {
      const opts = {
        method: tool.method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      if (tool.method === 'POST') opts.body = JSON.stringify(buildBody());
      const res = await fetch(`${api}${tool.path}`, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const missing = data.missing ? ` (missing: ${data.missing})` : '';
        throw new Error((data.error || `HTTP ${res.status}`) + missing);
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1><i className="fas fa-toolbox"></i> AI Backlog Tools</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 16 }}>
        Endpoints added in apply pass 5. Some return 503 with <code>missing: &lt;ENV&gt;</code> until creds are configured.
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
            <label>Terminal <input value={pxTerminal} onChange={(e) => setPxTerminal(e.target.value)} /></label>
            <label>Pax count <input type="number" value={pxPax} onChange={(e) => setPxPax(e.target.value)} /></label>
            <label><input type="checkbox" checked={pxPeak} onChange={(e) => setPxPeak(e.target.checked)} /> Peak hour</label>
          </div>
        )}
        {active === 'revenue-management' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Window start <input value={rmStart} onChange={(e) => setRmStart(e.target.value)} placeholder="YYYY-MM-DD HH:MM" /></label>
            <label>Window end <input value={rmEnd} onChange={(e) => setRmEnd(e.target.value)} placeholder="YYYY-MM-DD HH:MM" /></label>
            <label>Base gate fee USD <input type="number" value={rmBaseGate} onChange={(e) => setRmBaseGate(e.target.value)} /></label>
            <label>Base slot fee USD <input type="number" value={rmBaseSlot} onChange={(e) => setRmBaseSlot(e.target.value)} /></label>
          </div>
        )}
        {active === 'multi-agency' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Incident type <input value={mcType} onChange={(e) => setMcType(e.target.value)} /></label>
            <label>Severity
              <select value={mcSeverity} onChange={(e) => setMcSeverity(e.target.value)}>
                <option>low</option><option>medium</option><option>high</option><option>critical</option>
              </select>
            </label>
            <label>Location <input value={mcLocation} onChange={(e) => setMcLocation(e.target.value)} /></label>
          </div>
        )}
        {active === 'noise' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Runway <input value={niRunway} onChange={(e) => setNiRunway(e.target.value)} /></label>
            <label>Ops / hour <input type="number" value={niOps} onChange={(e) => setNiOps(e.target.value)} /></label>
          </div>
        )}
        {active === 'emergency-sim' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>Incident type <input value={esType} onChange={(e) => setEsType(e.target.value)} /></label>
            <label>Severity
              <select value={esSeverity} onChange={(e) => setEsSeverity(e.target.value)}>
                <option>low</option><option>medium</option><option>high</option><option>critical</option>
              </select>
            </label>
            <label>Responders <input type="number" value={esResponders} onChange={(e) => setEsResponders(e.target.value)} /></label>
          </div>
        )}
        {(active === 'adsb' || active === 'faa' || active === 'airline') && (
          <p style={{ color: '#94a3b8', margin: 0 }}>No input required — returns 503 with <code>missing: &lt;ENV&gt;</code> when key is unset.</p>
        )}
        <div style={{ marginTop: 12 }}>
          <button className="btn-ai" onClick={run} disabled={loading}>
            <i className="fas fa-robot"></i> {loading ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <pre style={{ background: '#0b1220', color: '#cbd5e1', padding: 16, borderRadius: 12, overflow: 'auto', maxHeight: 500 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default AIBacklogTools;
