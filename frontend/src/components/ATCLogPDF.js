import React, { useEffect, useState } from 'react';

function ATCLogPDF({ token, api }) {
  const [entries, setEntries] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${api}/api/custom-views/atc-log-pdf?format=json`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) setErr(j.error || 'Failed');
      else {
        setEntries(j.entries || []);
        setGeneratedAt(j.generated_at);
        setErr(null);
      }
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };

  useEffect(() => { loadPreview(); /* eslint-disable-next-line */ }, [api, token]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const r = await fetch(`${api}/api/custom-views/atc-log-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Download failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atc-log-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e.message); }
    setDownloading(false);
  };

  return (
    <div data-testid="cv-atc-log" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-file-pdf" style={{ color: '#f87171', marginRight: 8 }}></i>
          ATC Log (Last 25 transmissions)
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-cancel" onClick={loadPreview} disabled={loading} style={{ fontSize: 12 }}>
            <i className="fas fa-sync"></i> Refresh
          </button>
          <button className="btn-primary" onClick={downloadPdf} disabled={downloading} style={{ fontSize: 12 }}>
            <i className="fas fa-download"></i> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {generatedAt && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Generated: {new Date(generatedAt).toLocaleString()}</div>
      )}

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><span>Loading log...</span></div>
      ) : err ? (
        <div style={{ color: '#fca5a5' }}>Error: {err}</div>
      ) : (
        <pre style={{
          background: '#020617',
          color: '#a7f3d0',
          padding: 12,
          borderRadius: 6,
          maxHeight: 260,
          overflow: 'auto',
          fontSize: 11,
          fontFamily: 'monospace',
          margin: 0,
        }}>{entries.join('\n')}</pre>
      )}
    </div>
  );
}

export default ATCLogPDF;
