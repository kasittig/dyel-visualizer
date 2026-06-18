import { useIndexData } from '../hooks/useIndexData';

export function IndexPage() {
  const state = useIndexData();

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'left' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>DYEL Visualizer</h1>
      </div>
      {state.status === 'loading' && <p>Loading…</p>}
      {state.status === 'error' && <p style={{ color: 'red' }}>{state.message}</p>}
      {state.status === 'success' && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0' }}>
          {state.entries.map(({ name, url }) => (
            <li key={url} style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
              <a href={`./?sheet=${encodeURIComponent(url)}`} style={{ color: 'var(--accent)' }}>
                {name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
