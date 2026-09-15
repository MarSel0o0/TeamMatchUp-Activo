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

/** Enlaces que se muestran en la navegación principal. */
export const NAV_ITEMS: { to: RoutePath; label: string; icon: string }[] = [
  { to: ROUTES.profile, label: 'Mi perfil', icon: '👤' },
  { to: ROUTES.matches, label: 'Coincidencias', icon: '🎯' },
  { to: ROUTES.schedule, label: 'Agenda', icon: '🗓️' },
  { to: ROUTES.settings, label: 'Configuración', icon: '⚙️' },
];
