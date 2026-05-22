import React, { useState } from 'react';

function FlightPlanPDF({ token, api }) {
  const [callsign, setCallsign] = useState('DLH441');
  const [dep, setDep] = useState('EDDF');
  const [arr, setArr] = useState('KJFK');
  const [acft, setAcft] = useState('B748');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const previewPlan = async () => {
    setBusy(true); setMsg('');
    try {
      const q = new URLSearchParams({ callsign, dep, arr, acft, format: 'json' }).toString();
      const r = await fetch(`${api}/api/custom-views/flight-plan-pdf?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to load');
      setPreview(j);
    } catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  };

  const downloadPdf = async () => {
    setBusy(true); setMsg('');
    try {
      const q = new URLSearchParams({ callsign, dep, arr, acft }).toString();
      const r = await fetch(`${api}/api/custom-views/flight-plan-pdf?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flight-plan-${callsign}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg('PDF download started.');
    } catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  };

  return (
    <div data-testid="cv-flight-plan" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-file-pdf" style={{ color: '#f87171', marginRight: 8 }}></i>
          ICAO Flight Plan PDF
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>Callsign
          <input value={callsign} onChange={e => setCallsign(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>Departure (ICAO)
          <input value={dep} onChange={e => setDep(e.target.value.toUpperCase())} maxLength={4} style={inputStyle} />
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>Arrival (ICAO)
          <input value={arr} onChange={e => setArr(e.target.value.toUpperCase())} maxLength={4} style={inputStyle} />
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>Aircraft
          <input value={acft} onChange={e => setAcft(e.target.value.toUpperCase())} maxLength={4} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={previewPlan} disabled={busy} style={btn('#38bdf8')}>
          <i className="fas fa-eye"></i> Preview
        </button>
        <button onClick={downloadPdf} disabled={busy} style={btn('#22c55e')}>
          <i className="fas fa-download"></i> Download PDF
        </button>
      </div>

      {msg && <div style={{ color: '#fbbf24', fontSize: 12, marginBottom: 8 }}>{msg}</div>}

      {preview && (
        <pre style={{
          background: '#020617',
          color: '#cbd5e1',
          padding: 12,
          borderRadius: 6,
          maxHeight: 280,
          overflow: 'auto',
          fontSize: 11,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
        }}>
          {preview.lines.join('\n')}
        </pre>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  marginTop: 4,
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

export default FlightPlanPDF;
