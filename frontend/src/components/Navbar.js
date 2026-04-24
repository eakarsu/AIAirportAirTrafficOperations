import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Dashboard', icon: 'fa-tachometer-alt' },
    { path: '/gates', label: 'Gates', icon: 'fa-door-open' },
    { path: '/crews', label: 'Crews', icon: 'fa-users' },
    { path: '/delays', label: 'Delays', icon: 'fa-clock' },
    { path: '/baggage', label: 'Baggage', icon: 'fa-suitcase-rolling' },
    { path: '/runways', label: 'Runways', icon: 'fa-road' },
    { path: '/flights', label: 'Flights', icon: 'fa-plane' },
    { path: '/weather', label: 'Weather', icon: 'fa-cloud-sun' },
    { path: '/incidents', label: 'Incidents', icon: 'fa-exclamation-triangle' },
    { path: '/maintenance', label: 'Maintenance', icon: 'fa-wrench' },
    { path: '/statistics', label: 'Stats', icon: 'fa-chart-bar' },
  ];

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <i className="fas fa-plane-departure"></i>
        AirOps AI
      </Link>
      <div className="navbar-links">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={location.pathname === link.path ? 'active' : ''}
          >
            <i className={`fas ${link.icon}`}></i>
            {link.label}
          </Link>
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
