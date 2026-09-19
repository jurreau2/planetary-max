import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = 'https://planetary-max1.jurreau2.workers.dev/api';
const endpoints = ['/status', '/state', '/snapshot', '/planet', '/kernel', '/umbrella', '/quantum'];

function Panel({ title, data }) {
  return <section className="panel"><h2>{title}</h2><pre>{JSON.stringify(data, null, 2)}</pre></section>;
}

export default function App() {
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const entries = await Promise.all(endpoints.map(async path => [path, await (await fetch(`${API_BASE_URL}${path}`)).json()]));
      setData(Object.fromEntries(entries));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  const status = data['/status'];
  return <main className="shell"><header className="hero"><div><p className="eyebrow">MAX-OS-1 / PORTAL</p><h1>Portal-OS Control Surface</h1></div><button onClick={load}>Refresh</button></header>{error && <p className="error">{error}</p>}<div className="statusbar"><strong>{status?.status ?? 'connecting'}</strong><span>Mode: {status?.mode ?? '—'}</span><span>Umbrella: {status?.umbrella ?? '—'}</span><span>Tick: {status?.tick ?? '—'}</span></div><div className="grid"><Panel title="Planetary State" data={data['/state']} /><Panel title="Snapshot" data={data['/snapshot']} /><Panel title="Kernel" data={data['/kernel']} /><Panel title="Umbrella / Apex Governance" data={data['/umbrella']} /><Panel title="Quantum" data={data['/quantum']} /><Panel title="Planet Synthesis" data={data['/planet']} /></div></main>;
}
