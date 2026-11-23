import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { outcomeLabel, scoreLabel } from '@/domain/leetifyMatches';
import { formatMatchDate } from '@/domain/riotDisplay';
import type { GameId } from '@/domain/types';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import { api } from '@/services/api';
import { LeetifyAttribution } from '@/shared/components/LeetifyAttribution';
import {
  LEETIFY_MATCHES_EMPTY,
  LEETIFY_MATCHES_LABEL,
  LEETIFY_MATCHES_LOADING,
} from '@/shared/utils/copy';
import './matchLedger.css';

interface LeetifyMatchListProps {
  /** Dueño de la cuenta (su id real o `me`). */
  ownerId: string;
  gameId: GameId;
  /** SteamID64 de la cuenta, para el enlace «View on Leetify». */
  handle: string;
}

/**
 * Bloque de partidas de una cuenta de CS2 verificada con Steam (spec 019): se piden en vivo a
 * Leetify al montar y nunca se guardan (RF-1, RF-6). Mientras cargan, el resto de la ficha ya se
 * ve (RF-10). Un fallo, la falta de perfil o una lista vacía muestran el mismo texto (RF-7, RF-8).
 */
export function LeetifyMatchList({ ownerId, gameId, handle }: LeetifyMatchListProps) {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.leetifyMatches(userId, ownerId, gameId),
    queryFn: () => api.users.getLeetifyMatches(ownerId, gameId),
    enabled: userId !== null,
  });

  if (query.isPending) {
    return (
      <p className="note note--faint" role="status">
        {LEETIFY_MATCHES_LOADING}
      </p>
    );
  }

  const matches = query.data?.available ? query.data.matches : [];
  if (matches.length === 0) {
    return <p className="note note--faint">{LEETIFY_MATCHES_EMPTY}</p>;
  }

  return (
    <>
      <span className="leetify-matches__source">
        <span className="note note--faint">{LEETIFY_MATCHES_LABEL}</span>
        <LeetifyAttribution handle={handle} />
      </span>
      <table className="ledger">
        <thead>
          <tr>
            <th scope="col" className="label">
              Fecha
            </th>
            <th scope="col" className="label">
              Mapa
            </th>
            <th scope="col" className="label">
              Resultado
            </th>
            <th scope="col" className="label ledger__right">
              Marcador
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => (
            <tr key={`${match.id}-${index}`} style={{ '--i': index } as CSSProperties}>
              <td>{formatMatchDate(match.finishedAt)}</td>
              <td>
                <span className="ledger__summary">{match.map}</span>
              </td>
              <td>
                <span className="ledger__outcome" data-outcome={match.outcome}>
                  {outcomeLabel(match.outcome)}
                </span>
              </td>
              <td className="ledger__right">{scoreLabel(match.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
