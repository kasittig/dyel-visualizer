import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Try refreshing the page.</p>
          <pre style={{ color: 'red', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
        </main>
      );
    }
    return this.props.children;
  }
}
