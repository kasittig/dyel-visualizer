import ReactMarkdown from 'react-markdown';
import conjugateContent from '../../../CONJUGATE.md?raw';
import './ConjugateInfoPage.css';

export function ConjugateInfoPage() {
  return (
    <main className="conjugate-info-page" style={{ padding: '2rem', maxWidth: '700px' }}>
      <p style={{ marginBottom: '1.5rem' }}>
        <a href="." style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          ← Back to DYEL Visualizer
        </a>
      </p>
      <div className="conjugate-info-content">
        <ReactMarkdown>{conjugateContent}</ReactMarkdown>
      </div>
    </main>
  );
}
