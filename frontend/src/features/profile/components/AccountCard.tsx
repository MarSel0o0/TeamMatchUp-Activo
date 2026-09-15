import { formatRank, getGame } from '@/domain/games';
import type { GameAccount } from '@/domain/types';
import { timeAgo } from '@/shared/utils/format';
import './accountCard.css';

interface AccountCardProps {
  account: GameAccount;
  onSync?: (accountId: string) => void;
  onUnlink?: (accountId: string) => void;
  syncing?: boolean;
}

/** Ficha de una cuenta vinculada, con su rango vigente y acciones. */
export function AccountCard({ account, onSync, onUnlink, syncing = false }: AccountCardProps) {
  const game = getGame(account.gameId);

  return (
    <article className="account-card" style={{ borderLeftColor: game.accent }}>
      <div className="account-card__main">
        <div className="row-between">
          <div className="stack-sm">
            <strong>{game.name}</strong>
            <span className="mono muted">{account.handle}</span>
          </div>
          <span className={`badge ${account.verified ? 'badge--success' : 'badge--warning'}`}>
            {account.verified ? '✓ Rango verificado' : 'Sin verificar'}
          </span>
        </div>

        <div className="account-card__stats">
          <div>
            <span className="faint">Rango actual</span>
            <strong style={{ color: game.accent }}>
              {formatRank(account.gameId, account.currentRank)}
            </strong>
          </div>
          <div>
            <span className="faint">Región</span>
            <strong>{account.region}</strong>
          </div>
          <div>
            <span className="faint">Última lectura</span>
            <strong>{timeAgo(account.lastSyncedAt)}</strong>
          </div>
        </div>

        <span className="faint">Fuente: {game.source}</span>
      </div>

      {onSync || onUnlink ? (
        <div className="account-card__actions">
          {onSync ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onSync(account.id)}
              disabled={syncing}
            >
              {syncing ? 'Actualizando…' : 'Actualizar rango'}
            </button>
          ) : null}
          {onUnlink ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => onUnlink(account.id)}
            >
              Desvincular
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
