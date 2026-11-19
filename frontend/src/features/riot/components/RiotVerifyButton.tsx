import { ShieldCheck } from 'lucide-react';
import { useId } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { env } from '@/config/env';
import { useAccounts } from '@/features/profile/hooks';
import { Icon } from '@/shared/components/Icon';
import { RIOT_MOCK_DISABLED_TEXT, RIOT_VERIFY_LABEL } from '@/shared/utils/copy';
import { useRiotAvailability } from '../hooks';

/**
 * «Verificar con Riot Games» (spec 014, RF-38, RF-39, RF-42).
 * - Oculto si el usuario ya tiene una cuenta de LoL verificada (RF-39).
 * - Modo simulado: desactivado con el texto explicativo; nunca simula verificación (RF-42).
 * - Instancia sin clave de Riot, cargando o con error: no se muestra nada (RF-38).
 * - Disponible: navega a `/verificar/riot` guardando la ruta actual para «Volver».
 */
export function RiotVerifyButton() {
  const accountsQuery = useAccounts();
  const availability = useRiotAvailability();
  const navigate = useNavigate();
  const location = useLocation();
  const mockNoteId = useId();

  // Mientras no sabemos si ya existe una cuenta de LoL verificada, no mostramos el botón.
  if (accountsQuery.isPending) return null;
  const hasVerifiedLol = accountsQuery.data?.some(
    (account) => account.gameId === 'lol' && account.verified,
  );
  if (hasVerifiedLol) return null;

  if (env.useMockApi) {
    return (
      <div className="stack-sm">
        <button type="button" className="btn btn--sm" disabled aria-describedby={mockNoteId}>
          <Icon as={ShieldCheck} size={13} />
          {RIOT_VERIFY_LABEL}
        </button>
        <span id={mockNoteId} className="note note--faint">
          {RIOT_MOCK_DISABLED_TEXT}
        </span>
      </div>
    );
  }

  if (availability.data?.available !== true) return null;

  const handleClick = () => {
    navigate(ROUTES.riotVerify, { state: { from: location.pathname } });
  };

  return (
    <button type="button" className="btn btn--sm" onClick={handleClick}>
      <Icon as={ShieldCheck} size={13} />
      {RIOT_VERIFY_LABEL}
    </button>
  );
}
