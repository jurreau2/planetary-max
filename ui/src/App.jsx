import { useCallback, useEffect, useState } from 'react';

const initialStatus = {
  status: 'connecting',
  mode: '—',
  umbrella: '—',
  worker: 'planetary-max',
};

function App() {
  const [system, setSystem] = useState(initialStatus);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      setError('');
      const response = await fetch("/api/status");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSystem({
        status: data.status ?? 'unknown',
        mode: data.mode ?? 'unknown',
        umbrella: data.umbrella ?? 'unknown',
        worker: data.worker ?? 'planetary-max',
      });
      setLastUpdated(new Date());
    } catch (requestError) {
      setSystem((current) => ({ ...current, status: 'offline' }));
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 30000);
    return () => clearInterval(timer);
  }, [loadStatus]);

  const connected = system.status !== 'offline' && system.status !== 'connecting';

  return (
    <main className="shell">
      <section className="card" aria-labelledby="title">
        <header className="header">
          <div>
            <p className="eyebrow">MAX-OS-1 / PORTAL</p>
            <h1 id="title">Portal-OS</h1>
          </div>
          <div className={`connection ${connected ? 'online' : ''}`}>
            <span className="dot" />
            {connected ? 'Live' : system.status === 'connecting' ? 'Connecting' : 'Offline'}
          </div>
        </header>

        <div className="hero">
          <p className="label">System status</p>
          <p className="status">{system.status}</p>
          {error && <p className="error">Unable to reach the Worker: {error}</p>}
        </div>

        <dl className="grid">
          <div><dt>Mode</dt><dd>{system.mode}</dd></div>
          <div><dt>Umbrella</dt><dd>{system.umbrella}</dd></div>
          <div><dt>Worker</dt><dd>{system.worker}</dd></div>
        </dl>

        <footer>
          <span>Polling every 30 seconds</span>
          <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Awaiting telemetry'}</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
