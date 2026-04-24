import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard({ token, api }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ gates: 0, crews: 0, delays: 0, baggage: 0, runways: 0, flights: 0, weather: 0, incidents: 0, maintenance: 0 });

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${api}/api/gates`, { headers }).then(r => r.json()),
      fetch(`${api}/api/crews`, { headers }).then(r => r.json()),
      fetch(`${api}/api/delays`, { headers }).then(r => r.json()),
      fetch(`${api}/api/baggage`, { headers }).then(r => r.json()),
      fetch(`${api}/api/runways`, { headers }).then(r => r.json()),
      fetch(`${api}/api/flights`, { headers }).then(r => r.json()),
      fetch(`${api}/api/weather`, { headers }).then(r => r.json()),
      fetch(`${api}/api/incidents`, { headers }).then(r => r.json()),
      fetch(`${api}/api/maintenance`, { headers }).then(r => r.json()),
    ]).then(([gates, crews, delays, baggage, runways, flights, weather, incidents, maintenance]) => {
      setStats({
        gates: gates.length || 0,
        crews: crews.length || 0,
        delays: delays.length || 0,
        baggage: baggage.length || 0,
        runways: runways.length || 0,
        flights: flights.length || 0,
        weather: weather.length || 0,
        incidents: incidents.length || 0,
        maintenance: maintenance.length || 0,
      });
    }).catch(console.error);
  }, [token, api]);

  const features = [
    {
      title: 'Gate Assignment Optimization',
      description: 'AI-powered gate assignment optimization considering terminal proximity, aircraft size, connection times, and passenger flow.',
      icon: 'fa-door-open',
      color: '#38bdf8',
      path: '/gates',
      stat: stats.gates,
      statLabel: 'Active Assignments',
    },
    {
      title: 'Ground Crew Scheduling',
      description: 'Intelligent crew scheduling with shift optimization, specialization matching, fatigue management, and workload balancing.',
      icon: 'fa-users',
      color: '#22c55e',
      path: '/crews',
      stat: stats.crews,
      statLabel: 'Crew Teams',
    },
    {
      title: 'Delay Prediction & Rebooking',
      description: 'Predictive delay analytics with cascade analysis, automated rebooking suggestions, and passenger impact assessment.',
      icon: 'fa-clock',
      color: '#f59e0b',
      path: '/delays',
      stat: stats.delays,
      statLabel: 'Tracked Flights',
    },
    {
      title: 'Baggage Flow Tracking',
      description: 'Real-time baggage tracking with flow optimization, bottleneck detection, lost baggage prevention, and priority routing.',
      icon: 'fa-suitcase-rolling',
      color: '#a855f7',
      path: '/baggage',
      stat: stats.baggage,
      statLabel: 'Bags Tracked',
    },
    {
      title: 'Runway Utilization',
      description: 'Runway operations optimization with weather-aware scheduling, separation management, and throughput maximization.',
      icon: 'fa-road',
      color: '#ec4899',
      path: '/runways',
      stat: stats.runways,
      statLabel: 'Operations',
    },
    {
      title: 'Flight Schedule Board',
      description: 'Live departures and arrivals board with real-time status tracking, terminal and gate information.',
      icon: 'fa-plane',
      color: '#06b6d4',
      path: '/flights',
      stat: stats.flights,
      statLabel: 'Flights',
    },
    {
      title: 'Weather & NOTAMs',
      description: 'Current METAR/TAF weather reports, flight conditions, and active Notices to Airmen for all nearby airports.',
      icon: 'fa-cloud-sun',
      color: '#f97316',
      path: '/weather',
      stat: stats.weather,
      statLabel: 'Reports',
    },
    {
      title: 'Incident Reports',
      description: 'Safety and operational incident logging with severity tracking, investigation status, and resolution management.',
      icon: 'fa-exclamation-triangle',
      color: '#ef4444',
      path: '/incidents',
      stat: stats.incidents,
      statLabel: 'Incidents',
    },
    {
      title: 'Maintenance Logs',
      description: 'Equipment and facility maintenance tracking with work orders, scheduling, priority levels, and assignment management.',
      icon: 'fa-wrench',
      color: '#84cc16',
      path: '/maintenance',
      stat: stats.maintenance,
      statLabel: 'Work Orders',
    },
    {
      title: 'Airport Statistics',
      description: 'Comprehensive analytics dashboard with breakdowns across all operational areas, real-time KPIs, and weather overview.',
      icon: 'fa-chart-bar',
      color: '#6366f1',
      path: '/statistics',
      stat: stats.gates + stats.crews + stats.delays + stats.baggage + stats.runways,
      statLabel: 'Data Points',
    },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <h1><i className="fas fa-plane-departure" style={{ color: '#38bdf8' }}></i> Airport Operations Center</h1>
        <p>AI-Powered Air Traffic & Ground Operations Management System</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.gates}</div>
          <div className="stat-label">Gate Assignments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.crews}</div>
          <div className="stat-label">Ground Crews</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.delays}</div>
          <div className="stat-label">Flight Delays</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.baggage}</div>
          <div className="stat-label">Bags Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.runways}</div>
          <div className="stat-label">Runway Ops</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.flights}</div>
          <div className="stat-label">Flights</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.weather}</div>
          <div className="stat-label">Weather Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.incidents}</div>
          <div className="stat-label">Incidents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.maintenance}</div>
          <div className="stat-label">Work Orders</div>
        </div>
      </div>

      <div className="dashboard-cards">
        {features.map(feature => (
          <div
            key={feature.path}
            className="feature-card"
            style={{ '--card-color': feature.color }}
            onClick={() => navigate(feature.path)}
          >
            <div className="card-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
              <i className={`fas ${feature.icon}`}></i>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <div className="card-stats">
              <div className="card-stat">
                <strong>{feature.stat}</strong> {feature.statLabel}
              </div>
              <div className="card-stat">
                <i className="fas fa-arrow-right" style={{ color: feature.color }}></i> View Details
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
