import React, { useEffect, useState } from 'react';

function colorFor(v, max) {
  if (max <= 0) return '#0f172a';
  const ratio = Math.min(1, v / max);
  const r = Math.round(40 + ratio * 215);
  const g = Math.round(180 - ratio * 160);
  const b = Math.round(220 - ratio * 200);
  return `rgb(${r},${g},${b})`;
}

function FlightDelayHeatmap({ token, api }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${api}/api/custom-views/flight-delay-heatmap`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        if (!cancelled) {
          if (!r.ok) setErr(j.error || 'Failed to load');
          else setData(j);
        }
      } catch (e) { if (!cancelled) setErr(String(e)); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [api, token]);

  if (loading) return <div className="ai-loading"><div className="spinner"></div><span>Loading heatmap...</span></div>;
  if (err) return <div style={{ color: '#fca5a5' }}>Error: {err}</div>;
  if (!data) return null;

  const max = data.max_delay_min || 1;

  return (
    <div data-testid="cv-delay-heatmap" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-fire" style={{ color: '#f97316', marginRight: 8 }}></i>
          Flight Delay Heatmap (min)
        </h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Worst: {data.worst_window.day} {data.worst_window.hour}:00 ({data.worst_window.delay_min}m) · Mean {data.mean_delay_min}m · Max {data.max_delay_min}m
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, color: '#e2e8f0' }}>
          <thead>
            <tr>
              <th style={{ padding: 4, textAlign: 'right' }}></th>
              {data.hours.map(h => (
                <th key={h} style={{ padding: 4, color: '#64748b', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.days.map((d, di) => (
              <tr key={d}>
                <td style={{ padding: 4, color: '#94a3b8', fontWeight: 600 }}>{d}</td>
                {data.matrix[di].map((v, hi) => (
                  <td key={hi}
                    title={`${d} ${hi}:00 — ${v} min`}
                    style={{
                      width: 26,
                      height: 24,
                      background: colorFor(v, max),
                      border: '1px solid #0f172a',
                      textAlign: 'center',
                      color: v > max * 0.55 ? '#0f172a' : '#e2e8f0',
                      fontWeight: 600,
                    }}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FlightDelayHeatmap;
