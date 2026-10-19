import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { Failure, Working } from '@/shared/components/States';
import { LOADING_TEXT, NO_MESSAGE_TEXT } from '@/shared/utils/copy';

/**
 * Puerta de la consulta de sesión (RF-5, RF-28, RNF-7). Mientras la consulta está
 * en curso muestra solo «Cargando…», y si falla, la pantalla de error con
 * «Reintentar»; en ambos casos el router ni se monta, así que ninguna ruta
 * (login, vistas protegidas, entrada o «no encontrada») se ve antes de la respuesta.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { status, sessionError, retry } = useAuth();

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center' }}>
        <Working label={LOADING_TEXT} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center' }}>
        <Failure
          title="No se pudo comprobar tu sesión"
          error={new Error(sessionError ?? NO_MESSAGE_TEXT)}
          onRetry={retry}
          autoFocusRetry
          role="alert"
        />
      </div>
    );
  }

  return <>{children}</>;
}
