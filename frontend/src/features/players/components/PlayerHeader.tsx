import type { PublicUser } from '@/domain/types';
import { Monogram } from '@/shared/components/Monogram';
import { JOINED_TEXT } from '@/shared/utils/copy';
import { timeAgo } from '@/shared/utils/format';

interface PlayerHeaderProps {
  player: PublicUser;
}

/**
 * Datos públicos del jugador de la ficha (spec 008, RF-3; plan 4.2.1): monograma con su color
 * de avatar, nombre visible, `@usuario`, zona horaria, alta y biografía. Lista cerrada: sin
 * correo, sin los totales del perfil y sin botón de editar (P20). Todo va como texto de React,
 * nunca como HTML (RNF-3): una biografía `<b>x</b>` se ve literal.
 */
export function PlayerHeader({ player }: PlayerHeaderProps) {
  return (
    <header className="ficha sheet sheet--punched player-head">
      <div className="ficha__head">
        <Monogram name={player.displayName} color={player.avatarColor} size="lg" />
        <div className="grow">
          <h1 className="doc-title">{player.displayName}</h1>
          <p className="note">
            @{player.username} · {player.timezone}{` · ${JOINED_TEXT} `}{timeAgo(player.createdAt)}
          </p>
          {player.bio ? <p className="ficha__bio">{player.bio}</p> : null}
        </div>
      </div>
    </header>
  );
}
