import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CHALLENGE_HOURLY_LIMIT,
  CHALLENGE_HOURLY_WINDOW_MS,
  CHALLENGE_RETENTION_MS,
  CHALLENGE_TTL_MS,
  MAX_CONFIRM_ATTEMPTS,
  STARTER_ICON_IDS,
  availableStarterIcons,
  challengeConfirmNotice,
  challengeDeleteAt,
  challengeExpiry,
  hourlyRateLimitWait,
  isChallengeExpired,
  noFreeIconsWait,
  pickStarterIcon,
  remainingSeconds,
} from "../../src/domain/riotChallenge.ts";
import type { PendingBlock } from "../../src/domain/riotChallenge.ts";
import { RIOT_NOTICES } from "../../src/domain/riotRules.ts";

// Spec 014, RF-1, RF-4, RF-7, RF-9, RF-10, RF-19, RF-21, RF-27, RF-28, RF-43, RF-45;
// D15, D25, D26, D34, D79, D80, D87, D100.

const NOW = new Date("2026-11-19T12:00:00.000Z");
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("constantes del desafío de Riot", () => {
  test("29 íconos de inicio del 0 al 28 (D25)", () => {
    assert.equal(STARTER_ICON_IDS.length, 29);
    assert.equal(STARTER_ICON_IDS[0], 0);
    assert.equal(STARTER_ICON_IDS[28], 28);
    for (let i = 0; i < 29; i += 1) {
      assert.equal(STARTER_ICON_IDS[i], i);
    }
  });

  test("constantes de tiempos y límites coinciden con la spec", () => {
    assert.equal(CHALLENGE_TTL_MS, 10 * MINUTE);
    assert.equal(CHALLENGE_RETENTION_MS, 24 * HOUR);
    assert.equal(CHALLENGE_HOURLY_LIMIT, 5);
    assert.equal(CHALLENGE_HOURLY_WINDOW_MS, HOUR);
    assert.equal(MAX_CONFIRM_ATTEMPTS, 10);
  });
});

describe("vencimiento, retención y segundos restantes (RF-9, RF-28, D15, D87, D100)", () => {
  test("challengeExpiry suma 10 minutos sin mutar el instante dado", () => {
    const input = new Date(NOW.getTime());
    assert.equal(challengeExpiry(input).toISOString(), "2026-11-19T12:10:00.000Z");
    assert.equal(input.getTime(), NOW.getTime());
  });

  test("challengeDeleteAt suma 24 horas desde cierre, anulación o vencimiento (D87)", () => {
    const expiresAt = challengeExpiry(NOW);
    assert.equal(challengeDeleteAt(expiresAt).toISOString(), "2026-11-20T12:10:00.000Z");
    const cancelledAt = new Date(NOW.getTime() + 2 * MINUTE);
    assert.equal(challengeDeleteAt(cancelledAt).toISOString(), "2026-11-20T12:02:00.000Z");
    assert.equal(cancelledAt.getTime(), NOW.getTime() + 2 * MINUTE);
  });

  test("isChallengeExpired: a los 10:00 exactos ya está vencido (D15)", () => {
    const expiresAt = challengeExpiry(NOW);
    assert.equal(isChallengeExpired(expiresAt, NOW), false);
    assert.equal(isChallengeExpired(expiresAt, new Date(expiresAt.getTime() - 1)), false);
    assert.equal(isChallengeExpired(expiresAt, expiresAt), true);
    assert.equal(isChallengeExpired(expiresAt, new Date(expiresAt.getTime() + 5 * SECOND)), true);
  });

  test("remainingSeconds redondea hacia arriba y nunca baja de 0 (D100)", () => {
    const expiresAt = challengeExpiry(NOW);
    assert.equal(remainingSeconds(expiresAt, NOW), 600);
    assert.equal(remainingSeconds(expiresAt, new Date(NOW.getTime() + 999)), 600);
    assert.equal(remainingSeconds(expiresAt, new Date(NOW.getTime() + 1_000)), 599);
    assert.equal(remainingSeconds(expiresAt, new Date(expiresAt.getTime() - 1)), 1);
    assert.equal(remainingSeconds(expiresAt, expiresAt), 0);
    assert.equal(remainingSeconds(expiresAt, new Date(expiresAt.getTime() + MINUTE)), 0);
  });
});

describe("elección de ícono de inicio (RF-19, D25)", () => {
  test("sin exclusiones ofrece los 29 íconos (0..28)", () => {
    assert.deepEqual(availableStarterIcons([]), [...STARTER_ICON_IDS]);
  });

  test("excluye el ícono equipado, el reemplazado y los de desafíos abiertos, e ignora íconos fuera de 0..28", () => {
    const available = availableStarterIcons([0, 5, 28, 5, 5000, -1, 29]);
    assert.equal(available.length, 26);
    assert.equal(available.includes(0), false);
    assert.equal(available.includes(5), false);
    assert.equal(available.includes(28), false);
    assert.equal(available.includes(1), true);
    assert.equal(available.includes(27), true);
  });

  test("si los 29 íconos están excluidos devuelve lista vacía", () => {
    assert.deepEqual(availableStarterIcons(STARTER_ICON_IDS), []);
  });

  test("pickStarterIcon delega en pickIndex y devuelve null sin llamarlo cuando no hay disponibles", () => {
    let called = false;
    assert.equal(
      pickStarterIcon([], () => {
        called = true;
        return 0;
      }),
      null,
    );
    assert.equal(called, false);

    let receivedLen = -1;
    const picked = pickStarterIcon([3, 7, 11], (len) => {
      receivedLen = len;
      return 1;
    });
    assert.equal(receivedLen, 3);
    assert.equal(picked, 7);
  });
});

describe("límite de 5 desafíos por hora (RF-21, D34)", () => {
  test("con menos de 5 desafíos en la última hora devuelve null", () => {
    assert.equal(hourlyRateLimitWait([], NOW), null);
    const four = [1, 2, 3, 4].map((m) => new Date(NOW.getTime() - m * MINUTE));
    assert.equal(hourlyRateLimitWait(four, NOW), null);
  });

  test("un desafío creado exactamente hace 1 hora ya salió de la ventana", () => {
    const dates = [
      new Date(NOW.getTime() - HOUR), // justo hace 1 h → fuera
      new Date(NOW.getTime() - 40 * MINUTE),
      new Date(NOW.getTime() - 30 * MINUTE),
      new Date(NOW.getTime() - 20 * MINUTE),
      new Date(NOW.getTime() - 10 * MINUTE),
    ];
    assert.equal(hourlyRateLimitWait(dates, NOW), null);
  });

  test("con 5 desafíos en la última hora devuelve los ms hasta que el más antiguo cumpla 1 hora", () => {
    // Desordenados a propósito para probar que no depende del orden de entrada.
    const dates = Object.freeze([
      new Date(NOW.getTime() - 10 * MINUTE),
      new Date(NOW.getTime() - 50 * MINUTE), // más antiguo de los 5: le faltan 10 min
      new Date(NOW.getTime() - 20 * MINUTE),
      new Date(NOW.getTime() - 40 * MINUTE),
      new Date(NOW.getTime() - 30 * MINUTE),
    ]);
    assert.equal(hourlyRateLimitWait(dates, NOW), 10 * MINUTE);
  });

  test("a 1 ms de cumplir la hora sigue bloqueado y devuelve 1 ms", () => {
    const dates = [
      new Date(NOW.getTime() - HOUR + 1),
      new Date(NOW.getTime() - 40 * MINUTE),
      new Date(NOW.getTime() - 30 * MINUTE),
      new Date(NOW.getTime() - 20 * MINUTE),
      new Date(NOW.getTime() - 10 * MINUTE),
    ];
    assert.equal(hourlyRateLimitWait(dates, NOW), 1);
  });

  test("ignora desafíos con más de 1 hora y, si hay más de 5 recientes, usa el 5.º más reciente", () => {
    const withOld = [
      new Date(NOW.getTime() - 2 * HOUR),
      new Date(NOW.getTime() - 90 * MINUTE),
      new Date(NOW.getTime() - 45 * MINUTE),
      new Date(NOW.getTime() - 30 * MINUTE),
      new Date(NOW.getTime() - 20 * MINUTE),
      new Date(NOW.getTime() - 10 * MINUTE),
    ];
    assert.equal(hourlyRateLimitWait(withOld, NOW), null);

    const sixRecent = [
      new Date(NOW.getTime() - 55 * MINUTE),
      new Date(NOW.getTime() - 45 * MINUTE), // 5.º más reciente → faltan 15 min
      new Date(NOW.getTime() - 35 * MINUTE),
      new Date(NOW.getTime() - 25 * MINUTE),
      new Date(NOW.getTime() - 15 * MINUTE),
      new Date(NOW.getTime() - 5 * MINUTE),
    ];
    assert.equal(hourlyRateLimitWait(sixRecent, NOW), 15 * MINUTE);
  });
});

describe("espera cuando no quedan íconos libres (RF-43, D26)", () => {
  test("devuelve los ms hasta el menor vencimiento futuro sin mutar la entrada", () => {
    const dates = Object.freeze([
      new Date(NOW.getTime() + 8 * MINUTE),
      new Date(NOW.getTime() + 2 * MINUTE + 30 * SECOND),
      new Date(NOW.getTime() + 6 * MINUTE),
    ]);
    assert.equal(noFreeIconsWait(dates, NOW), 2 * MINUTE + 30 * SECOND);
  });

  test("ignora vencimientos ya pasados o iguales a now y devuelve 0 si no hay ninguno futuro", () => {
    const mixed = [
      new Date(NOW.getTime() - MINUTE),
      NOW,
      new Date(NOW.getTime() + 3 * MINUTE),
    ];
    assert.equal(noFreeIconsWait(mixed, NOW), 3 * MINUTE);
    assert.equal(noFreeIconsWait([], NOW), 0);
    assert.equal(noFreeIconsWait([NOW, new Date(NOW.getTime() - SECOND)], NOW), 0);
  });
});

describe("challengeConfirmNotice (RF-7, RF-27, D79, D80)", () => {
  test("sin bloques pendientes devuelve undefined (RF-7)", () => {
    assert.equal(challengeConfirmNotice([]), undefined);
  });

  test("si faltan rango y partidas (falte o no el perfil) usa el aviso de 'sus datos' (D79, D80)", () => {
    assert.equal(challengeConfirmNotice(["rank", "matches"]), RIOT_NOTICES.verifiedNoData);
    assert.equal(challengeConfirmNotice(["matches", "rank"]), RIOT_NOTICES.verifiedNoData);
    assert.equal(
      challengeConfirmNotice(["rank", "matches", "profile"]),
      RIOT_NOTICES.verifiedNoData,
    );
  });

  test("cualquier otra combinación con al menos un pendiente (incluido solo perfil) usa 'algunos de sus datos' (D80)", () => {
    const partialCases: PendingBlock[][] = [
      ["rank"],
      ["matches"],
      ["profile"],
      ["rank", "profile"],
      ["matches", "profile"],
    ];
    for (const blocks of partialCases) {
      assert.equal(
        challengeConfirmNotice(blocks),
        RIOT_NOTICES.verifiedPartialData,
        JSON.stringify(blocks),
      );
    }
  });
});
