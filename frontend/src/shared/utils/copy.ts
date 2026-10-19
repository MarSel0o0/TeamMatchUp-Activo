/**
 * Textos literales que fija la spec 007. Única fuente: ningún otro archivo los
 * repite, de modo que se pueden buscar y comparar con la spec.
 */

/** Etiqueta de datos simulados y aviso global (RF-11, RF-22). */
export const SIMULATED_LABEL = 'Datos de demostración';

/** Texto de error sin mensaje (definiciones, RF-9, RF-20). */
export const NO_MESSAGE_TEXT = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';

/** Consulta de sesión en curso (RF-5). */
export const LOADING_TEXT = 'Cargando…';

/** Escritura en curso (RF-20). */
export const SENDING_TEXT = 'Enviando…';

/** Texto de un 401 del inicio de sesión sin cuerpo legible (spec 002, RF-9; R22). */
export const BAD_CREDENTIALS_TEXT = 'correo o contraseña incorrectos';

/** Avisos fijos de login (RF-4, RF-7, RF-24). */
export const LOGIN_NOTICES = {
  expired: 'Tu sesión expiró. Vuelve a entrar.',
  otherTab: 'Se cerró o cambió la sesión en otra pestaña.',
  registered: 'Tu cuenta se creó; inicia sesión',
} as const;

export type LoginNotice = keyof typeof LOGIN_NOTICES;

/** Botón de relectura y el texto que va junto a él (RF-18, RF-26). */
export const RESYNC_LABEL = 'Resincronizar';
export const RESYNC_NOTE =
  'Al resincronizar, tu rango puede cambiar un escalón y pueden llegar partidas nuevas.';

/** Sustituye a las promesas de relectura sin intervención del usuario (RF-26). */
export const REREAD_TEXT = 'El rango se vuelve a leer al pulsar "Resincronizar".';

/** Motivos por los que "Proponer" queda deshabilitado (RF-29). */
export const PROPOSAL_BLOCK_REASONS = {
  noOwnHours: 'No has marcado tus horas',
  noTheirHours: 'Este jugador no ha marcado horas',
  noCommon: 'No tienen horas en común',
  outsideAgenda: 'Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)',
} as const;
