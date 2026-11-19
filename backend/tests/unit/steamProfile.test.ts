import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CS2_APP_ID, minutesToHours, steamProfileFrom } from "../../src/domain/steamProfile.ts";

// Spec 013, RF-10, RF-11, RF-17, RF-18, RF-19, D7, D9; plan, 4.3 y P13-11 a P13-15
// (`steamProfile`).

const AVATAR = "https://avatars.fastly.steamstatic.com/abcdef0123456789_full.jpg";

const publicSummary = { personaname: "Vicho", avatarfull: AVATAR, loccountrycode: "CL" };
const publicOwned = {
  game_count: 2,
  games: [
    { appid: 440, playtime_forever: 100 },
    { appid: 730, playtime_forever: 18_720, playtime_2weeks: 1_135 },
  ],
};

describe("minutesToHours (RF-18, D9)", () => {
  test("redondea hacia abajo", () => {
    assert.equal(minutesToHours(0), 0);
    assert.equal(minutesToHours(59), 0);
    assert.equal(minutesToHours(60), 1);
    assert.equal(minutesToHours(61), 1);
    assert.equal(minutesToHours(119), 1);
    assert.equal(minutesToHours(18_720), 312);
  });

  test("un valor negativo o que no es número finito cuenta como 0", () => {
    assert.equal(minutesToHours(-5), 0);
    assert.equal(minutesToHours(Number.NaN), 0);
    assert.equal(minutesToHours(Number.POSITIVE_INFINITY), 0);
  });
});

describe("steamProfileFrom — perfil público (RF-10)", () => {
  test("nombre, avatar, país y horas de CS2 (total y últimas dos semanas)", () => {
    assert.equal(CS2_APP_ID, 730);
    assert.deepEqual(steamProfileFrom(publicSummary, publicOwned), {
      displayName: "Vicho",
      avatarUrl: AVATAR,
      country: "CL",
      hoursTotal: 312,
      hoursRecent: 18,
    });
  });

  test("no marca isPrivate (el estado privado se deduce por dato, P13-15)", () => {
    assert.equal("isPrivate" in steamProfileFrom(publicSummary, publicOwned), false);
  });

  test("el país en minúscula se normaliza a mayúscula", () => {
    assert.equal(steamProfileFrom({ ...publicSummary, loccountrycode: "cl" }, publicOwned).country, "CL");
  });

  test("no modifica los datos recibidos", () => {
    const summary = Object.freeze({ ...publicSummary });
    const owned = Object.freeze({ game_count: 1, games: Object.freeze([Object.freeze({ appid: 730, playtime_forever: 60 })]) });
    assert.equal(steamProfileFrom(summary, owned).hoursTotal, 1);
  });
});

describe("steamProfileFrom — cada dato por separado (RF-11, D7)", () => {
  test("sin país: no se inventa; nombre, avatar y horas siguen", () => {
    const profile = steamProfileFrom({ personaname: "Vicho", avatarfull: AVATAR }, publicOwned);
    assert.equal("country" in profile, false);
    assert.equal(profile.displayName, "Vicho");
    assert.equal(profile.hoursTotal, 312);
  });

  test("país que no son dos letras se descarta", () => {
    for (const country of ["", "C", "CHL", "C1", "  ", 56, null]) {
      assert.equal("country" in steamProfileFrom({ ...publicSummary, loccountrycode: country }, publicOwned), false);
    }
  });

  test("sin lista de juegos (respuesta vacía): no hay horas, y el país sigue", () => {
    for (const owned of [undefined, {}, { games: [] }, { game_count: "3" }]) {
      const profile = steamProfileFrom(publicSummary, owned);
      assert.equal("hoursTotal" in profile, false);
      assert.equal("hoursRecent" in profile, false);
      assert.equal(profile.country, "CL");
    }
  });

  test("perfil público con detalles de juego privados: país visible y sin horas", () => {
    assert.deepEqual(steamProfileFrom(publicSummary, {}), {
      displayName: "Vicho",
      avatarUrl: AVATAR,
      country: "CL",
    });
  });

  test("perfil privado: solo lo que Steam siempre entrega", () => {
    assert.deepEqual(steamProfileFrom({ personaname: "Anon", avatarfull: AVATAR }, {}), {
      displayName: "Anon",
      avatarUrl: AVATAR,
    });
  });

  test("sin resumen: perfil vacío, solo con las horas si la lista está", () => {
    assert.deepEqual(steamProfileFrom(undefined, undefined), {});
    assert.deepEqual(steamProfileFrom(undefined, publicOwned), { hoursTotal: 312, hoursRecent: 18 });
  });
});

describe("steamProfileFrom — horas de CS2 (RF-17, RF-18)", () => {
  test("lista entregada sin CS2: 0 h y 0 h (D1, D7)", () => {
    const profile = steamProfileFrom(publicSummary, { game_count: 1, games: [{ appid: 440, playtime_forever: 5000 }] });
    assert.equal(profile.hoursTotal, 0);
    assert.equal(profile.hoursRecent, 0);
  });

  test("lista entregada y vacía (game_count 0, sin games): 0 h", () => {
    const profile = steamProfileFrom(publicSummary, { game_count: 0 });
    assert.equal(profile.hoursTotal, 0);
    assert.equal(profile.hoursRecent, 0);
  });

  test("CS2 sin juego reciente (sin playtime_2weeks): total real y 0 h recientes", () => {
    const profile = steamProfileFrom(publicSummary, { game_count: 1, games: [{ appid: 730, playtime_forever: 130 }] });
    assert.equal(profile.hoursTotal, 2);
    assert.equal(profile.hoursRecent, 0);
  });

  test("61 minutos son 1 h y 59 son 0 h", () => {
    assert.equal(steamProfileFrom(publicSummary, { game_count: 1, games: [{ appid: 730, playtime_forever: 61 }] }).hoursTotal, 1);
    assert.equal(steamProfileFrom(publicSummary, { game_count: 1, games: [{ appid: 730, playtime_forever: 59 }] }).hoursTotal, 0);
  });

  test("entradas mal formadas en games se ignoran sin romper", () => {
    const owned = { game_count: 3, games: [null, "x", { appid: "730", playtime_forever: 9999 }, { appid: 730, playtime_forever: "mucho" }] };
    const profile = steamProfileFrom(publicSummary, owned);
    assert.equal(profile.hoursTotal, 0);
    assert.equal(profile.hoursRecent, 0);
  });
});

describe("steamProfileFrom — nombre (RF-19)", () => {
  test("se entrega tal como viene, solo sin caracteres de control y sin espacios en los extremos", () => {
    assert.equal(steamProfileFrom({ personaname: "  Ñandú ☆ <b>x</b>  " }, undefined).displayName, "Ñandú ☆ <b>x</b>");
    assert.equal(steamProfileFrom({ personaname: "Vi\u0000ch\u001fo\u007f\u0085" }, undefined).displayName, "Vicho");
  });

  test("un nombre vacío o que no es texto se omite", () => {
    for (const name of ["", "   ", "\u0000\u0001", 12, null, {}]) {
      assert.equal("displayName" in steamProfileFrom({ personaname: name }, undefined), false);
    }
  });

  test("se limita a 128 caracteres para proteger el almacenamiento", () => {
    assert.equal(steamProfileFrom({ personaname: "a".repeat(500) }, undefined).displayName?.length, 128);
  });
});

describe("steamProfileFrom — avatar (P13-14, RF-19)", () => {
  test("acepta https de los dominios de Steam", () => {
    for (const url of [
      "https://avatars.akamai.steamstatic.com/x_full.jpg",
      "https://avatars.fastly.steamstatic.com/x_full.jpg",
      "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/x_full.jpg",
    ]) {
      assert.equal(steamProfileFrom({ avatarfull: url }, undefined).avatarUrl, url);
    }
  });

  test("descarta http, otros dominios, parecidos engañosos, credenciales y no-URL", () => {
    for (const url of [
      "http://avatars.fastly.steamstatic.com/x_full.jpg",
      "https://evil.example/steamstatic.com/x.jpg",
      "https://steamstatic.com.evil.example/x.jpg",
      "https://notsteamstatic.com/x.jpg",
      "https://usuario:clave@avatars.fastly.steamstatic.com/x.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "//avatars.fastly.steamstatic.com/x.jpg",
      "no es una url",
      "",
      42,
      null,
    ]) {
      assert.equal("avatarUrl" in steamProfileFrom({ avatarfull: url }, undefined), false, String(url));
    }
  });

  test("una URL demasiado larga se descarta", () => {
    const largo = `https://avatars.fastly.steamstatic.com/${"a".repeat(600)}.jpg`;
    assert.equal("avatarUrl" in steamProfileFrom({ avatarfull: largo }, undefined), false);
  });
});
