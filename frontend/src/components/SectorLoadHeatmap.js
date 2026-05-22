import React, { useEffect, useState } from 'react';

function loadColor(v, max) {
  if (max <= 0) return '#1e293b';
  const t = Math.min(1, v / max);
  // green -> yellow -> red gradient
  const r = Math.round(34 + (239 - 34) * t);
  const g = Math.round(197 - (197 - 68) * t);
  const b = Math.round(94 + (68 - 94) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function SectorLoadHeatmap({ token, api }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${api}/api/custom-views/sector-load-heatmap`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        if (!cancelled) {
          if (!r.ok) setErr(j.error || 'Failed to load');
          else { setData(j); setErr(null); }
        }
      } catch (e) { if (!cancelled) setErr(String(e)); }
      if (!cancelled) setLoading(false);
    };
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [api, token]);

  if (loading) return <div className="ai-loading"><div className="spinner"></div><span>Loading heatmap...</span></div>;
  if (err) return <div style={{ color: '#fca5a5' }}>Error: {err}</div>;
  if (!data) return null;

  return (
    <div data-testid="cv-sector-heatmap" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-th" style={{ color: '#a78bfa', marginRight: 8 }}></i>
          Sector-Load Heatmap
        </h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          max {data.max_load} · avg {data.mean_load} · worst {data.worst_window.sector}@{String(data.worst_window.hour).padStart(2, '0')}:00
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 10, color: '#0f172a' }}>
          <thead>
            <tr>
              <th style={{ background: 'transparent', color: '#94a3b8', textAlign: 'right', paddingRight: 8 }}></th>
              {data.hours.map(h => (
                <th key={h} style={{ background: 'transparent', color: '#94a3b8', fontWeight: 400, width: 22, textAlign: 'center' }}>
                  {String(h).padStart(2, '0')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row, si) => (
              <tr key={data.sectors[si]}>
                <td style={{ color: '#cbd5e1', textAlign: 'right', paddingRight: 8, fontWeight: 700, background: 'transparent' }}>
                  {data.sectors[si]}
                </td>
                {row.map((v, hi) => (
                  <td key={hi}
                    title={`${data.sectors[si]} · ${String(hi).padStart(2, '0')}:00 · ${v} ac`}
                    style={{
                      width: 22,
                      height: 22,
                      background: loadColor(v, data.max_load),
                      borderRadius: 3,
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 10,
                    }}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Low</span>
        <div style={{ width: 220, height: 10, borderRadius: 3, background: 'linear-gradient(90deg, rgb(34,197,94), rgb(245,158,11), rgb(239,68,68))' }}></div>
        <span>High</span>
      </div>
    </div>
  );
}

export default SectorLoadHeatmap;
