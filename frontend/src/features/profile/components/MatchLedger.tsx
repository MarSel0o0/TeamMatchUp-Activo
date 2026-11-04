import type { CSSProperties } from 'react';
import type { MatchRecord } from '@/domain/types';
import { DemoTag } from '@/shared/components/DemoTag';
import { timeAgo } from '@/shared/utils/format';
import './matchLedger.css';

interface MatchLedgerProps {
  matches: MatchRecord[];
  /** La cuenta lleva la marca de datos simulados: la etiqueta va junto a las partidas (RF-11). */
  simulated?: boolean;
}

/** Historial de partidas: una fila por partida, con su variación de rango. */
export function MatchLedger({ matches, simulated = false }: MatchLedgerProps) {
  if (matches.length === 0) {
    return (
      <p className="note note--faint">
        Todavía no hay partidas registradas en esta cuenta.
      </p>
    );
  }

  return (
    <>
      {simulated ? <DemoTag /> : null}
      <table className="ledger">
        <thead>
          <tr>
            <th scope="col" className="label">
              Res.
            </th>
            <th scope="col" className="label">
              Partida
            </th>
            <th scope="col" className="label ledger__right">
              Rango
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => (
            <tr key={match.id} style={{ '--i': index } as CSSProperties}>
              <td>
                <span className="ledger__result" data-win={match.result === 'win' || undefined}>
                  {match.result === 'win' ? 'V' : 'D'}
                </span>
              </td>
              <td>
                <span className="ledger__summary">{match.summary}</span>
                <span className="note note--faint">
                  {timeAgo(match.playedAt)} · {match.durationMinutes} min
                </span>
              </td>
              <td className="ledger__right">
                <span className="ledger__delta" data-up={match.rankDelta >= 0 || undefined}>
                  {match.rankDelta >= 0 ? '+' : '−'}
                  {Math.abs(match.rankDelta)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
