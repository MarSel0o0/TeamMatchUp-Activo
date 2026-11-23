import { useState } from 'react';
import { ddragonIconUrl, isBlockPending } from '@/domain/riotDisplay';
import type { GameAccount } from '@/domain/types';
import { OriginTag } from '@/shared/components/OriginTag';
import { NO_DATA_TEXT, RIOT_PENDING_LABEL } from '@/shared/utils/copy';
import { useDdragonVersion } from '../hooks';
import './riotProfileBlock.css';

interface RiotProfileBlockProps {
  account: GameAccount;
}

/**
 * Datos de perfil de Riot Games de una cuenta de LoL verificada (spec 014, RF-27, RF-40;
 * D50, D92, D93): ícono de invocador cargado desde Data Dragon y nivel de cuenta, junto a la
 * etiqueta de origen («Datos de Riot Games»).
 * - Si la imagen del ícono no carga, no muestra nada en su lugar (D50).
 * - Si el bloque `profile` está pendiente, muestra «Datos pendientes de Riot Games» en lugar del
 *   nivel manteniendo el ícono si existe `iconId` (D92).
 */
export function RiotProfileBlock({ account }: RiotProfileBlockProps) {
  const ddragonQuery = useDdragonVersion();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const profile = account.profile;
  const profilePending = isBlockPending(account, 'profile');
  const iconId = profile?.iconId;
  const level = profile?.level;
  const version = ddragonQuery.data;
  const iconUrl =
    iconId !== undefined && version !== undefined ? ddragonIconUrl(version, iconId) : null;
  const showIcon = iconUrl !== null && failedUrl !== iconUrl;

  return (
    <div className="riot-profile">
      <div className="riot-profile__head">
        {showIcon ? (
          <img
            className="riot-profile__icon"
            src={iconUrl}
            alt=""
            width={36}
            height={36}
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(iconUrl)}
          />
        ) : null}
        {profilePending ? (
          <span className="note note--faint riot-profile__pending">{RIOT_PENDING_LABEL}</span>
        ) : (
          <span className="riot-profile__level num">
            {level !== undefined ? `Nivel ${level}` : NO_DATA_TEXT}
          </span>
        )}
        <OriginTag origin={account.origins.profile} className="riot-profile__origin" />
      </div>
    </div>
  );
}
