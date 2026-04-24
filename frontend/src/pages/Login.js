import React, { useState } from 'react';

function Login({ onLogin, api }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const autofill = () => {
    setEmail('admin@airport.com');
    setPassword('admin123');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <span className="icon"><i className="fas fa-plane-departure" style={{ color: '#38bdf8', fontSize: 48 }}></i></span>
          <h1>AI Airport Operations</h1>
          <p>Air Traffic & Ground Operations Management</p>
        </div>
        {error && <div className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><i className="fas fa-envelope"></i> Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-lock"></i> Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}
          </button>
        </form>
        <button className="btn-autofill" onClick={autofill}>
          <i className="fas fa-magic"></i> Auto-fill Demo Credentials
        </button>
      </div>
    </div>
  );
}

export default Login;
