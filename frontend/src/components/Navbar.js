import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const linkGroups = [
  {
    label: 'Operations',
    links: [
      { path: '/', label: 'Dashboard', icon: 'fa-tachometer-alt' },
      { path: '/flights', label: 'Flights', icon: 'fa-plane' },
      { path: '/gates', label: 'Gates', icon: 'fa-door-open' },
      { path: '/runways', label: 'Runways', icon: 'fa-road' },
      { path: '/crews', label: 'Crews', icon: 'fa-users' },
      { path: '/baggage', label: 'Baggage', icon: 'fa-suitcase-rolling' },
      { path: '/delays', label: 'Delays', icon: 'fa-clock' },
      { path: '/weather', label: 'Weather', icon: 'fa-cloud-sun' },
      { path: '/incidents', label: 'Incidents', icon: 'fa-exclamation-triangle' },
      { path: '/maintenance', label: 'Maintenance', icon: 'fa-wrench' },
    ],
  },
  {
    label: 'Analytics',
    links: [
      { path: '/statistics', label: 'Statistics', icon: 'fa-chart-bar' },
      { path: '/statistics/passenger-experience', label: 'Pax Experience', icon: 'fa-smile' },
      { path: '/statistics/carbon', label: 'Carbon', icon: 'fa-leaf' },
    ],
  },
  {
    label: 'AI Features',
    links: [
      { path: '/ai/gate-conflicts', label: 'Gate Conflicts', icon: 'fa-exclamation-circle' },
      { path: '/ai/connections', label: 'Connections', icon: 'fa-link' },
      { path: '/ai/weather-routing', label: 'Wx Routing', icon: 'fa-cloud-meatball' },
      { path: '/ai/crew-training', label: 'Cross-Training', icon: 'fa-graduation-cap' },
      { path: '/ai/cost-optimization', label: 'Cost Opt', icon: 'fa-dollar-sign' },
      { path: '/ai/incident-prediction', label: 'Risk', icon: 'fa-shield-alt' },
      { path: '/ai/baggage-recon', label: 'Bag Recon', icon: 'fa-search-location' },
      { path: '/ai/sustainability', label: 'Sustainability', icon: 'fa-leaf' },
      { path: '/ai/shift-handover', label: 'Shift Handover', icon: 'fa-clipboard-list' },
      { path: '/ai/predictive-maintenance', label: 'Predictive Maint', icon: 'fa-tools' },
      { path: '/ai/notam-briefing', label: 'NOTAM Briefing', icon: 'fa-broadcast-tower' },
      { path: '/ai/runway-simulator', label: 'Rwy Simulator', icon: 'fa-flask' },
      { path: '/ai/traffic-forecast', label: 'Traffic Forecast', icon: 'fa-chart-line' },
      { path: '/ai/emergency-response', label: 'Emergency', icon: 'fa-ambulance' },
      { path: '/ai/history', label: 'AI History', icon: 'fa-history' },
    ],
  },
];

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <i className="fas fa-plane-departure"></i>
        AirOps AI
      </Link>
      <div className={`navbar-links ${expanded ? 'expanded' : ''}`}>
        {linkGroups.map(group => (
          <span key={group.label} className="nav-group">
            <span className="nav-group-label">{group.label}</span>
            {group.links.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={location.pathname === link.path ? 'active' : ''}
                onClick={() => setExpanded(false)}
              >
                <i className={`fas ${link.icon}`}></i>
                {link.label}
              </Link>
            ))}
          </span>
        ))}
      </div>
      <div className="navbar-user">
        <span><i className="fas fa-user-circle"></i> {user?.name || 'User'}</span>
        <button className="btn-logout" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
