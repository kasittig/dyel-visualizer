import { useIndexData } from './useIndexData';
import styles from './IndexPage.module.css';

export function IndexPage() {
  const state = useIndexData();

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>DYEL Visualizer</h1>
      </div>
      {state.status === 'loading' && <p>Loading…</p>}
      {state.status === 'error' && <p className={styles.errorMsg}>{state.message}</p>}
      {state.status === 'success' && (
        <ul className={styles.list}>
          {state.entries.map(({ name, url }) => (
            <li key={url} className={styles.listItem}>
              <a href={`./?sheet=${encodeURIComponent(url)}`} className={styles.accentLink}>
                {name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
