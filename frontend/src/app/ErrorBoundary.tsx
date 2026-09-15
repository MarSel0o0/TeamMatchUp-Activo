import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Última red de seguridad: evita que un error de render deje la pantalla en
 * blanco y ofrece recargar.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error no controlado en la interfaz:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="empty-state" style={{ minHeight: '100vh', justifyContent: 'center' }}>
        <span className="empty-state__icon" aria-hidden="true">
          💥
        </span>
        <div className="stack-sm">
          <h1 className="page-title">Algo se rompió</h1>
          <p className="muted">{this.state.error.message}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Recargar la aplicación
        </button>
      </div>
    );
  }
}
