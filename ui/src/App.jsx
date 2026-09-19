import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = 'https://planetary-max1.jurreau2.workers.dev/api';
const endpoints = ['/status', '/state', '/kernel', '/umbrella', '/quantum', '/planetary'];

function Panel({ title, data }) {
  return <section className="panel"><h2>{title}</h2><pre>{JSON.stringify(data, null, 2)}</pre></section>;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('sessionToken') || '');
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [umbrellaUpdating, setUmbrellaUpdating] = useState(false);

  const fetchWithAuth = useCallback(async (path, options = {}, authToken = token) => {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(options.headers || {}),
        },
      });
    } catch {
      throw new Error('Network error. Check the Worker connection and try again.');
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error(`Worker returned invalid JSON (${response.status}).`);
    }
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
    return body;
  }, [token]);

  const clearSession = useCallback(() => {
    localStorage.removeItem('sessionToken');
    setToken('');
    setUser(null);
    setData({});
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [entries, auth] = await Promise.all([
        Promise.all(endpoints.map(async path => [path, await fetchWithAuth(path)])),
        fetchWithAuth('/auth/status'),
      ]);
      setData(Object.fromEntries(entries));
      setUser(auth.authenticated ? auth : null);
      setError('');
    } catch (e) {
      if (e.message.includes('Authentication required')) clearSession();
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clearSession, fetchWithAuth, token]);

  useEffect(() => {
    if (!token) return undefined;
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, token]);

  async function login(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }, '');
      localStorage.setItem('sessionToken', result.token);
      setToken(result.token);
      setCredentials({ username: '', password: '' });
    } catch (e) {
      setError(e.message);
    }
  }

  async function logout() {
    try { await fetchWithAuth('/auth/logout', { method: 'POST' }); } catch { /* Clear local session regardless. */ }
    clearSession();
  }

  async function toggleUmbrella() {
    const previous = data['/umbrella']?.mode === 'disabled' ? 'disabled' : 'enabled';
    const next = previous === 'enabled' ? 'disabled' : 'enabled';
    const previousState = data['/state'];
    setUmbrellaUpdating(true);
    setError('');
    setData(current => ({
      ...current,
      '/umbrella': { mode: next },
      '/state': previousState && {
        ...previousState,
        umbrella: { ...(previousState.umbrella || {}), mode: next },
        apex: { ...(previousState.apex || {}), enforcement: next === 'enabled' },
      },
    }));

    try {
      await fetchWithAuth('/umbrella', { method: 'POST', body: JSON.stringify({ mode: next }) });
      await load();
    } catch (e) {
      setData(current => ({
        ...current,
        '/umbrella': { mode: previous },
        '/state': previousState,
      }));
      setError(`Umbrella update failed: ${e.message}`);
    } finally {
      setUmbrellaUpdating(false);
    }
  }

  if (!token) return <main className="shell"><section className="panel auth-panel"><p className="eyebrow">MAX-OS-1 / PORTAL</p><h1>Portal-OS Login</h1><form onSubmit={login}><input aria-label="Username" placeholder="Username" value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} required /><input aria-label="Password" type="password" placeholder="Password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} required /><button type="submit">Sign in</button></form>{error && <p className="error" role="alert">{error}</p>}</section></main>;

  const umbrella = data['/umbrella'];
  const globalState = data['/state'];
  const enabled = umbrella?.mode === 'enabled';
  return <main className="shell"><header className="hero"><div><p className="eyebrow">MAX-OS-1 / PORTAL</p><h1>Portal-OS Control Surface</h1><p>Logged in as {user?.user || 'admin'}{user?.role ? ` (${user.role})` : ''}</p></div><div><button onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button><button onClick={logout}>Log out</button></div></header><section className="panel umbrella-panel"><div className="panel-heading"><div><p className="eyebrow">GLOBAL CONTROL</p><h2>Umbrella</h2></div><span className={`state-badge ${enabled ? 'enabled' : 'disabled'}`}>{enabled ? 'ENABLED' : 'DISABLED'}</span></div><div className="umbrella-metrics"><span className={globalState?.apex?.enforcement ? 'governing' : 'idle'}><strong>{globalState?.apex?.enforcement ? 'Governing' : 'Idle'}</strong><small>Apex enforcement</small></span><span><strong>Tick: {globalState?.tick ?? '—'}</strong><small>Global state</small></span><span><strong>Last updated: {globalState?.updatedAt || '—'}</strong><small>Worker state</small></span></div><button className="toggle-button" onClick={toggleUmbrella} disabled={umbrellaUpdating}>{umbrellaUpdating ? <><span className="spinner" aria-hidden="true" /> Updating…</> : `Turn ${enabled ? 'off' : 'on'} Umbrella`}</button></section>{error && <p className="error banner" role="alert">{error}</p>}{Object.entries(data).map(([key, value]) => <Panel key={key} title={key} data={value} />)}</main>;
}
