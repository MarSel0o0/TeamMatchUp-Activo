import { RefreshCw, Unlink } from 'lucide-react';
import { formatRank, getGame } from '@/domain/games';
import type { GameAccount } from '@/domain/types';
import { Icon } from '@/shared/components/Icon';
import { Stamp } from '@/shared/components/Stamp';
import { timeAgo } from '@/shared/utils/format';
import './accountRow.css';

interface AccountRowProps {
  account: GameAccount;
  onSync?: (accountId: string) => void;
  onUnlink?: (accountId: string) => void;
  syncing?: boolean;
}

/** Asiento de una cuenta vinculada: identificador, rango sellado y última lectura. */
export function AccountRow({ account, onSync, onUnlink, syncing = false }: AccountRowProps) {
  const game = getGame(account.gameId);

  return (
    <article className="account">
      <div className="account__title">
        <div className="grow">
          <h3 className="sheet-title" style={{ color: game.accent }}>
            {game.name}
          </h3>
          <p className="note note--faint">{account.handle}</p>
        </div>
        <Stamp
          tone={account.verified ? 'sealed' : 'warn'}
          pressKey={`${account.id}-${account.lastSyncedAt}`}
        >
          {account.verified ? 'Verificado' : 'Sin verificar'}
        </Stamp>
      </div>

      <dl className="account__entries">
        <div>
          <dt className="label">Rango vigente</dt>
          <dd className="num" style={{ color: game.accent }}>
            {formatRank(account.gameId, account.currentRank)}
          </dd>
        </div>
        <div>
          <dt className="label">Región</dt>
          <dd className="num">{account.region}</dd>
        </div>
        <div>
          <dt className="label">Última lectura</dt>
          <dd className="num">{timeAgo(account.lastSyncedAt)}</dd>
        </div>
        <div>
          <dt className="label">Fuente</dt>
          <dd className="note">{game.source}</dd>
        </div>
      </dl>

      {onSync || onUnlink ? (
        <div className="account__actions">
          {onSync ? (
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => onSync(account.id)}
              disabled={syncing}
            >
              {syncing ? <span className="btn__spin" /> : <Icon as={RefreshCw} size={13} />}
              {syncing ? 'Leyendo…' : 'Volver a leer el rango'}
            </button>
          ) : null}
          {onUnlink ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => onUnlink(account.id)}
            >
              <Icon as={Unlink} size={13} />
              Desvincular
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
