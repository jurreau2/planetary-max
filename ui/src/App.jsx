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
  const [umbrellaUpdating, setUmbrellaUpdating] = useState(false);

  const request = useCallback(async (path, options = {}) => {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
    } catch {
      throw new Error('Network error. Check the Worker connection and try again.');
    }

    let body;
    try { body = await response.json(); }
    catch { throw new Error(`Worker returned invalid JSON (${response.status}).`); }
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
    return body;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [entries, auth] = await Promise.all([
        Promise.all(endpoints.map(async path => [path, await request(path)])),
        request('/auth/status'),
      ]);
      setData(Object.fromEntries(entries));
      setUser(auth.authenticated ? auth : null);
      setError('');
    } catch (e) {
      if (e.message.includes('Authentication required')) {
        localStorage.removeItem('portal-os-token');
        setToken('');
        setUser(null);
      }
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
    try { await request('/auth/logout', { method: 'POST' }); } catch { /* Clear local credentials even if the Worker is unavailable. */ }
    localStorage.removeItem('portal-os-token');
    setToken(''); setUser(null); setData({});
  }

  async function toggleUmbrella() {
    const previous = data['/umbrella']?.mode === 'disabled' ? 'disabled' : 'enabled';
    const next = previous === 'enabled' ? 'disabled' : 'enabled';
    const optimisticState = data['/state'] ? {
      ...data['/state'],
      umbrella: { ...(data['/state'].umbrella || {}), mode: next },
      apex: { ...(data['/state'].apex || {}), enforcement: next === 'enabled' },
    } : data['/state'];
    setData(current => ({ ...current, '/umbrella': { ...(current['/umbrella'] || {}), mode: next }, '/state': optimisticState }));
    setUmbrellaUpdating(true);
    setError('');
    try { await request('/umbrella', { method: 'POST', body: JSON.stringify({ mode: next }) }); await load(); }
    catch (e) {
      setData(current => ({ ...current, '/umbrella': { ...(current['/umbrella'] || {}), mode: previous }, '/state': data['/state'] }));
      setError(`Umbrella update failed: ${e.message}`);
    } finally { setUmbrellaUpdating(false); }
  }

  if (!token) return <main className="shell"><section className="panel auth-panel"><p className="eyebrow">MAX-OS-1 / PORTAL</p><h1>Portal-OS Login</h1><form onSubmit={login}><input aria-label="Username" placeholder="Username" value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} required /><input aria-label="Password" type="password" placeholder="Password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} required /><button type="submit">Sign in</button></form>{error && <p className="error" role="alert">{error}</p>}</section></main>;

  const status = data['/status'];
  const umbrella = data['/umbrella'];
  const globalState = data['/state'];
  const enabled = umbrella?.mode === 'enabled';
  const lastUpdated = globalState?.updatedAt || umbrella?.updatedAt;
  return <main className="shell"><header className="hero"><div><p className="eyebrow">MAX-OS-1 / PORTAL</p><h1>Portal-OS Control Surface</h1>{user && <p>Signed in as {user.user} ({user.role})</p>}</div><div><button onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button><button onClick={logout}>Log out</button></div></header><section className="panel umbrella-panel"><div className="panel-heading"><div><p className="eyebrow">GLOBAL CONTROL</p><h2>Umbrella</h2></div><span className={`state-badge ${enabled ? 'enabled' : 'disabled'}`}>{enabled ? 'ENABLED' : 'DISABLED'}</span></div><div className="umbrella-metrics"><span className={`enforcement ${globalState?.apex?.enforcement ? 'governing' : 'idle'}`}><strong>{globalState?.apex?.enforcement ? 'Governing' : 'Idle'}</strong><small>Apex enforcement</small></span><span><strong>Tick: {globalState?.tick ?? '—'}</strong><small>Global state</small></span><span><strong>{lastUpdated || '—'}</strong><small>Last updated</small></span></div><button className="toggle-button" onClick={toggleUmbrella} disabled={umbrellaUpdating}>{umbrellaUpdating ? <><span className="spinner" aria-hidden="true" /> Updating…</> : `Turn ${enabled ? 'off' : 'on'} Umbrella`}</button></section>{error && <p className="error banner" role="alert">{error}</p>}{status && <Panel title="Status" data={status} />}{Object.entries(data).filter(([key]) => key !== '/status' && key !== '/umbrella').map(([key, value]) => <Panel key={key} title={key} data={value} />)}</main>;
}
