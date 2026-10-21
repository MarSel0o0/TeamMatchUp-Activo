import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { GAMES } from '@/domain/games';
import type { ProposeState } from '@/domain/playerSheet';
import {
  linkAccountToProposeText,
  PLAYER_NO_GAMES_TEXT,
  PROPOSAL_BLOCK_REASONS,
  PROPOSE_FAILED_TEXT,
  PROPOSE_LOADING_TEXT,
  PROPOSE_SESSION_LABEL,
} from '@/shared/utils/copy';

/** Texto bajo el botón bloqueado: motivo de RF-12 o texto de RF-23 (plan 3.2 y 4.6; P57). */
function reasonContent(state: Exclude<ProposeState, { kind: 'ready' }>): ReactNode {
  if (state.kind === 'loading') return PROPOSE_LOADING_TEXT;
  if (state.kind === 'failed') return PROPOSE_FAILED_TEXT;
  switch (state.reason) {
    case 'noTheirAccounts':
      return PLAYER_NO_GAMES_TEXT;
    case 'noOwnAccount':
      // Motivo 2: enlace a Configuración. Sin juego no hay motivo 2 (plan 3.2), rama defensiva.
      return state.gameId !== null ? (
        <Link to={ROUTES.settings}>{linkAccountToProposeText(GAMES[state.gameId].shortName)}</Link>
      ) : (
        PROPOSE_LOADING_TEXT
      );
    case 'noOwnHours':
      // Motivo 3: enlace a Configuración, donde se marcan las horas.
      return <Link to={ROUTES.settings}>{PROPOSAL_BLOCK_REASONS.noOwnHours}</Link>;
    default:
      return PROPOSAL_BLOCK_REASONS[state.reason];
  }
}

/**
 * "Proponer sesión" de la ficha (spec 008, RF-7, RF-10, RF-12, RF-21, RF-23, RNF-2; plan 4.4).
 *
 * Bloqueado: `aria-disabled` (no `disabled`, para que reciba el foco con Tab), clic sin efecto
 * y el motivo en una nota enlazada con `aria-describedby`. Listo: abre la agenda con la
 * propuesta en una entrada nueva del historial ("Atrás" vuelve a la ficha en su pestaña); la
 * agenda la aplica (007 RF-30). La referencia `proposing` impide navegar dos veces.
 */
export function ProposeSessionAction({ state }: { state: ProposeState }) {
  const navigate = useNavigate();
  const reasonId = useId();
  const proposing = useRef(false);

  if (state.kind === 'ready') {
    const { proposal } = state;
    return (
      <div className="player-propose">
        <button
          type="button"
          className="btn btn--pen"
          onClick={() => {
            if (proposing.current) return;
            proposing.current = true;
            navigate(ROUTES.schedule, { state: { proposal } });
          }}
        >
          {PROPOSE_SESSION_LABEL}
        </button>
      </div>
    );
  }

  return (
    <div className="player-propose">
      <button
        type="button"
        className="btn btn--pen"
        aria-disabled="true"
        aria-describedby={reasonId}
      >
        {PROPOSE_SESSION_LABEL}
      </button>
      <p id={reasonId} className="note">
        {reasonContent(state)}
      </p>
    </div>
  );
}
