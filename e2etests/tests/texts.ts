// Textos, roles y direcciones que usan los escenarios, con su origen (spec 018, U12, RF-21; plan §9).
// «Interfaz actual» = lo que muestra el commit 8b9c130, que la spec 017 no cambia (su RF-19).
// Los nombres se comparan con `exact: true` salvo los que son expresiones.
// Ningún escenario usa la página de entrada (`/`) ni su texto (U13).

export const PATHS = {
  // spec 018, Definiciones y U13. No es una ruta de la aplicación: app/routes.ts no la tiene.
  noView: "/e2e-sin-vista",
  // spec 007.
  login: "/login",
  // spec 007 (ROUTES.home).
  home: "/inicio",
  // spec 007.
  agenda: "/agenda",
  // spec 009, RF-1. La exacta, `/agenda/<id>`, con sessionDetailPath cuando se conoce el id.
  sessionDetail: /^\/agenda\/[0-9a-f]{24}$/,
} as const;

// spec 009, RF-1.
export function sessionDetailPath(id: string): string {
  return `${PATHS.agenda}/${id}`;
}

export const TEXTS = {
  // Encabezado de nivel 1 de la vista «no encontrada». Interfaz actual
  // (app/pages/NotFoundPage.tsx); spec 018, U13. La vista la fija la spec 007, RF-28; el texto,
  // ninguna spec.
  notFoundHeading: "No hay nadie en esta sala",

  // Etiquetas de los campos de login. Interfaz actual (features/auth/pages/LoginPage.tsx).
  emailLabel: "Correo",
  passwordLabel: "Contraseña",
  // Botón de enviar el login. spec 018 (Escenarios); interfaz actual.
  loginButton: "Entrar",
  // Credenciales incorrectas. spec 002, RF-9; spec 007.
  badCredentials: "correo o contraseña incorrectos",

  // Texto propio de Inicio: encabezado de nivel 1 «<nombre>, ¿a qué hora juegas hoy?». Interfaz
  // actual (features/home/pages/HomePage.tsx).
  homeHeading: /¿a qué hora juegas hoy\?$/i,

  // Título de la agenda: encabezado de nivel 1. Interfaz actual (SchedulePage.tsx). Inicio tiene
  // uno de nivel 2 con el mismo texto: el nivel los distingue.
  agendaHeading: "Agenda de la semana",
  // Enlace de la agenda dentro de la navegación «Principal». Interfaz actual (app/routes.ts,
  // NAV_ITEMS; AppLayout.tsx).
  mainNavigation: "Principal",
  agendaLink: "Agenda",
  // Botón de cerrar sesión. spec 007, RF-6; interfaz actual (AppLayout.tsx, nombre accesible).
  logoutButton: "Cerrar sesión",

  // Filtro, botón con aria-pressed="true". spec 016; interfaz actual (FilterChip, spec 017 RF-14).
  allGamesFilter: "Todos los juegos",
  // Encabezados de nivel 2 del panel. spec 009 / 016 (Definiciones de la 018); interfaz actual.
  panelMine: "Mis sesiones",
  panelOpen: "Sesión abierta",
  // Botón «Ver las mías». spec 016, RF-23.
  viewMineButton: "Ver las mías",

  // Abrir el formulario: botón de la página, fuera de ventanas. spec 017, RF-12; interfaz actual.
  openDraftButton: "Anotar sesión",
  // Ventana del formulario (rol dialog). spec 017, RF-12.
  draftDialog: "Anotar una sesión",
  // Campo título, dentro de la ventana y en la edición. spec 006/009; interfaz actual
  // (SessionDraftSlip.tsx).
  titleLabel: "Título",
  // Enviar el formulario: botón dentro de la ventana. spec 017, RF-12; interfaz actual.
  submitDraftButton: "Anotar sesión",

  // Detalle: día y horario de la sesión preparada (miércoles 18:00, 2 horas). spec 009, RF-3;
  // interfaz actual (domain/sessionDetail.ts, formatSessionRange).
  wednesdayRange: "Miércoles · 18:00–20:00",
  // Detalle: quien organiza. spec 009, RF-3 (SESSION_YOU_HOST_TEXT).
  youHost: "La organizas",
  // Detalle: editar, campos y guardar. spec 009, RF-6; spec 017, RF-10 (lista nativa «Cupos»).
  editButton: "Editar sesión",
  slotsLabel: "Cupos",
  saveButton: "Guardar cambios",
  // Guardado. spec 009, RF-7.
  savedNotice: "Cambios guardados.",
  // Cancelar y su confirmación. spec 009, RF-23.
  cancelButton: "Cancelar sesión",
  cancelDialog: "¿Cancelar esta sesión?",
  cancelDialogBack: "Volver",
  cancelDialogConfirm: "Sí, cancelar sesión",
  // Sesión inexistente y su enlace. spec 009, RF-12.
  sessionGone: "Esta sesión no existe",
  goToAgendaLink: "Ir a la agenda",
} as const;

// Tarjeta del panel: enlace «Ver detalle de <título>». spec 009, RF-2 (copy.ts, viewDetailLabel).
export function viewDetailLabel(title: string): string {
  return `Ver detalle de ${title}`;
}

// Cupos del detalle: «1/4 jugadores» → «1/5 jugadores». spec 009, RF-3 (sessionOccupancyText).
export function occupancyText(taken: number, total: number): string {
  return `${taken}/${total} jugadores`;
}

// El nombre accesible del bloque de la semana es «<título>, <Día> <HH:00>, <n> de <m> jugadores»
// (interfaz actual, WeekCalendar.tsx; Definiciones de la 018): se localiza con weekBlockName de
// ui.ts.
