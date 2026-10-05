import { MotionConfig } from 'motion/react';
import { PointerSpotlight } from '@/shared/motion/PointerSpotlight';
import { ErrorBoundary } from './ErrorBoundary';
import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router';

export function App() {
  return (
    <ErrorBoundary>
      {/* Con «reducir movimiento» activo en el sistema, Motion deja solo los
          fundidos de opacidad y apaga desplazamientos y escalas. */}
      <MotionConfig reducedMotion="user">
        <AppProviders>
          <PointerSpotlight />
          <AppRouter />
        </AppProviders>
      </MotionConfig>
    </ErrorBoundary>
  );
}
