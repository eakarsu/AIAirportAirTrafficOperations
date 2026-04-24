import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GateAssignment from './pages/GateAssignment';
import GroundCrew from './pages/GroundCrew';
import DelayPrediction from './pages/DelayPrediction';
import BaggageFlow from './pages/BaggageFlow';
import RunwayUtilization from './pages/RunwayUtilization';
import FlightSchedule from './pages/FlightSchedule';
import WeatherDashboard from './pages/WeatherDashboard';
import IncidentReports from './pages/IncidentReports';
import MaintenanceLogs from './pages/MaintenanceLogs';
import Statistics from './pages/Statistics';
import Navbar from './components/Navbar';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.user) setUser(data.user); else logout(); })
        .catch(() => logout());
    }
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (!token) return <Login onLogin={login} api={API} />;

  return (
    <Router>
      <div className="app">
        <Navbar user={user} onLogout={logout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard token={token} api={API} />} />
            <Route path="/gates" element={<GateAssignment token={token} api={API} />} />
            <Route path="/crews" element={<GroundCrew token={token} api={API} />} />
            <Route path="/delays" element={<DelayPrediction token={token} api={API} />} />
            <Route path="/baggage" element={<BaggageFlow token={token} api={API} />} />
            <Route path="/runways" element={<RunwayUtilization token={token} api={API} />} />
            <Route path="/flights" element={<FlightSchedule token={token} api={API} />} />
            <Route path="/weather" element={<WeatherDashboard token={token} api={API} />} />
            <Route path="/incidents" element={<IncidentReports token={token} api={API} />} />
            <Route path="/maintenance" element={<MaintenanceLogs token={token} api={API} />} />
            <Route path="/statistics" element={<Statistics token={token} api={API} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
