// Escenarios de inicio de sesión y acceso protegido (spec 018, RF-14 a RF-17; plan §8).
// Cada escenario sigue los pasos de su RF en orden; cada comprobación negativa va después de una
// positiva del mismo estado (RF-22).
import type { Page } from "@playwright/test";
import { expect, test, type Scenario } from "./fixtures.ts";
import { PATHS, TEXTS } from "./texts.ts";
import {
  agendaHeading,
  agendaNavLink,
  expectAgendaContent,
  expectLoginFieldsHidden,
  expectLoginFieldsVisible,
  expectPath,
  homeHeading,
  loginByForm,
  logoutButton,
  notFoundHeading,
  openAddress,
} from "./ui.ts";

// «Llega a Inicio»: su dirección y su texto propio (RF-21).
async function expectHome(page: Page): Promise<void> {
  await expectPath(page, PATHS.home);
  await expect(homeHeading(page)).toBeVisible();
}

// Login a la vista: su dirección y sus campos.
async function expectLogin(page: Page): Promise<void> {
  await expectPath(page, PATHS.login);
  await expectLoginFieldsVisible(page);
}

// RF-14 (E1, U13): parte de un navegador sin sesión; el paso 3 la inicia.
const e1: Scenario = {
  code: "E1",
  title: "E1 · ruta protegida sin sesión y vuelta a la ruta de origen",
  run: async ({ page, testUser }) => {
    await test.step("paso 1: la dirección sin vista muestra la vista «no encontrada»", async () => {
      await openAddress(page, PATHS.noView);
      await expectPath(page, PATHS.noView);
      await expect(notFoundHeading(page)).toBeVisible();
    });

    await test.step("paso 2: la agenda lleva a login", async () => {
      await openAddress(page, PATHS.agenda);
      await expectLogin(page);
      // Con los campos de login a la vista (RF-22).
      await expect(agendaHeading(page)).toBeHidden();
    });

    await test.step("paso 3: el login vuelve a la agenda, la ruta de origen", async () => {
      await loginByForm(page, testUser);
      await expectAgendaContent(page);
    });

    await test.step("paso 4: Atrás vuelve a la dirección sin vista, ya con sesión", async () => {
      await page.goBack();
      await expectPath(page, PATHS.noView);
      await expect(notFoundHeading(page)).toBeVisible();
      // Con la vista «no encontrada» a la vista (RF-22).
      await expectLoginFieldsHidden(page);
    });
  },
};

// RF-15 (E2, credenciales incorrectas): sin sesión iniciada en el navegador.
const e2: Scenario = {
  code: "E2",
  title: "E2 · credenciales incorrectas",
  run: async ({ page, testUser }) => {
    await test.step("paso 1: login con una contraseña equivocada", async () => {
      await openAddress(page, PATHS.login);
      await loginByForm(page, { email: testUser.email, password: `${testUser.password}-equivocada` });
      await expect(page.getByText(TEXTS.badCredentials, { exact: true })).toBeVisible();
      await expectPath(page, PATHS.login);
      await expectLoginFieldsVisible(page);
    });

    await test.step("paso 2: la agenda lleva a login", async () => {
      await openAddress(page, PATHS.agenda);
      await expectPath(page, PATHS.login);
      await expectLoginFieldsVisible(page);
      // Con los campos de login a la vista (RF-22).
      await expect(agendaHeading(page)).toBeHidden();
    });
  },
};

// RF-16 (E3): ruta protegida con sesión y recarga.
const e3: Scenario = {
  code: "E3",
  title: "E3 · ruta protegida con sesión y recarga",
  run: async ({ page, testUser }) => {
    await test.step("paso 1: el login sin ruta de origen llega a Inicio", async () => {
      await openAddress(page, PATHS.login);
      await loginByForm(page, testUser);
      await expectHome(page);
    });

    await test.step("paso 2: la agenda se ve con sesión", async () => {
      await openAddress(page, PATHS.agenda);
      await expectAgendaContent(page);
    });

    await test.step("paso 3: la recarga sigue en la agenda", async () => {
      await page.reload();
      await expectAgendaContent(page);
    });

    await test.step("paso 4: login con sesión lleva a Inicio", async () => {
      await openAddress(page, PATHS.login);
      await expectHome(page);
      // Con Inicio a la vista (RF-22).
      await expectLoginFieldsHidden(page);
    });
  },
};

// RF-17 (E4): cierre de sesión.
const e4: Scenario = {
  code: "E4",
  title: "E4 · cierre de sesión",
  run: async ({ page, testUser }) => {
    await test.step("paso 1: el login llega a Inicio", async () => {
      await openAddress(page, PATHS.login);
      await loginByForm(page, testUser);
      await expectHome(page);
    });

    await test.step("paso 2: el enlace de la barra abre la agenda", async () => {
      await agendaNavLink(page).click();
      await expectAgendaContent(page);
    });

    await test.step("paso 3: cerrar sesión lleva a login", async () => {
      await logoutButton(page).click();
      await expectLogin(page);
    });

    await test.step("paso 4: Atrás (Inicio, protegida) lleva a login", async () => {
      await page.goBack();
      await expectLogin(page);
      // Con los campos de login a la vista (RF-22).
      await expect(homeHeading(page)).toBeHidden();
      await expect(agendaHeading(page)).toBeHidden();
    });

    await test.step("paso 5: el login vuelve a Inicio, la ruta de origen, y no a la agenda", async () => {
      await loginByForm(page, testUser);
      await expectHome(page);
    });

    await test.step("paso 6: tras cerrar sesión otra vez, la agenda lleva a login", async () => {
      await logoutButton(page).click();
      await expectLogin(page);
      await openAddress(page, PATHS.agenda);
      await expectLogin(page);
    });

    await test.step("paso 7: la recarga sigue en login", async () => {
      await page.reload();
      await expectLogin(page);
    });
  },
};

// En el orden habitual (RF-13).
export const AUTH_SCENARIOS: readonly Scenario[] = [e1, e2, e3, e4];
