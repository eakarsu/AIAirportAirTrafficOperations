import React, { useEffect, useRef, useState } from 'react';

function Login({ onLogin, api }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);
  const demoEmail = process.env.REACT_APP_DEMO_EMAIL;
  const demoPassword = process.env.REACT_APP_DEMO_PASSWORD;
  const demoLoginAvailable = process.env.NODE_ENV !== 'production'
    && process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'true'
    && Boolean(demoEmail && demoPassword);

  const signIn = async (loginEmail, loginPassword) => {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/auth/login`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (pending.current !== controller || controller.signal.aborted) return;
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (!data.token || !data.user?.id) throw new Error('Sign-in returned an incomplete session. Please retry.');
      onLogin(data.token, data.user);
    } catch (err) {
      if (pending.current === controller && !controller.signal.aborted) setError(err.message);
    } finally {
      if (pending.current === controller) { pending.current = null; setLoading(false); }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn(email, password);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <span className="icon"><i className="fas fa-plane-departure" style={{ color: '#38bdf8', fontSize: 48 }}></i></span>
          <h1>AI Airport Operations</h1>
          <p>Air Traffic & Ground Operations Management</p>
        </div>
        {error && <div role="alert" className="login-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
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
          {demoLoginAvailable && <button
            type="button"
            onClick={() => signIn(demoEmail, demoPassword)}
            disabled={loading}
            aria-label="Log In as Demo"
            style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
          >
            Log In as Demo
          </button>}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
