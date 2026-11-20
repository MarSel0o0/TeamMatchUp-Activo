import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { queryKeys } from '@/app/providers/queryKeys';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/useAuth';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import { ApiError, api, isSessionCleared } from '@/services/api';
import { Working } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { LOADING_TEXT, NO_MESSAGE_TEXT, STEAM_NOTICES, STEAM_VERIFYING_TEXT } from '@/shared/utils/copy';
import type { SteamNotice } from '../notice';

/** Solo viaja lo que el servidor interpreta: el intento y la respuesta firmada de Steam. */
function steamQuery(params: URLSearchParams): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key === 'attempt' || key.startsWith('openid.')) query[key] = value;
  }
  return query;
}

function errorNotice(error: unknown): SteamNotice {
  const text = error instanceof ApiError && error.hasMessage && error.message ? error.message : NO_MESSAGE_TEXT;
  return { tone: 'error', text };
}

/**
 * Página a la que Steam devuelve al usuario (spec 013, D3, RF-4 a RF-9, RF-20). Completa la
 * verificación con la sesión y el comprobante anti-CSRF del usuario, como cualquier operación
 * protegida (RNF-6), y lo lleva al perfil con el aviso del resultado.
 *
 * Vive fuera de las rutas protegidas a propósito (plan, P13-17): sin sesión (RF-7, D11) primero
 * pide al servidor que descarte el intento y después manda a iniciar sesión **sin recordar esta
 * dirección**, así que después de entrar la verificación no continúa sola, y reabrir esta vuelta
 * cae en RF-6: hay que empezarla de nuevo.
 */
export default function SteamReturnPage() {
  useDocumentTitle('Verificando con Steam');

  const { status } = useAuth();
  const userId = useSessionUserId();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Una sola llamada por visita, también con el doble montaje del modo estricto: una respuesta de
  // Steam se usa una vez (RF-6).
  const started = useRef(false);
  // RF-7, D11: sin sesión, el intento se descarta en el servidor y solo después se va a iniciar
  // sesión. Una vez empezado, la visita termina en iniciar sesión aunque la sesión vuelva entretanto.
  const [abandon, setAbandon] = useState<'idle' | 'pending' | 'done'>('idle');

  useEffect(() => {
    if (status !== 'anonymous' || started.current) return;
    started.current = true;
    const attempt = params.get('attempt');
    if (attempt === null || attempt === '') {
      setAbandon('done');
      return;
    }
    setAbandon('pending');
    void api.steam.abandon(attempt).then(() => setAbandon('done'));
  }, [status, params]);

  useEffect(() => {
    if (status !== 'authenticated' || started.current) return;
    started.current = true;

    const finish = (notice: SteamNotice) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.gameSummaries(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMatches(userId) });
      navigate(ROUTES.profile, { replace: true, state: { steamNotice: notice } });
    };

    api.steam.complete(steamQuery(params)).then(
      (result) =>
        finish(
          result.outcome === 'verified'
            ? {
                tone: 'ok',
                text: STEAM_NOTICES.verified,
                ...(result.notice ? { extra: result.notice } : {}),
              }
            : { tone: 'ok', text: STEAM_NOTICES.cancelled },
        ),
      (error: unknown) => {
        // La sesión se perdió mientras tanto: el proveedor de sesión ya llevó a iniciar sesión.
        if (isSessionCleared(error)) return;
        finish(errorNotice(error));
      },
    );
  }, [status, params, navigate, queryClient, userId]);

  // Siempre sin `from`: tras entrar no se vuelve aquí (RF-7).
  const toLogin = <Navigate to={ROUTES.login} replace />;
  if (abandon === 'done') return toLogin;
  if (abandon === 'pending') return status === 'anonymous' ? <Working label={LOADING_TEXT} /> : toLogin;
  if (status === 'anonymous') return <Working label={LOADING_TEXT} />;
  if (status !== 'authenticated') return toLogin;

  return <Working label={STEAM_VERIFYING_TEXT} />;
}
