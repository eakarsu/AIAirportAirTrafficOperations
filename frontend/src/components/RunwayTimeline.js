import React, { useEffect, useState } from 'react';

const TYPE_COLORS = {
  arrival: '#22c55e',
  departure: '#38bdf8',
};

function RunwayTimeline({ token, api }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${api}/api/custom-views/runway-timeline`, {
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
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [api, token]);

  if (loading) return <div className="ai-loading"><div className="spinner"></div><span>Loading timeline...</span></div>;
  if (err) return <div style={{ color: '#fca5a5' }}>Error: {err}</div>;
  if (!data) return null;

  const W = data.window_minutes || 120;

  return (
    <div data-testid="cv-runway-timeline" style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>
          <i className="fas fa-stream" style={{ color: '#38bdf8', marginRight: 8 }}></i>
          Runway Timeline (Arrivals / Departures)
        </h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {data.totals.arrivals} arr · {data.totals.departures} dep · next {W} min
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.lanes.map(lane => (
          <div key={lane.runway}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>RWY {lane.runway}</span>
              <span>{lane.arrivals} arr · {lane.departures} dep</span>
            </div>
            <div style={{ position: 'relative', background: '#020617', borderRadius: 6, height: 28, overflow: 'hidden' }}>
              {lane.ops.map((o, i) => {
                const leftPct = Math.max(0, Math.min(100, (o.start_min / W) * 100));
                const widthPct = Math.max(1.5, (o.duration_min / W) * 100);
                return (
                  <div key={i}
                    title={`${o.flight} · ${o.type} · t+${o.start_min}m · ${o.status}`}
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: 20,
                      background: TYPE_COLORS[o.type] || '#94a3b8',
                      borderRadius: 3,
                      color: '#0f172a',
                      fontSize: 9,
                      fontWeight: 700,
                      textAlign: 'center',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      paddingTop: 4,
                    }}>
                    {o.flight}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
        {Object.entries(TYPE_COLORS).map(([k, v]) => (
          <span key={k}><span style={{ display: 'inline-block', width: 10, height: 10, background: v, borderRadius: 2, marginRight: 4 }}></span>{k}</span>
        ))}
      </div>
    </div>
  );
}

export default RunwayTimeline;
