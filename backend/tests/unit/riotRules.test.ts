import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_ERRORS } from "../../src/domain/accountRules.ts";
import { GAMES } from "../../src/domain/games.ts";
import {
  RIOT_ERRORS,
  RIOT_NOTICES,
  RIOT_PLATFORMS,
  RIOT_ROUTING,
  formatWaitMinutes,
  validateChallengeRequest,
  validateRiotId,
} from "../../src/domain/riotRules.ts";
import type { LolRegion } from "../../src/domain/riotRules.ts";

// Spec 014, RF-3, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-16, RF-18, RF-20, RF-21, RF-23, RF-24,
// RF-25, RF-27, RF-33, RF-35, RF-37, RF-38, RF-43, RF-48, RF-49, RF-50, RF-53; D3, D4, D30, D31, D44.

describe("RIOT_ERRORS y RIOT_NOTICES (literales de la spec 014, D30 y D31)", () => {
  test("todos los textos de error coinciden exactamente con la spec", () => {
    assert.equal(
      RIOT_ERRORS.invalidRiotId,
      "Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16 caracteres sin # antes de # y 3 a 5 letras o dígitos después",
    );
    assert.equal(RIOT_ERRORS.invalidRegion, "región no válida para League of Legends");
    assert.equal(
      RIOT_ERRORS.accountNotFound,
      "no existe una cuenta de League of Legends con ese Riot ID en esa región",
    );
    assert.equal(RIOT_ERRORS.verifiedElsewhere, ACCOUNT_ERRORS.verifiedElsewhere);
    assert.equal(RIOT_ERRORS.verifiedElsewhere, "esta cuenta ya está verificada por otro usuario");
    assert.equal(
      RIOT_ERRORS.alreadyVerified,
      "ya tienes una cuenta de Riot verificada; usa «Resincronizar»",
    );
    assert.equal(
      RIOT_ERRORS.manualRegionMismatch("LAS"),
      "desvincula primero tu cuenta de LoL de LAS",
    );
    assert.equal(
      RIOT_ERRORS.hourlyLimit(60_000),
      "ya pediste 5 íconos en la última hora, espera 1 minuto antes de pedir otro",
    );
    assert.equal(
      RIOT_ERRORS.hourlyLimit(12 * 60_000 + 1),
      "ya pediste 5 íconos en la última hora, espera 13 minutos antes de pedir otro",
    );
    assert.equal(
      RIOT_ERRORS.noFreeIcons(30_000),
      "no quedan íconos libres para esta cuenta, espera 1 minuto antes de pedir otro",
    );
    assert.equal(
      RIOT_ERRORS.noFreeIcons(4 * 60_000 + 5_000),
      "no quedan íconos libres para esta cuenta, espera 5 minutos antes de pedir otro",
    );
    assert.equal(RIOT_ERRORS.inProgress, "ya se está comprobando");
    assert.equal(
      RIOT_ERRORS.iconMismatch,
      "si ya lo cambiaste, Riot puede tardar unos minutos; vuelve a intentarlo",
    );
    assert.equal(RIOT_ERRORS.challengeExpired, "la verificación venció, pide un ícono nuevo");
    assert.equal(RIOT_ERRORS.tooManyAttempts, "demasiados intentos, pide un ícono nuevo");
    assert.equal(RIOT_ERRORS.challengeNotFound, "desafío de verificación no encontrado");
    assert.equal(RIOT_ERRORS.challengeCompleted, "este desafío ya se completó");
    assert.equal(RIOT_ERRORS.unavailable, ACCOUNT_ERRORS.sourceUnavailable("Riot Games"));
    assert.equal(
      RIOT_ERRORS.unavailable,
      "Riot Games no está disponible por ahora, intenta más tarde",
    );
    assert.equal(RIOT_ERRORS.busy, "Riot Games está ocupado, inténtalo en unos minutos");
    assert.equal(RIOT_ERRORS.unrankedForMatches, "necesitas rango en Solo/Dúo para buscar en LoL");
    assert.equal(RIOT_ERRORS.accountGone, ACCOUNT_ERRORS.sourceAccountGone("Riot Games"));
    assert.equal(RIOT_ERRORS.accountGone, "la cuenta ya no existe en Riot Games");
    assert.equal(
      RIOT_ERRORS.regionTransferred("EUW"),
      "la cuenta ya no tiene perfil de League of Legends en EUW: desvincúlala y vuelve a verificarla en su región nueva",
    );
  });

  test("los errores siguen el estilo de D31: minúscula inicial (salvo nombres propios) y sin punto final", () => {
    const samples: string[] = [
      RIOT_ERRORS.invalidRiotId,
      RIOT_ERRORS.invalidRegion,
      RIOT_ERRORS.accountNotFound,
      RIOT_ERRORS.verifiedElsewhere,
      RIOT_ERRORS.alreadyVerified,
      RIOT_ERRORS.manualRegionMismatch("LAS"),
      RIOT_ERRORS.hourlyLimit(60_000),
      RIOT_ERRORS.noFreeIcons(60_000),
      RIOT_ERRORS.inProgress,
      RIOT_ERRORS.iconMismatch,
      RIOT_ERRORS.challengeExpired,
      RIOT_ERRORS.tooManyAttempts,
      RIOT_ERRORS.challengeNotFound,
      RIOT_ERRORS.challengeCompleted,
      RIOT_ERRORS.unavailable,
      RIOT_ERRORS.busy,
      RIOT_ERRORS.unrankedForMatches,
      RIOT_ERRORS.accountGone,
      RIOT_ERRORS.regionTransferred("LAS"),
    ];
    for (const text of samples) {
      assert.match(text, /^([a-zá-ú]|Riot ID |Riot Games )/, text);
      assert.doesNotMatch(text, /\.$/, text);
    }
  });

  test("todos los textos de aviso coinciden exactamente con RF-7, RF-27 y RF-53", () => {
    assert.equal(RIOT_NOTICES.verified, "Cuenta de Riot verificada");
    assert.equal(
      RIOT_NOTICES.verifiedNoData,
      "Cuenta de Riot verificada, pero no pudimos leer sus datos. Resincroniza más tarde para verlos.",
    );
    assert.equal(
      RIOT_NOTICES.verifiedPartialData,
      "Cuenta de Riot verificada, pero no pudimos leer algunos de sus datos. Resincroniza más tarde para verlos.",
    );
    assert.equal(
      RIOT_NOTICES.partialSync,
      "No pudimos actualizar algunos de tus datos de Riot Games. Resincroniza más tarde para verlos.",
    );
  });
});

describe("RIOT_PLATFORMS y RIOT_ROUTING (tabla fija D4)", () => {
  test("cubre exactamente las 7 regiones de LoL de la spec 004", () => {
    assert.deepEqual(Object.keys(RIOT_PLATFORMS).sort(), [...GAMES.lol.regions].sort());
    assert.deepEqual(Object.keys(RIOT_ROUTING).sort(), [...GAMES.lol.regions].sort());
  });

  test("mapea cada región a su plataforma y enrutamiento regional", () => {
    const expected: Record<LolRegion, { platform: string; routing: string }> = {
      LAS: { platform: "la2", routing: "americas" },
      LAN: { platform: "la1", routing: "americas" },
      NA: { platform: "na1", routing: "americas" },
      BR: { platform: "br1", routing: "americas" },
      EUW: { platform: "euw1", routing: "europe" },
      EUNE: { platform: "eun1", routing: "europe" },
      KR: { platform: "kr", routing: "asia" },
    };
    for (const [region, { platform, routing }] of Object.entries(expected) as [
      LolRegion,
      { platform: string; routing: string },
    ][]) {
      assert.equal(RIOT_PLATFORMS[region], platform, region);
      assert.equal(RIOT_ROUTING[region], routing, region);
    }
  });
});

describe("formatWaitMinutes (Definiciones, D30)", () => {
  test("redondea hacia arriba y usa singular para 1 minuto", () => {
    assert.equal(formatWaitMinutes(-5_000), "1 minuto");
    assert.equal(formatWaitMinutes(0), "1 minuto");
    assert.equal(formatWaitMinutes(1), "1 minuto");
    assert.equal(formatWaitMinutes(30_000), "1 minuto");
    assert.equal(formatWaitMinutes(60_000), "1 minuto");
    assert.equal(formatWaitMinutes(60_001), "2 minutos");
    assert.equal(formatWaitMinutes(120_000), "2 minutos");
    assert.equal(formatWaitMinutes(10 * 60_000), "10 minutos");
    assert.equal(formatWaitMinutes(59 * 60_000 + 1), "60 minutos");
  });
});

describe("validateRiotId (RF-18, D3, D44)", () => {
  test("acepta un Riot ID válido y recorta espacios en los extremos", () => {
    assert.deepEqual(validateRiotId("Jugador#LAS"), {
      ok: true,
      gameName: "Jugador",
      tagLine: "LAS",
      riotId: "Jugador#LAS",
    });
    assert.deepEqual(validateRiotId("  Jugador#LAS  "), {
      ok: true,
      gameName: "Jugador",
      tagLine: "LAS",
      riotId: "Jugador#LAS",
    });
    assert.deepEqual(validateRiotId("\tFaker One#KR1\n"), {
      ok: true,
      gameName: "Faker One",
      tagLine: "KR1",
      riotId: "Faker One#KR1",
    });
  });

  test("respeta los límites de 3 a 16 unidades UTF-16 en el nombre (un emoji vale 2)", () => {
    assert.equal(validateRiotId("abc#LAS").ok, true);
    assert.equal(validateRiotId(`${"a".repeat(16)}#LAS`).ok, true);
    assert.equal(validateRiotId("🔥a#LAS").ok, true); // 2 + 1 = 3 UTF-16
    assert.equal(validateRiotId(`${"a".repeat(14)}🔥#LAS`).ok, true); // 14 + 2 = 16 UTF-16
    assert.equal(validateRiotId("Ángel#LAS").ok, true);

    for (const bad of [
      "ab#LAS", // 2 UTF-16
      "🔥#LAS", // 2 UTF-16
      `${"a".repeat(17)}#LAS`, // 17 UTF-16
      `${"a".repeat(15)}🔥#LAS`, // 17 UTF-16
    ]) {
      assert.deepEqual(validateRiotId(bad), { ok: false, error: RIOT_ERRORS.invalidRiotId }, bad);
    }
  });

  test("rechaza # extra y saltos de línea dentro del nombre (LF, CR, U+2028, U+2029)", () => {
    for (const bad of [
      "JugadorLAS",
      "Jug#ador#LAS",
      "abc##LAS",
      "Juga\ndor#LAS",
      "Juga\rdor#LAS",
      "Juga\u2028dor#LAS",
      "Juga\u2029dor#LAS",
    ]) {
      assert.deepEqual(validateRiotId(bad), { ok: false, error: RIOT_ERRORS.invalidRiotId }, bad);
    }
  });

  test("exige etiqueta de 3 a 5 letras o dígitos ASCII (rechaza 2, 6 y no ASCII como ÉLA)", () => {
    assert.equal(validateRiotId("Jugador#123").ok, true);
    assert.equal(validateRiotId("Jugador#aZ09").ok, true);
    assert.equal(validateRiotId("Jugador#12345").ok, true);

    for (const bad of [
      "Jugador#",
      "Jugador#LA", // válido en 004, inválido en 014
      "Jugador#123456",
      "Jugador#ÉLA",
      "Jugador#ñ12",
      "Jugador#L-A",
      "Jugador#L_A",
      "Jugador#L A",
    ]) {
      assert.deepEqual(validateRiotId(bad), { ok: false, error: RIOT_ERRORS.invalidRiotId }, bad);
    }
  });

  test("rechaza campo ausente, vacío o que no es texto con el mismo 400", () => {
    for (const bad of [undefined, null, "", "   ", 12345, true, {}, []]) {
      assert.deepEqual(validateRiotId(bad), { ok: false, error: RIOT_ERRORS.invalidRiotId });
    }
  });
});

describe("validateChallengeRequest (RF-18)", () => {
  test("valida Riot ID recortado y normaliza la región sin distinguir mayúsculas ASCII", () => {
    const input = Object.freeze({ riotId: " Jugador#LAS ", region: " las ", ignored: "x" });
    assert.deepEqual(validateChallengeRequest(input), {
      ok: true,
      value: {
        gameName: "Jugador",
        tagLine: "LAS",
        riotId: "Jugador#LAS",
        region: "LAS",
      },
    });
  });

  test("acepta las 7 regiones de LoL", () => {
    for (const region of GAMES.lol.regions) {
      const res = validateChallengeRequest({ riotId: "Jugador#LAS", region: region.toLowerCase() });
      assert.equal(res.ok, true, region);
      if (res.ok) assert.equal(res.value.region, region);
    }
  });

  test("rechaza región ausente o inválida (incluido signo de kelvin U+212A)", () => {
    for (const region of [undefined, null, "", "LATAM", "OCE", 123, "K\u212A"]) {
      assert.deepEqual(validateChallengeRequest({ riotId: "Jugador#LAS", region }), {
        ok: false,
        status: 400,
        error: RIOT_ERRORS.invalidRegion,
      });
    }
  });

  test("evalúa en orden estricto Riot ID → región (si fallan los dos, solo devuelve el del Riot ID)", () => {
    assert.deepEqual(validateChallengeRequest({ riotId: "mal", region: "INVALIDA" }), {
      ok: false,
      status: 400,
      error: RIOT_ERRORS.invalidRiotId,
    });
    for (const body of [undefined, null, "x", 42, [], {}]) {
      assert.deepEqual(validateChallengeRequest(body), {
        ok: false,
        status: 400,
        error: RIOT_ERRORS.invalidRiotId,
      });
    }
  });

  test("ignora propiedades heredadas del prototipo", () => {
    const inherited = Object.create({ riotId: "Jugador#LAS", region: "LAS" });
    assert.deepEqual(validateChallengeRequest(inherited), {
      ok: false,
      status: 400,
      error: RIOT_ERRORS.invalidRiotId,
    });
  });
});
