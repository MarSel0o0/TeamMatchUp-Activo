import { RefreshCw, Unlink } from 'lucide-react';
import { formatRank, getGame } from '@/domain/games';
import type { GameAccount, RankSnapshot } from '@/domain/types';
import { DemoTag } from '@/shared/components/DemoTag';
import { Icon } from '@/shared/components/Icon';
import { Stamp } from '@/shared/components/Stamp';
import { NO_DATA_TEXT, RESYNC_LABEL, RESYNC_NOTE, SENDING_TEXT } from '@/shared/utils/copy';
import { timeAgo } from '@/shared/utils/format';
import './accountRow.css';

interface AccountRowProps {
  account: GameAccount;
  onSync?: (accountId: string) => void;
  onUnlink?: (accountId: string) => void;
  /** Esta cuenta se está resincronizando: su botón dice "Enviando…" (RF-20). */
  syncing?: boolean;
  /** Esta cuenta se está desvinculando: su botón dice "Enviando…" (RF-20). */
  unlinking?: boolean;
  /** Hay otra escritura de cuentas en curso: los botones quedan deshabilitados. */
  locked?: boolean;
  /** Antepone al identificador su etiqueta de formato ("Riot ID", "Ubisoft ID", "SteamID64"; spec 008, RF-4). */
  showHandleLabel?: boolean;
}

/** Asiento de una cuenta vinculada: identificador, rango sellado, etiqueta de datos simulados y última lectura (RF-11, RF-18, RF-31). */
export function AccountRow({
  account,
  onSync,
  onUnlink,
  syncing = false,
  unlinking = false,
  locked = false,
  showHandleLabel = false,
}: AccountRowProps) {
  const game = getGame(account.gameId);
  const busy = syncing || unlinking || locked;
  // Defensivo (RF-14): el servidor no entrega cuentas sin rango vigente, pero si llegara una
  // se muestra "Sin datos" y ningún valor derivado.
  const rank: RankSnapshot | null | undefined = account.currentRank;

  return (
    <article className="account">
      <div className="account__title">
        <div className="grow">
          <h3 className="sheet-title" style={{ color: game.accent }}>
            {game.name}
          </h3>
          <p className="note note--faint">
            {showHandleLabel ? `${game.handleLabel} · ` : null}
            {account.handle}
          </p>
        </div>
        <div className="account__mark">
          <Stamp
            tone={account.verified ? 'sealed' : 'warn'}
            pressKey={`${account.id}-${account.lastSyncedAt}`}
          >
            {account.verified ? 'Verificada' : 'Sin verificar'}
          </Stamp>
          {account.simulated ? <DemoTag /> : null}
        </div>
      </div>

      <dl className="account__entries">
        <div>
          <dt className="label">Rango vigente</dt>
          <dd className="num" style={{ color: game.accent }}>
            {rank ? formatRank(account.gameId, rank) : NO_DATA_TEXT}
          </dd>
          {account.simulated && rank ? (
            <dd>
              <DemoTag />
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="label">Región</dt>
          <dd className="num">{account.region}</dd>
        </div>
        <div>
          <dt className="label">Última lectura</dt>
          <dd className="num">{timeAgo(account.lastSyncedAt)}</dd>
        </div>
      </dl>

      {onSync || onUnlink ? (
        <div className="account__actions">
          {onSync ? (
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => onSync(account.id)}
              disabled={busy}
            >
              {syncing ? <span className="btn__spin" /> : <Icon as={RefreshCw} size={13} />}
              {syncing ? SENDING_TEXT : RESYNC_LABEL}
            </button>
          ) : null}
          {onUnlink ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => onUnlink(account.id)}
              disabled={busy}
            >
              {unlinking ? <span className="btn__spin" /> : <Icon as={Unlink} size={13} />}
              {unlinking ? SENDING_TEXT : 'Desvincular'}
            </button>
          ) : null}
        </div>
      ) : null}
      {onSync ? <p className="note note--faint">{RESYNC_NOTE}</p> : null}
    </article>
  );
}
