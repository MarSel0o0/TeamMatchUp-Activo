import type { GameAccount, PendingBlock } from './types';

/**
 * Reglas puras de presentación y estado de la verificación y datos de Riot Games
 * (spec 014, RF-2, RF-8, RF-9, RF-10, RF-12, RF-23, RF-24, RF-25, RF-27, RF-40, RF-48, RF-50;
 * D47, D93, D99, D100; plan §2.3).
 * Sin React, sin HTTP y sin reloj interno.
 */

const DDRAGON_CDN_BASE = 'https://ddragon.leagueoflegends.com/cdn';

/** Error 400 que indica desafío vencido o anulado (RF-9), distinto de ícono no coincidente (RF-8). */
const EXPIRED_OR_CANCELLED_ERROR = 'la verificación venció, pide un ícono nuevo';

/** Error 409 recuperable: otra operación con Riot del mismo usuario está en curso (RF-25, RF-49). */
const IN_PROGRESS_ERROR = 'ya se está comprobando';

/** Formatea segundos restantes como `mm:ss`, acotado a `>= 0` (RF-2, D100). */
export function formatCountdown(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

/**
 * Formatea una fecha ISO de partida como `dd/mm/aaaa` en la zona horaria local del navegador
 * (RF-12, D47). Devuelve `'—'` si la cadena no es una fecha válida.
 */
export function formatMatchDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).padStart(4, '0');
  return `${day}/${month}/${year}`;
}

/**
 * Formatea la variación de puntos de una partida: `+N` para valores `>= 0`, `−N` (signo menos
 * U+2212) para negativos y `'—'` cuando la variación no existe o no es finita (RF-12, RF-30).
 */
export function formatMatchDelta(delta?: number): string {
  if (delta === undefined || !Number.isFinite(delta)) return '—';
  if (delta >= 0) return `+${delta}`;
  return `\u2212${Math.abs(delta)}`;
}

/** URL de un ícono de invocador en Data Dragon de Riot (RF-2, RF-40, D93). */
export function ddragonIconUrl(version: string, iconId: number): string {
  return `${DDRAGON_CDN_BASE}/${encodeURIComponent(version)}/img/profileicon/${iconId}.png`;
}

/** Indica si un bloque de una cuenta verificada con Riot sigue pendiente de lectura (RF-27). */
export function isBlockPending(
  account: Pick<GameAccount, 'pendingBlocks'>,
  block: PendingBlock,
): boolean {
  return account.pendingBlocks?.includes(block) ?? false;
}

/**
 * Distingue respuestas de confirmación que cierran o anulan el desafío en pantalla —429 (RF-10),
 * 409 de otro usuario o ya completado (RF-24, RF-48), 404 (RF-23, RF-50) y 400 vencido/anulado
 * (RF-9)— de errores recuperables que mantienen el desafío abierto —400 de ícono distinto (RF-8),
 * 409 en curso (RF-25) y 503/red (RF-16, RF-37, RF-38)— (RF-2, D99).
 */
export function isChallengeTerminalError(status: number, message: string): boolean {
  if (status === 404 || status === 429) return true;
  const normalized = message.trim().toLowerCase();
  if (status === 409) {
    return normalized !== '' && normalized !== IN_PROGRESS_ERROR;
  }
  if (status === 400) {
    return normalized === EXPIRED_OR_CANCELLED_ERROR;
  }
  return false;
}
