// Localizadores y acciones comunes de los escenarios (spec 018, RF-21, RF-22; plan §8).
// Solo por rol y nombre accesible, etiqueta o texto; toda comprobación espera a un estado (sin
// tiempos fijos). Las comprobaciones negativas se usan siempre después de una positiva del mismo
// estado (RF-22): eso lo garantiza el orden de cada escenario.
import { expect, type Locator, type Page } from "@playwright/test";
import { PATHS, TEXTS, viewDetailLabel } from "./texts.ts";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Nombre accesible del bloque de la semana: empieza por «<título>, » (Definiciones, «La semana
// muestra <título>»). Función pura.
export function weekBlockName(title: string): RegExp {
  return new RegExp(`^${escapeRegExp(title)}, `);
}

// ---- Login ----
export function emailField(page: Page): Locator {
  return page.getByLabel(TEXTS.emailLabel, { exact: true });
}

export function passwordField(page: Page): Locator {
  return page.getByLabel(TEXTS.passwordLabel, { exact: true });
}

export interface FormCredentials {
  readonly email: string;
  readonly password: string;
}

// Inicia sesión por la interfaz: rellena «Correo» y «Contraseña» y pulsa «Entrar» (RF-11, U8).
export async function loginByForm(page: Page, credentials: FormCredentials): Promise<void> {
  await emailField(page).fill(credentials.email);
  await passwordField(page).fill(credentials.password);
  await page.getByRole("button", { name: TEXTS.loginButton, exact: true }).click();
}

export async function expectLoginFieldsVisible(page: Page): Promise<void> {
  await expect(emailField(page)).toBeVisible();
  await expect(passwordField(page)).toBeVisible();
}

export async function expectLoginFieldsHidden(page: Page): Promise<void> {
  await expect(emailField(page)).toBeHidden();
  await expect(passwordField(page)).toBeHidden();
}

// ---- Direcciones ----
// Escribir la dirección en el navegador: una entrada nueva del historial.
export async function openAddress(page: Page, path: string): Promise<void> {
  await page.goto(path);
}

// Compara solo la ruta de la dirección actual, esperando a que coincida.
export async function expectPath(page: Page, path: string | RegExp): Promise<void> {
  const currentPath = (): string => new URL(page.url()).pathname;
  if (typeof path === "string") {
    await expect.poll(currentPath, { message: `la dirección debería ser ${path}` }).toBe(path);
  } else {
    await expect.poll(currentPath, { message: `la dirección debería coincidir con ${path}` }).toMatch(path);
  }
}

// ---- Vistas ----
export function notFoundHeading(page: Page): Locator {
  return page.getByRole("heading", { level: 1, name: TEXTS.notFoundHeading, exact: true });
}

export function homeHeading(page: Page): Locator {
  return page.getByRole("heading", { level: 1, name: TEXTS.homeHeading });
}

export function agendaHeading(page: Page): Locator {
  return page.getByRole("heading", { level: 1, name: TEXTS.agendaHeading, exact: true });
}

export function agendaNavLink(page: Page): Locator {
  return page
    .getByRole("navigation", { name: TEXTS.mainNavigation, exact: true })
    .getByRole("link", { name: TEXTS.agendaLink, exact: true });
}

export function logoutButton(page: Page): Locator {
  return page.getByRole("button", { name: TEXTS.logoutButton, exact: true });
}

// ---- Agenda: semana y panel (Definiciones de la spec 018) ----
// El encabezado de nivel 2 del panel se llama exactamente `name`.
export function panelTitled(page: Page, name: string): Locator {
  return page.getByRole("heading", { level: 2, name, exact: true });
}

function weekBlock(page: Page, title: string): Locator {
  return page.getByRole("button", { name: weekBlockName(title) });
}

function panelCard(page: Page, title: string): Locator {
  return page.getByRole("link", { name: viewDetailLabel(title), exact: true });
}

export async function weekShows(page: Page, title: string): Promise<void> {
  await expect(weekBlock(page, title)).toBeVisible();
}

export async function weekDoesNotShow(page: Page, title: string): Promise<void> {
  await expect(weekBlock(page, title)).toHaveCount(0);
}

export async function panelShowsCard(page: Page, title: string): Promise<void> {
  await expect(panelCard(page, title)).toBeVisible();
}

export async function panelDoesNotShow(page: Page, title: string): Promise<void> {
  await expect(panelCard(page, title)).toHaveCount(0);
}

// «No aparece en la agenda»: ni en la semana ni en el panel.
export async function notInAgenda(page: Page, title: string): Promise<void> {
  await weekDoesNotShow(page, title);
  await panelDoesNotShow(page, title);
}

// Contenido de la agenda: su título y el panel «Mis sesiones», en su dirección.
export async function expectAgendaContent(page: Page): Promise<void> {
  await expectPath(page, PATHS.agenda);
  await expect(agendaHeading(page)).toBeVisible();
  await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
}
