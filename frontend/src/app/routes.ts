import { CalendarRange, Crosshair, FileUser, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Rutas de la aplicación en un solo lugar, para no repetir strings sueltos. */
export const ROUTES = {
  login: '/login',
  register: '/registro',
  profile: '/perfil',
  settings: '/configuracion',
  matches: '/coincidencias',
  schedule: '/agenda',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Índice del expediente: las secciones de la navegación principal. */
export const NAV_ITEMS: { to: RoutePath; label: string; folio: string; icon: LucideIcon }[] = [
  { to: ROUTES.profile, label: 'Mi ficha', folio: '01', icon: FileUser },
  { to: ROUTES.matches, label: 'Coincidencias', folio: '02', icon: Crosshair },
  { to: ROUTES.schedule, label: 'Agenda', folio: '03', icon: CalendarRange },
  { to: ROUTES.settings, label: 'Configuración', folio: '04', icon: SlidersHorizontal },
];
