import { LEETIFY_HOME_URL, leetifyProfileUrl } from '@/domain/premierDisplay';
import badgeBlack from '@/assets/leetify/leetify-badge-black.png';
import badgeWhite from '@/assets/leetify/leetify-badge-white.png';

/**
 * Atribución de un rango que entrega Leetify (spec 015, RF-6, RNF-8): el logo oficial «Data
 * Provided by Leetify» enlazado a leetify.com y «View on Leetify» enlazado al perfil del jugador,
 * ambos en pestaña nueva. Son las dos insignias oficiales sin tocar; el tema (claro u oscuro) lo
 * elige solo el CSS, que oculta la que no corresponde. `handle` es el SteamID64 de la cuenta.
 */
export function LeetifyAttribution({ handle, className }: { handle: string; className?: string }) {
  const classes = className ? `leetify-attribution ${className}` : 'leetify-attribution';
  return (
    <span className={classes}>
      <a href={LEETIFY_HOME_URL} target="_blank" rel="noopener noreferrer">
        <img
          className="leetify-attribution__logo leetify-attribution__logo--dark"
          src={badgeWhite}
          alt="Data Provided by Leetify"
        />
        <img
          className="leetify-attribution__logo leetify-attribution__logo--light"
          src={badgeBlack}
          alt="Data Provided by Leetify"
        />
      </a>
      <a
        className="leetify-attribution__link"
        href={leetifyProfileUrl(handle)}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Leetify
      </a>
    </span>
  );
}
