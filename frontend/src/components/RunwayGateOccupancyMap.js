import React, { useEffect, useState } from 'react';

const STATUS_COLORS = {
  occupied: '#ef4444',
  available: '#22c55e',
  maintenance: '#f59e0b',
  reserved: '#8b5cf6',
};

function RunwayGateOccupancyMap({ token, api }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${api}/api/custom-views/runway-gate-occupancy`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        if (!cancelled) {
          if (!r.ok) setErr(j.error || 'Failed to load');
          else setData(j);
        }
      } catch (e) { if (!cancelled) setErr(String(e)); }
      if (!cancelled) setLoading(false);
    };
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [api, token]);

  if (loading) return <div className="ai-loading"><div className="spinner"></div><span>Loading occupancy...</span></div>;
  if (err) return <div style={{ color: '#fca5a5' }}>Error: {err}</div>;
  if (!data) return null;

  return (
    <div data-testid="cv-runway-gate" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-map-marked-alt" style={{ color: '#38bdf8', marginRight: 8 }}></i>
          Runway & Gate Occupancy Map
        </h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {data.summary.gates_occupied}/{data.summary.total_gates} gates occupied · {data.summary.runway_throughput_ops_hr} ops/hr
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h4 style={{ color: '#cbd5e1' }}>Runways</h4>
          <div style={{ position: 'relative', height: 220, background: '#020617', borderRadius: 8, overflow: 'hidden', padding: 12 }}>
            {data.runways.map((r, i) => (
              <div key={r.runway} style={{
                position: 'absolute',
                top: 20 + i * 30,
                left: 12,
                right: 12,
                height: 16,
                background: STATUS_COLORS[r.status] || '#64748b',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                color: '#0f172a',
                fontWeight: 700,
                fontSize: 11,
              }} title={`${r.runway} · ${r.status} · ${r.ops_per_hour} ops/hr`}>
                RWY {r.runway} · {r.ops_per_hour} ops/hr · {r.current_aircraft}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ color: '#cbd5e1' }}>Gates</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {data.gates.map(g => (
              <div key={g.gate}
                title={`${g.gate} · ${g.status}${g.flight ? ` · ${g.flight}` : ''}`}
                style={{
                  background: STATUS_COLORS[g.status] || '#475569',
                  color: '#0f172a',
                  borderRadius: 6,
                  padding: 8,
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                {g.gate}<br />
                <span style={{ fontSize: 9, fontWeight: 500 }}>{g.flight || g.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
        {Object.entries(STATUS_COLORS).map(([k, v]) => (
          <span key={k}><span style={{ display: 'inline-block', width: 10, height: 10, background: v, borderRadius: 2, marginRight: 4 }}></span>{k}</span>
        ))}
      </div>
    </div>
  );
}

export default RunwayGateOccupancyMap;
