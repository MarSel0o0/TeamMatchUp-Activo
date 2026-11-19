import { useState } from 'react';
import { steamProfileView } from '@/domain/steamDisplay';
import type { GameAccount } from '@/domain/types';
import { Monogram } from '@/shared/components/Monogram';
import { OriginTag } from '@/shared/components/OriginTag';
import { NO_DATA_TEXT, STEAM_NO_PROFILE_TEXT } from '@/shared/utils/copy';
import './steamProfileBlock.css';

export interface SteamProfileOwner {
  displayName: string;
  avatarColor: string;
}

interface SteamProfileBlockProps {
  account: GameAccount;
  /** Dueño de la cuenta: su avatar de TeamMatchUp es el respaldo si el de Steam no carga (RF-19). */
  owner?: SteamProfileOwner | undefined;
  /** El dueño puede resincronizar: solo a él se le sugiere hacerlo cuando faltan datos (RF-12). */
  canSync?: boolean;
}

/**
 * Datos de Steam de una cuenta de CS2 verificada (spec 013, RF-10, RF-11, RF-15, RF-17 a RF-19): nombre
 * visible, avatar, país y horas de CS2 (total y últimas dos semanas), con la etiqueta de su origen.
 * - Cada dato que Steam no entregó dice «perfil de Steam privado» en su lugar (RF-11, D7).
 * - El nombre se muestra tal como lo entrega Steam, como texto, y se recorta con «…» si no cabe (RF-19).
 * - Si el avatar de Steam no carga, se muestra el avatar de TeamMatchUp del dueño (RF-19).
 * - Sin datos de perfil (la lectura falló al verificar, RF-12) no se inventa nada.
 */
export function SteamProfileBlock({ account, owner, canSync = false }: SteamProfileBlockProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const profile = account.profile;

  if (profile === undefined) {
    return <p className="note note--faint">{canSync ? STEAM_NO_PROFILE_TEXT : NO_DATA_TEXT}</p>;
  }

  const view = steamProfileView(profile);
  const showSteamAvatar = view.avatarUrl !== undefined && !avatarFailed;

  return (
    <div className="steam">
      <div className="steam__head">
        {showSteamAvatar ? (
          <img
            className="steam__avatar"
            src={view.avatarUrl}
            alt=""
            width={36}
            height={36}
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
          />
        ) : owner ? (
          <Monogram name={owner.displayName} color={owner.avatarColor} size="sm" />
        ) : null}
        {view.displayName !== undefined ? (
          <span className="steam__name" title={view.displayName}>
            {view.displayName}
          </span>
        ) : null}
        <OriginTag origin={account.origins.profile} className="steam__origin" />
      </div>

      <dl className="steam__entries">
        <div>
          <dt className="label">País</dt>
          <dd>{view.country}</dd>
        </div>
        <div>
          <dt className="label">Horas de CS2</dt>
          <dd className="num">{view.hoursTotal}</dd>
        </div>
        <div>
          <dt className="label">Últimas 2 semanas</dt>
          <dd className="num">{view.hoursRecent}</dd>
        </div>
      </dl>
    </div>
  );
}
