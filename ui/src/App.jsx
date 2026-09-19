import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = 'https://planetary-max1.jurreau2.workers.dev/api';
const endpoints = ['/status', '/state', '/snapshot', '/planet', '/kernel', '/umbrella', '/quantum'];

function Panel({ title, data }) {
  return <section className="panel"><h2>{title}</h2><pre>{JSON.stringify(data, null, 2)}</pre></section>;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('portal-os-token') || '');
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (path, options = {}) => {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const entries = await Promise.all(endpoints.map(async path => [path, await request(path)]));
      setData(Object.fromEntries(entries));
      setUser((await request('/auth/status')).user ? await request('/auth/status') : null);
      setError('');
    } catch (e) {
      if (e.message.includes('Authentication required')) { localStorage.removeItem('portal-os-token'); setToken(''); setUser(null); }
      setError(e.message);
    } finally { setLoading(false); }
  }, [request, token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  async function login(event) {
    event.preventDefault();
    try {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      localStorage.setItem('portal-os-token', result.token);
      setToken(result.token);
      setCredentials({ username: '', password: '' });
      setError('');
    } catch (e) { setError(e.message); }
  }

  async function logout() {
    try { await request('/auth/logout', { method: 'POST' }); } catch { /* local logout still clears the session */ }
    localStorage.removeItem('portal-os-token'); setToken(''); setUser(null); setData({});
  }

  async function toggleUmbrella() {
    const current = data['/umbrella']?.mode || 'enabled';
    try { await request('/umbrella', { method: 'POST', body: JSON.stringify({ mode: current === 'enabled' ? 'disabled' : 'enabled' }) }); await load(); }
    catch (e) { setError(e.message); }
  }

  if (!token) return <main className="shell"><section className="panel"><p className="eyebrow">MAX-OS-1 / PORTAL</p><h1>Portal-OS Login</h1><form onSubmit={login}><input aria-label="Username" placeholder="Username" value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} required /><input aria-label="Password" type="password" placeholder="Password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} required /><button type="submit">Sign in</button></form>{error && <p className="error">{error}</p>}</section></main>;

  const status = data['/status'];
  const umbrella = data['/umbrella'];
  return <main className="shell"><header className="hero"><div><p className="eyebrow">MAX-OS-1 / PORTAL</p><h1>Portal-OS Control Surface</h1>{user && <p>Signed in as {user.user} ({user.role})</p>}</div><div><button onClick={load} disabled={loading}>Refresh</button><button onClick={logout}>Log out</button></div></header><section className="panel"><h2>Umbrella</h2><p>Mode: <strong>{umbrella?.mode || 'unknown'}</strong></p><button onClick={toggleUmbrella}>{umbrella?.mode === 'enabled' ? 'Disable' : 'Enable'} Umbrella</button></section>{error && <p className="error">{error}</p>}{status && <Panel title="Status" data={status} />}{Object.entries(data).filter(([key]) => key !== '/status' && key !== '/umbrella').map(([key, value]) => <Panel key={key} title={key} data={value} />)}</main>;
}
