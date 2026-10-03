import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppSidebar.css';

const LINKS = [
  { to: '/insights/timeline', label: 'Timeline View', group: 'Insights' },
  { to: '/codex/custom-viz', label: 'Custom Viz', group: 'Insights' },
  { to: '/codex/operations', label: 'Operations', group: 'Insights' },
  { to: '/', label: 'Dashboard', group: 'Workspace' },
  { to: '/gates', label: 'Gate Assignment', group: 'Workspace' },
  { to: '/crews', label: 'Ground Crew', group: 'Workspace' },
  { to: '/delays', label: 'Delay Prediction', group: 'Workspace' },
  { to: '/baggage', label: 'Baggage Flow', group: 'Workspace' },
  { to: '/runways', label: 'Runway Utilization', group: 'Workspace' },
  { to: '/flights', label: 'Flight Schedule', group: 'Workspace' },
  { to: '/weather', label: 'Weather Dashboard', group: 'Workspace' },
  { to: '/incidents', label: 'Incident Reports', group: 'Workspace' },
  { to: '/maintenance', label: 'Maintenance Logs', group: 'Workspace' },
  { to: '/statistics', label: 'Statistics', group: 'Workspace' },
  { to: '/statistics/passenger-experience', label: 'Passenger Experience', group: 'Workspace' },
  { to: '/statistics/carbon', label: 'Carbon Dashboard', group: 'Workspace' },
  { to: '/ai/gate-conflicts', label: 'Gate Conflicts', group: 'AI tools' },
  { to: '/ai/connections', label: 'Connection Analysis', group: 'AI tools' },
  { to: '/ai/weather-routing', label: 'Weather Routing', group: 'AI tools' },
  { to: '/ai/crew-training', label: 'Crew Cross Training', group: 'AI tools' },
  { to: '/ai/cost-optimization', label: 'Cost Optimization', group: 'AI tools' },
  { to: '/ai/incident-prediction', label: 'Incident Prediction', group: 'AI tools' },
  { to: '/ai/baggage-recon', label: 'Baggage Reconciliation', group: 'AI tools' },
  { to: '/ai/sustainability', label: 'Sustainability', group: 'AI tools' },
  { to: '/ai/shift-handover', label: 'Shift Handover', group: 'AI tools' },
  { to: '/ai/predictive-maintenance', label: 'Predictive Maintenance', group: 'AI tools' },
  { to: '/ai/notam-briefing', label: 'Notam Briefing', group: 'AI tools' },
  { to: '/ai/runway-simulator', label: 'Runway Simulator', group: 'AI tools' },
  { to: '/ai/history', label: 'AI History', group: 'AI tools' },
  { to: '/ai/traffic-forecast', label: 'Traffic Forecast', group: 'AI tools' },
  { to: '/ai/emergency-response', label: 'Emergency Response', group: 'AI tools' },
  { to: '/ai/backlog-tools', label: 'AI Backlog Tools', group: 'AI tools' },
  { to: '/custom-views', label: 'Custom Views', group: 'Workspace' },
];

export default function AppSidebar() {
  const [query, setQuery] = useState('');
  const visible = LINKS.filter(link => link.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <aside className="codex-side" aria-label="Application navigation">
    <div className="codex-side-brand"><strong>AIAirport Air Traffic Operations</strong><span>Workspace</span></div>
    <label className="codex-side-search-label" htmlFor="codex-side-search">Find a section</label>
    <input id="codex-side-search" className="codex-side-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search navigation" />
    <nav className="codex-side-links" aria-label="Sections">
      {['Workspace', 'AI tools', 'Insights'].map(group => {
        const items = visible.filter(link => link.group === group);
        return items.length ? <div className="codex-side-group" key={group}>
          <span className="codex-side-heading">{group}</span>
          {items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `codex-side-link${isActive ? ' active' : ''}`}>{link.label}</NavLink>)}
        </div> : null;
      })}
      {visible.length === 0 && <p className="codex-side-empty">No matching sections</p>}
    </nav>
  </aside>;
}
