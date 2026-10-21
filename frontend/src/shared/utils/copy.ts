/**
 * Textos literales que fijan las specs 007 y 008. Única fuente: ningún otro archivo los
 * repite, de modo que se pueden buscar y comparar con la spec.
 */

/** Etiqueta de datos simulados y aviso global (RF-11, RF-22). */
export const SIMULATED_LABEL = 'Datos de demostración';

/** Texto de error sin mensaje (definiciones, RF-9, RF-20). */
export const NO_MESSAGE_TEXT = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';

/** Dato ausente o no derivable (spec 008, RF-17; P62). */
export const NO_DATA_TEXT = 'Sin datos';

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

/* ---------- Ficha de jugador (spec 008, plan 4.6) ---------- */

/** Usuario de la ficha con 400 o 404 (RF-9) y su enlace. */
export const PLAYER_NOT_FOUND_TEXT = 'Este jugador no existe';
export const GO_TO_MATCHES_LABEL = 'Ir a coincidencias';

/** Jugador sin cuentas: estado vacío de la sección de juegos y motivo 1 (RF-10, RF-12). */
export const PLAYER_NO_GAMES_TEXT = 'Este jugador no ha vinculado ningún juego';

/** Motivo 2 de RF-12 (P27). `game` es el nombre corto del juego (P21). */
export const linkAccountToProposeText = (game: string) =>
  `Vincula tu cuenta de ${game} para proponer una sesión`;

/** RF-13 (P27): en lugar de la distancia. `game` es el nombre corto del juego (P21). */
export const linkAccountForDistanceText = (game: string) =>
  `Vincula tu cuenta de ${game} para ver la distancia de rango`;

/** Nota de RF-22 cuando las zonas horarias son distintas (P11, P15). */
export const ZONES_DIFFER_NOTE =
  'Las horas se comparan tal como cada uno las marcó, sin convertir zonas horarias';

/** "Proponer sesión" y los textos de RF-23. */
export const PROPOSE_SESSION_LABEL = 'Proponer sesión';
export const PROPOSE_LOADING_TEXT = 'Cargando los datos para proponer una sesión…';
export const PROPOSE_FAILED_TEXT = 'No se pudieron cargar los datos para proponer una sesión.';

/** Lista de tramos en común vacía, igual que la fila de coincidencias (RF-6; P59, P61). */
export const NO_SHARED_HOURS_TEXT = 'Sin horas en común esta semana.';

/*
 * Títulos, etiquetas y unidades de la ficha, del panel de juego que comparte con el perfil y de
 * los mismos textos en el perfil, coincidencias, la grilla de horas y la portada (D10-3, P66,
 * P67; plan 4.6, Preguntas 11 a 13).
 */

/** Sección de juegos de la ficha: título y nombre accesible de sus pestañas (RF-4). */
export const PLAYER_GAMES_TITLE = 'Juegos';
export const PLAYER_GAMES_TABS_LABEL = 'Juegos del jugador';

/** Bloque de cruce de la ficha y sus dos apartados (RF-6). */
export const PLAYER_CROSS_TITLE = 'Cruce con tu perfil';
export const RANK_DISTANCE_TITLE = 'Distancia de rango';

/** Apartado de la ficha, leyenda de la grilla con comparación y etiqueta de la portada. */
export const SHARED_HOURS_TITLE = 'Horas en común';

/** Unidad del total de horas en común (ficha y fila de coincidencias), para `pluralize`. */
export const HOUR_UNIT = { one: 'hora', other: 'horas' } as const;

/** Texto tras el total de horas en común de la ficha. */
export const SHARED_HOURS_SUFFIX = 'en común';

/** Alta en el encabezado de la ficha y del perfil (RF-3): "se inscribió hace …". */
export const JOINED_TEXT = 'se inscribió';

/** Panel de un juego (ficha y perfil; RF-4, RF-17). */
export const SCALE_POSITION_LABEL = 'Posición en la escala del juego';
export const READINGS_UNIT = { one: 'lectura registrada', other: 'lecturas registradas' } as const;
export const FIRST_READING_LABEL = 'Primera lectura:';
export const RECENT_MATCHES_TITLE = 'Últimas partidas';
export const WIN_RATE_SUFFIX = 'ganadas';

/** Distancia de rango en la ficha y en la fila de coincidencias: "Δ <n> pts" (RF-6). */
export const rankDistanceText = (n: number) => `Δ ${n} pts`;
