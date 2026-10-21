import { CalendarRange, Crosshair, FileUser, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameId } from '@/domain/types';

/** Rutas de la aplicación en un solo lugar, para no repetir strings sueltos. */
export const ROUTES = {
  landing: '/',
  home: '/inicio',
  login: '/login',
  register: '/registro',
  profile: '/perfil',
  settings: '/configuracion',
  matches: '/coincidencias',
  schedule: '/agenda',
  player: '/jugadores/:userId',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Parámetro de consulta de la pestaña de juego de la ficha (spec 008, RF-4, RF-20). */
export const PLAYER_TAB_PARAM = 'juego';

/** Prefijo de la ficha de otro jugador (spec 008, RF-1). */
const PLAYER_PATH_PREFIX = '/jugadores/';

/** Dirección de la ficha de un jugador, con su pestaña si se indica (spec 008, RF-2). */
export function playerPath(userId: string, gameId?: GameId): string {
  const base = `${PLAYER_PATH_PREFIX}${encodeURIComponent(userId)}`;
  return gameId ? `${base}?${PLAYER_TAB_PARAM}=${gameId}` : base;
}

/** Rutas que exigen sesión; las specs 008 y 009 añaden las suyas (plan 3.5). */
const PROTECTED_PATHS: readonly string[] = [
  ROUTES.home,
  ROUTES.profile,
  ROUTES.settings,
  ROUTES.matches,
  ROUTES.schedule,
];

/**
 * `true` si `pathname` (sin parámetros de consulta) es una ruta protegida (RF-7, RF-24, RF-25);
 * la ficha de jugador, por su prefijo `/jugadores/` (spec 008, RF-1).
 */
export function isProtectedPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PROTECTED_PATHS.includes(normalized) || normalized.startsWith(PLAYER_PATH_PREFIX);
}

/** Índice del expediente: las secciones de la navegación principal. */
export const NAV_ITEMS: { to: RoutePath; label: string; folio: string; icon: LucideIcon }[] = [
  { to: ROUTES.profile, label: 'Mi ficha', folio: '01', icon: FileUser },
  { to: ROUTES.matches, label: 'Coincidencias', folio: '02', icon: Crosshair },
  { to: ROUTES.schedule, label: 'Agenda', folio: '03', icon: CalendarRange },
  { to: ROUTES.settings, label: 'Configuración', folio: '04', icon: SlidersHorizontal },
];
