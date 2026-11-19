import { RefreshCw, Unlink } from 'lucide-react';
import { formatRank, getGame } from '@/domain/games';
import { verifiedLabel } from '@/domain/origins';
import { isBlockPending } from '@/domain/riotDisplay';
import type { GameAccount, RankSnapshot } from '@/domain/types';
import { RiotProfileBlock } from '@/features/riot/components/RiotProfileBlock';
import { RiotVerifyButton } from '@/features/riot/components/RiotVerifyButton';
import { SteamProfileBlock } from '@/features/steam/components/SteamProfileBlock';
import type { SteamProfileOwner } from '@/features/steam/components/SteamProfileBlock';
import { SteamVerifyButton } from '@/features/steam/components/SteamVerifyButton';
import { Icon } from '@/shared/components/Icon';
import { OriginTag } from '@/shared/components/OriginTag';
import { Stamp } from '@/shared/components/Stamp';
import {
  NO_DATA_TEXT,
  RESYNC_LABEL,
  RESYNC_NOTE,
  RIOT_PENDING_LABEL,
  RIOT_RESYNC_NOTE,
  RIOT_UNRANKED_LABEL,
  SENDING_TEXT,
  STEAM_RESYNC_NOTE,
} from '@/shared/utils/copy';
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
  /**
   * Ofrece «Verificar con Steam» en una cuenta de CS2 sin verificar (spec 013, RF-2): solo para el
   * dueño, en su perfil y en Configuración; nunca en la ficha de otro jugador.
   */
  offerSteamVerify?: boolean;
  /**
   * Ofrece «Verificar con Riot Games» en una cuenta de LoL sin verificar (spec 014, RF-39): solo
   * para el dueño, en su perfil y en Configuración; nunca en la ficha de otro jugador.
   */
  offerRiotVerify?: boolean;
  /** Dueño de la cuenta: su avatar de TeamMatchUp reemplaza al de Steam si este no carga (spec 013, RF-19). */
  owner?: SteamProfileOwner | undefined;
}

/** Asiento de una cuenta vinculada: identificador con la etiqueta de su origen, sello de verificación, rango con la suya y última lectura (spec 012, RF-6, RF-22). */
export function AccountRow({
  account,
  onSync,
  onUnlink,
  syncing = false,
  unlinking = false,
  locked = false,
  showHandleLabel = false,
  offerSteamVerify = false,
  offerRiotVerify = false,
  owner,
}: AccountRowProps) {
  const game = getGame(account.gameId);
  const busy = syncing || unlinking || locked;
  // En cuentas verificadas con Riot el rango puede estar pendiente (RF-27) o sin clasificar (RF-13);
  // en el resto, si faltara de forma defensiva (007 RF-14), se muestra «Sin datos».
  const rank: RankSnapshot | null | undefined = account.currentRank;
  const rankPending = isBlockPending(account, 'rank');
  const riotUnranked = account.verifiedWith === 'riot' && !rankPending && rank == null;

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
          <OriginTag origin={account.origins.identity} />
        </div>
        <div className="account__mark">
          <Stamp
            tone={account.verified ? 'sealed' : 'warn'}
            pressKey={`${account.id}-${account.lastSyncedAt}`}
          >
            {verifiedLabel(account.verifiedWith)}
          </Stamp>
        </div>
      </div>

      {account.verifiedWith === 'steam' ? (
        <SteamProfileBlock account={account} owner={owner} canSync={onSync !== undefined} />
      ) : null}

      {account.verifiedWith === 'riot' ? <RiotProfileBlock account={account} /> : null}

      <dl className="account__entries">
        <div>
          <dt className="label">Rango vigente</dt>
          {rankPending ? (
            <dd className="note note--faint">{RIOT_PENDING_LABEL}</dd>
          ) : riotUnranked ? (
            <>
              <dd>{RIOT_UNRANKED_LABEL}</dd>
              <dd>
                <OriginTag origin={account.origins.rank} />
              </dd>
            </>
          ) : (
            <>
              <dd className="num" style={{ color: game.accent }}>
                {rank ? formatRank(account.gameId, rank) : NO_DATA_TEXT}
              </dd>
              {rank ? (
                <dd>
                  <OriginTag origin={account.origins.rank} />
                </dd>
              ) : null}
            </>
          )}
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

      {offerSteamVerify && account.gameId === 'cs2' && !account.verified ? (
        <div className="account__actions">
          <SteamVerifyButton />
        </div>
      ) : null}

      {offerRiotVerify && account.gameId === 'lol' && !account.verified ? (
        <div className="account__actions">
          <RiotVerifyButton />
        </div>
      ) : null}

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
      {onSync ? (
        <p className="note note--faint">
          {account.verifiedWith === 'steam'
            ? STEAM_RESYNC_NOTE
            : account.verifiedWith === 'riot'
              ? RIOT_RESYNC_NOTE
              : RESYNC_NOTE}
        </p>
      ) : null}
    </article>
  );
}
