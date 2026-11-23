import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AppButton } from '@/shared/components/AppButton';
import { AppMantineProvider } from './providers/AppMantineProvider';

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

    // Esta pantalla vive fuera de los proveedores de la aplicación: lleva el suyo, con el tema vigente.
    const scheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    return (
      <AppMantineProvider colorScheme={scheme}>
        <div className="blank" style={{ minHeight: '100vh', justifyContent: 'center' }}>
          <div className="stack-sm">
            <h1 className="doc-title">Algo se rompió</h1>
            <p className="note note--faint">{this.state.error.message}</p>
          </div>
          <AppButton tone="pen" onClick={() => window.location.reload()}>
            Recargar la aplicación
          </AppButton>
        </div>
      </AppMantineProvider>
    );
  }
}
