import { destinationHref } from '../shared/pageRouting';
import styles from './App.module.css';

type BlockingState = 'unconnected' | 'loading' | 'error' | 'empty';

const STATE_COPY: Record<BlockingState, { title: string; description: string }> = {
  unconnected: {
    title: 'Connect your training log',
    description:
      'Add your training data to unlock strength trends, lift analysis, accessories, and personalized calculations.',
  },
  loading: {
    title: 'Loading your training',
    description: 'Your training log is being prepared for analysis.',
  },
  error: {
    title: 'Your training log could not be loaded',
    description:
      'Your saved settings are intact. Check the connection or validate the log, then try again.',
  },
  empty: {
    title: 'No training sets to analyze yet',
    description:
      'The training log connected successfully, but it does not contain usable lift or accessory sets yet.',
  },
};

export function MyTrainingGate({ state }: { state: BlockingState }) {
  const copy = STATE_COPY[state];
  return (
    <section className={styles.trainingGate} aria-labelledby="my-training-state-title">
      <p className={styles.trainingEyebrow}>My Training</p>
      <h1 id="my-training-state-title">{copy.title}</h1>
      <p>{copy.description}</p>
      {state !== 'loading' && (
        <a className={styles.trainingAction} href={destinationHref('setup')}>
          {state === 'unconnected' ? 'Connect training data' : 'Open Data & Setup'}
        </a>
      )}
    </section>
  );
}

export function CachedTrainingNotice({
  requestStatus,
  lastUpdatedAt,
}: {
  requestStatus: 'idle' | 'loading' | 'success' | 'error';
  lastUpdatedAt: Date | null;
}) {
  return (
    <aside className={styles.cachedNotice} role="status">
      <strong>Showing saved training data.</strong>{' '}
      {requestStatus === 'loading'
        ? 'Checking for updates…'
        : requestStatus === 'error'
          ? 'The latest refresh failed.'
          : 'A fresh copy is not available yet.'}
      {lastUpdatedAt && ` Last updated ${lastUpdatedAt.toLocaleString()}.`}{' '}
      <a href={destinationHref('setup')}>Manage data</a>
    </aside>
  );
}
