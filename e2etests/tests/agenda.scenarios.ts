// Escenarios del CRUD de sesiones de juego en la agenda (spec 018, RF-18 a RF-20; plan §8).
// Cada escenario prepara sus datos por la API (RF-11), inicia sesión por el formulario (U8) y sigue
// los pasos de su RF en orden. Las sesiones de juego se localizan solo por su título único, en la
// semana y en el panel (Definiciones); ningún escenario pulsa un bloque de la semana ni cuenta
// sesiones (RF-13). Cada comprobación negativa va después de una positiva del mismo estado (RF-22).
import type { Locator, Page } from "@playwright/test";
import type { UniqueData } from "../lib/uniqueData.ts";
import { createSuiteApi, type Failure, type SuiteApi, type SuiteSession } from "./api.ts";
import { expect, test, type Scenario } from "./fixtures.ts";
import { occupancyText, PATHS, sessionDetailPath, TEXTS, viewDetailLabel } from "./texts.ts";
import {
  expectPath,
  loginByForm,
  notInAgenda,
  openAddress,
  panelShowsCard,
  panelTitled,
  weekShows,
} from "./ui.ts";

// Día y hora de la sesión testigo: viernes 19:00, dentro de la rejilla de la semana (plan §5.1).
const WITNESS_DAY = 4; // 0 = lunes
const WITNESS_START_HOUR = 19;
// Día y hora de la sesión que se edita o se cancela: miércoles 18:00 (plan §5.1). La API la crea
// con 2 horas y 4 cupos, y el organizador ocupa uno.
const EDITED_DAY = 2;
const EDITED_START_HOUR = 18;
const ORIGINAL_SLOTS = 4;
const EDITED_SLOTS = 5;

function describeFailure(failure: Failure): string {
  return failure.kind === "no-response"
    ? `no respondió: ${failure.reason}`
    : `respondió ${failure.status}${failure.problem === null ? "" : ` (${failure.problem})`}`;
}

// Cliente de la API del sistema bajo prueba, con la baseURL de la configuración.
function suiteApi(): SuiteApi {
  const baseURL = test.info().project.use.baseURL;
  if (baseURL === undefined) throw new Error("falta baseURL en la configuración de Playwright");
  return createSuiteApi(baseURL);
}

// Sesión iniciada de la suite con el usuario de prueba y su cuenta de R6 sin verificar (RF-11).
async function prepareLinkedUser(api: SuiteApi, user: UniqueData): Promise<SuiteSession> {
  const login = await api.login(user);
  if (!login.ok) {
    const reason = login.badCredentials ? "respondió 401 (credenciales)" : describeFailure(login.failure);
    throw new Error(`Falló la preparación: el inicio de sesión de la suite ${reason}`);
  }
  const linked = await api.linkR6(login.session, user.r6Handle);
  if (!linked.ok) {
    throw new Error(`Falló la preparación: vincular la cuenta de R6 ${describeFailure(linked.failure)}`);
  }
  return login.session;
}

async function prepareSession(
  api: SuiteApi,
  session: SuiteSession,
  title: string,
  day: number,
  startHour: number,
): Promise<string> {
  const created = await api.createSession(session, { title, day, startHour });
  if (!created.ok) {
    throw new Error(`Falló la preparación: crear la sesión de juego «${title}» ${describeFailure(created.failure)}`);
  }
  return created.value;
}

// «Todos los juegos» está pulsado (spec 016; botón con aria-pressed="true").
function allGamesPressed(page: Page): Locator {
  return page.getByRole("button", { name: TEXTS.allGamesFilter, exact: true, pressed: true });
}

// Ventana modal «Anotar una sesión» (spec 017, RF-12).
function draftDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: TEXTS.draftDialog, exact: true });
}

// RF-18 (C1): crear y listar.
const c1: Scenario = {
  code: "C1",
  title: "C1 · crear y listar",
  run: async ({ page, testUser }) => {
    const witness = testUser.title("C1", "testigo");
    const created = testUser.title("C1", "nueva");

    await test.step("preparación: cuenta de R6 y sesión testigo por la API; login por el formulario", async () => {
      const api = suiteApi();
      const session = await prepareLinkedUser(api, testUser);
      await prepareSession(api, session, witness, WITNESS_DAY, WITNESS_START_HOUR);
      await openAddress(page, PATHS.login);
      await loginByForm(page, testUser);
      await expectPath(page, PATHS.home);
    });

    await test.step("paso 1: la agenda muestra la sesión testigo con «Todos los juegos»", async () => {
      await openAddress(page, PATHS.agenda);
      await expectPath(page, PATHS.agenda);
      await expect(allGamesPressed(page)).toBeVisible();
      await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
      await panelShowsCard(page, witness);
      await weekShows(page, witness);
    });

    await test.step("paso 2: «Anotar sesión» de la cabecera abre la ventana «Anotar una sesión»", async () => {
      // Antes de abrir la ventana solo existe el botón de la cabecera de la página.
      await page.getByRole("button", { name: TEXTS.openDraftButton, exact: true }).click();
      await expect(draftDialog(page)).toBeVisible();
    });

    await test.step("paso 3: título único y envío desde la ventana", async () => {
      const dialog = draftDialog(page);
      await dialog.getByLabel(TEXTS.titleLabel, { exact: true }).fill(created);
      await dialog.getByRole("button", { name: TEXTS.submitDraftButton, exact: true }).click();
    });

    await test.step("paso 4: la sesión creada queda abierta en el panel y en la semana", async () => {
      await expect(panelTitled(page, TEXTS.panelOpen)).toBeVisible();
      await panelShowsCard(page, created);
      await weekShows(page, created);
      // Con la tarjeta y el bloque a la vista (RF-22).
      await expect(draftDialog(page)).toBeHidden();
    });

    await test.step("paso 5: «Ver las mías» lista la sesión creada y la testigo", async () => {
      await page.getByRole("button", { name: TEXTS.viewMineButton, exact: true }).click();
      await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
      await panelShowsCard(page, created);
      await panelShowsCard(page, witness);
    });

    await test.step("paso 6: tras F5 la agenda vuelve a su estado inicial con la sesión creada", async () => {
      await page.reload();
      await expectPath(page, PATHS.agenda);
      await expect(allGamesPressed(page)).toBeVisible();
      await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
      await panelShowsCard(page, created);
      await weekShows(page, created);
    });
  },
};

// Detalle de una sesión de juego: título (encabezado de nivel 1), día y horario y cupos (spec 009,
// RF-3).
async function detailShows(page: Page, title: string, slots: number): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  await expect(page.getByText(TEXTS.wednesdayRange, { exact: true })).toBeVisible();
  await expect(page.getByText(occupancyText(1, slots), { exact: true })).toBeVisible();
}

// RF-19 (C2): ver y editar, con «Atrás», «Adelante» y recarga.
const c2: Scenario = {
  code: "C2",
  title: "C2 · ver y editar, con Atrás, Adelante y recarga",
  run: async ({ page, testUser }) => {
    const original = testUser.title("C2", "original");
    const edited = testUser.title("C2", "editado");
    let detailPath = "";

    await test.step("preparación: cuenta de R6 y sesión original por la API; login por el formulario", async () => {
      const api = suiteApi();
      const session = await prepareLinkedUser(api, testUser);
      const id = await prepareSession(api, session, original, EDITED_DAY, EDITED_START_HOUR);
      detailPath = sessionDetailPath(id);
      await openAddress(page, PATHS.login);
      await loginByForm(page, testUser);
      await expectPath(page, PATHS.home);
    });

    await test.step("paso 1: el panel «Mis sesiones» muestra la tarjeta de la sesión original", async () => {
      await openAddress(page, PATHS.agenda);
      await expectPath(page, PATHS.agenda);
      await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
      await panelShowsCard(page, original);
    });

    await test.step("paso 2: el enlace de la tarjeta abre el detalle en su propia dirección", async () => {
      await page.getByRole("link", { name: viewDetailLabel(original), exact: true }).click();
      await expectPath(page, detailPath);
      await detailShows(page, original, ORIGINAL_SLOTS);
      await expect(page.getByText(TEXTS.youHost, { exact: true })).toBeVisible();
    });

    await test.step("paso 3: editar título y cupos, guardar y ver los valores nuevos", async () => {
      await page.getByRole("button", { name: TEXTS.editButton, exact: true }).click();
      const titleField = page.getByLabel(TEXTS.titleLabel, { exact: true });
      const slotsField = page.getByLabel(TEXTS.slotsLabel, { exact: true });
      await expect(titleField).toHaveValue(original);
      await expect(slotsField).toHaveValue(String(ORIGINAL_SLOTS));
      await titleField.fill(edited);
      await slotsField.selectOption({ label: String(EDITED_SLOTS) });
      await page.getByRole("button", { name: TEXTS.saveButton, exact: true }).click();
      await expect(page.getByText(TEXTS.savedNotice, { exact: true })).toBeVisible();
      await detailShows(page, edited, EDITED_SLOTS);
    });

    await test.step("paso 4: «Atrás» sin recargar lleva a la agenda con el título nuevo", async () => {
      await page.goBack();
      await expectPath(page, PATHS.agenda);
      await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
      await panelShowsCard(page, edited);
      await weekShows(page, edited);
      // Con la tarjeta y el bloque del título nuevo a la vista (RF-22).
      await notInAgenda(page, original);
    });

    await test.step("paso 5: «Adelante» vuelve al detalle con el título y los cupos nuevos", async () => {
      await page.goForward();
      await expectPath(page, detailPath);
      await detailShows(page, edited, EDITED_SLOTS);
    });

    await test.step("paso 6: tras F5 el detalle sigue con el título y los cupos nuevos", async () => {
      await page.reload();
      await expectPath(page, detailPath);
      await detailShows(page, edited, EDITED_SLOTS);
    });
  },
};

// Ventana de confirmación «¿Cancelar esta sesión?» (spec 009, RF-23).
function cancelDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: TEXTS.cancelDialog, exact: true });
}

// Botón «Cancelar sesión» del detalle (spec 009, RF-23).
function cancelButton(page: Page): Locator {
  return page.getByRole("button", { name: TEXTS.cancelButton, exact: true });
}

// La agenda tras la cancelación: su dirección, el panel «Mis sesiones» con la tarjeta de la sesión
// testigo y la semana con la sesión testigo (positivas que solo existen con la lista recibida);
// con eso a la vista, el título cancelado no aparece ni en la semana ni en el panel (RF-22).
async function agendaWithoutCancelled(page: Page, witness: string, cancelled: string): Promise<void> {
  await expectPath(page, PATHS.agenda);
  await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
  await panelShowsCard(page, witness);
  await weekShows(page, witness);
  await notInAgenda(page, cancelled);
}

// RF-20 (C3): eliminar = cancelar, con «Atrás» antes de la recarga (U10).
const c3: Scenario = {
  code: "C3",
  title: "C3 · eliminar = cancelar",
  run: async ({ page, testUser }) => {
    const witness = testUser.title("C3", "testigo");
    const original = testUser.title("C3", "original");
    let detailPath = "";

    await test.step("preparación: cuenta de R6, sesión a cancelar y sesión testigo por la API; login por el formulario", async () => {
      const api = suiteApi();
      const session = await prepareLinkedUser(api, testUser);
      const id = await prepareSession(api, session, original, EDITED_DAY, EDITED_START_HOUR);
      detailPath = sessionDetailPath(id);
      await prepareSession(api, session, witness, WITNESS_DAY, WITNESS_START_HOUR);
      await openAddress(page, PATHS.login);
      await loginByForm(page, testUser);
      await expectPath(page, PATHS.home);
    });

    await test.step("paso 1: el panel «Mis sesiones» muestra la tarjeta de la sesión a cancelar y la de la testigo", async () => {
      await openAddress(page, PATHS.agenda);
      await expectPath(page, PATHS.agenda);
      await expect(panelTitled(page, TEXTS.panelMine)).toBeVisible();
      await panelShowsCard(page, original);
      await panelShowsCard(page, witness);
    });

    await test.step("paso 2: el enlace de la tarjeta abre el detalle en su propia dirección", async () => {
      await page.getByRole("link", { name: viewDetailLabel(original), exact: true }).click();
      await expectPath(page, detailPath);
      await expect(page.getByRole("heading", { level: 1, name: original, exact: true })).toBeVisible();
    });

    await test.step("paso 3: «Cancelar sesión» abre la ventana «¿Cancelar esta sesión?»", async () => {
      await cancelButton(page).click();
      await expect(cancelDialog(page)).toBeVisible();
    });

    await test.step("paso 4: «Volver» cierra la ventana sin cancelar y el detalle sigue igual", async () => {
      await cancelDialog(page).getByRole("button", { name: TEXTS.cancelDialogBack, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: original, exact: true })).toBeVisible();
      await expect(cancelButton(page)).toBeVisible();
      // Con el título y el botón a la vista (RF-22).
      await expect(cancelDialog(page)).toBeHidden();
    });

    await test.step("paso 5: confirmar la cancelación lleva a la agenda sin la sesión cancelada", async () => {
      await cancelButton(page).click();
      await cancelDialog(page).getByRole("button", { name: TEXTS.cancelDialogConfirm, exact: true }).click();
      await agendaWithoutCancelled(page, witness, original);
    });

    await test.step("paso 6: «Atrás» sin recargar sigue en la agenda, sin la sesión cancelada ni el detalle", async () => {
      await page.goBack();
      await agendaWithoutCancelled(page, witness, original);
      // El detalle tiene «Editar sesión»; las tarjetas del panel no (RF-22: tras las positivas).
      await expect(page.getByRole("button", { name: TEXTS.editButton, exact: true })).toBeHidden();
    });

    await test.step("paso 7: tras F5, primero la testigo y después la ausencia de la sesión cancelada", async () => {
      await page.reload();
      await agendaWithoutCancelled(page, witness, original);
      await expect(page.getByRole("button", { name: TEXTS.editButton, exact: true })).toBeHidden();
    });

    await test.step("paso 8: la dirección del detalle cancelado muestra «Esta sesión no existe»", async () => {
      await openAddress(page, detailPath);
      await expectPath(page, detailPath);
      await expect(page.getByRole("heading", { level: 1, name: TEXTS.sessionGone, exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: TEXTS.goToAgendaLink, exact: true })).toBeVisible();
    });
  },
};

// En el orden habitual (RF-13).
export const AGENDA_SCENARIOS: readonly Scenario[] = [c1, c2, c3];
