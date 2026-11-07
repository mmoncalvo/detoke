import { Component, type ReactNode } from 'react';
import { ErrorState } from './States';

/** Shows a way out instead of a blank page when a screen crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <ErrorState message="Algo salió mal en esta pantalla." onRetry={() => window.location.reload()} />
      </div>
    );
  }
}
