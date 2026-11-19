import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  isApexLolTier,
  isRemakeMatch,
  parseRiotAccount,
  parseRiotMatch,
  parseRiotSoloRank,
  parseRiotSummoner,
  REMAKE_MAX_DURATION_SECONDS,
  roundDurationMinutes,
} from "../../src/domain/riotData.ts";
import { normalizeRank } from "../../src/domain/rankScale.ts";

// Spec 014, RF-11, RF-12, RF-13, RF-31, RF-34, RF-36, RF-52; D35, D36, D48, D73, D83, D86,
// D92, D94, D96; plan §§2.1, 4, P14-8, O-5 y 8.1. Sin red, reloj ni base de datos.

const NOW = new Date("2026-11-19T12:00:00.000Z");

describe("parseRiotAccount (RF-34, RF-52, D86)", () => {
  test("extrae puuid, gameName, tagLine y riotId conservando mayúsculas de Riot", () => {
    const res = parseRiotAccount({
      puuid: "abc-123-puuid",
      gameName: "Faker",
      tagLine: "KR1",
    });
    assert.deepStrictEqual(res, {
      ok: true,
      account: {
        puuid: "abc-123-puuid",
        gameName: "Faker",
        tagLine: "KR1",
        riotId: "Faker#KR1",
      },
    });
  });

  test("rechaza payload no objeto o con campos faltantes/vacíos/no texto", () => {
    for (const bad of [
      null,
      undefined,
      "texto",
      [],
      {},
      { puuid: "", gameName: "Ana", tagLine: "LAS" },
      { puuid: "   ", gameName: "Ana", tagLine: "LAS" },
      { puuid: "p1", gameName: "", tagLine: "LAS" },
      { puuid: "p1", gameName: "Ana", tagLine: "" },
      { puuid: 123, gameName: "Ana", tagLine: "LAS" },
      { puuid: "p1", gameName: "Ana" },
    ]) {
      assert.deepStrictEqual(parseRiotAccount(bad), { ok: false });
    }
  });
});

describe("parseRiotSummoner (RF-52, D92, D94)", () => {
  test("devuelve profileIconId y level cuando ambos son enteros válidos", () => {
    assert.deepStrictEqual(
      parseRiotSummoner({ profileIconId: 12, summonerLevel: 245 }),
      { ok: true, profileIconId: 12, level: 245 },
    );
    assert.deepStrictEqual(
      parseRiotSummoner({ profileIconId: 0, summonerLevel: 1 }),
      { ok: true, profileIconId: 0, level: 1 },
    );
  });

  test("separa ícono de nivel: ícono válido con nivel faltante o ilegible devuelve ok:true y level:null (D92, D94)", () => {
    for (const raw of [
      { profileIconId: 7 },
      { profileIconId: 7, summonerLevel: null },
      { profileIconId: 7, summonerLevel: "245" },
      { profileIconId: 7, summonerLevel: 0 },
      { profileIconId: 7, summonerLevel: -5 },
      { profileIconId: 7, summonerLevel: 12.5 },
      { profileIconId: 7, summonerLevel: Number.NaN },
      { profileIconId: 7, summonerLevel: Number.POSITIVE_INFINITY },
    ]) {
      assert.deepStrictEqual(parseRiotSummoner(raw), {
        ok: true,
        profileIconId: 7,
        level: null,
      });
    }
  });

  test("ícono faltante, negativo, decimal o no número devuelve ok:false (D94)", () => {
    for (const bad of [
      null,
      undefined,
      [],
      {},
      { summonerLevel: 100 },
      { profileIconId: -1, summonerLevel: 100 },
      { profileIconId: 3.5, summonerLevel: 100 },
      { profileIconId: "12", summonerLevel: 100 },
      { profileIconId: Number.NaN, summonerLevel: 100 },
    ]) {
      assert.deepStrictEqual(parseRiotSummoner(bad), { ok: false });
    }
  });
});

describe("parseRiotSoloRank (RF-13, RF-31, RF-36, RF-52, D36, D48, D73, D96)", () => {
  test("lista vacía o sin RANKED_SOLO_5x5 devuelve unranked (RF-13)", () => {
    assert.deepStrictEqual(parseRiotSoloRank([], NOW), { ok: true, kind: "unranked" });
    assert.deepStrictEqual(
      parseRiotSoloRank(
        [{ queueType: "RANKED_FLEX_SR", tier: "GOLD", rank: "II", leaguePoints: 40 }],
        NOW,
      ),
      { ok: true, kind: "unranked" },
    );
  });

  test("toma RANKED_SOLO_5x5 y guarda tier/division crudos + canonicalTier + normalized (RF-36, D48)", () => {
    const res = parseRiotSoloRank(
      [
        { queueType: "RANKED_FLEX_SR", tier: "SILVER", rank: "IV", leaguePoints: 10 },
        { queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 45 },
      ],
      NOW,
    );
    assert.deepStrictEqual(res, {
      ok: true,
      kind: "ranked",
      snapshot: {
        tier: "GOLD",
        division: "II",
        points: 45,
        normalized: normalizeRank("lol", "Gold", "II"),
        recordedAt: NOW,
        canonicalTier: "Gold",
      },
    });
  });

  test("acepta Challenger con 1450 LP (sin tope) y omite división I (RF-31, RF-36, D73)", () => {
    const res = parseRiotSoloRank(
      [{ queueType: "RANKED_SOLO_5x5", tier: "CHALLENGER", rank: "I", leaguePoints: 1450 }],
      NOW,
    );
    assert.strictEqual(res.ok, true);
    if (res.ok && res.kind === "ranked") {
      assert.strictEqual(res.snapshot.tier, "CHALLENGER");
      assert.strictEqual(Object.hasOwn(res.snapshot, "division"), false);
      assert.strictEqual(res.snapshot.points, 1450);
      assert.strictEqual(res.snapshot.canonicalTier, "Challenger");
      assert.strictEqual(res.snapshot.normalized, 100);
    } else {
      assert.fail("esperaba ranked");
    }
  });

  test("MASTER, GRANDMASTER y CHALLENGER ignoran cualquier división (D73, D96)", () => {
    assert.strictEqual(isApexLolTier("MASTER"), true);
    assert.strictEqual(isApexLolTier("GRANDMASTER"), true);
    assert.strictEqual(isApexLolTier("CHALLENGER"), true);
    assert.strictEqual(isApexLolTier("DIAMOND"), false);

    for (const [tier, canonical, rawRank] of [
      ["MASTER", "Master", "I"],
      ["GRANDMASTER", "Grandmaster", "V"],
      ["CHALLENGER", "Challenger", undefined],
    ] as const) {
      const entry =
        rawRank === undefined
          ? { queueType: "RANKED_SOLO_5x5", tier, leaguePoints: 0 }
          : { queueType: "RANKED_SOLO_5x5", tier, rank: rawRank, leaguePoints: 320 };
      const res = parseRiotSoloRank([entry], NOW);
      assert.strictEqual(res.ok, true);
      if (res.ok && res.kind === "ranked") {
        assert.strictEqual(res.snapshot.tier, tier);
        assert.strictEqual(Object.hasOwn(res.snapshot, "division"), false);
        assert.strictEqual(res.snapshot.canonicalTier, canonical);
        assert.strictEqual(res.snapshot.normalized, normalizeRank("lol", canonical));
      } else {
        assert.fail(`esperaba ranked para ${tier}`);
      }
    }
  });

  test("división desconocida en tier con divisiones no es fallo y normaliza a la división más baja (D96)", () => {
    const res = parseRiotSoloRank(
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "V", leaguePoints: 25 }],
      NOW,
    );
    assert.deepStrictEqual(res, {
      ok: true,
      kind: "ranked",
      snapshot: {
        tier: "GOLD",
        division: "V",
        points: 25,
        normalized: normalizeRank("lol", "Gold", "IV"),
        recordedAt: NOW,
        canonicalTier: "Gold",
      },
    });
  });

  test("tier desconocido fuera de escala no es fallo, omite canonicalTier y normaliza a 0 (RF-36, D62)", () => {
    const res = parseRiotSoloRank(
      [{ queueType: "RANKED_SOLO_5x5", tier: "MYTHIC", rank: "II", leaguePoints: 80 }],
      NOW,
    );
    assert.strictEqual(res.ok, true);
    if (res.ok && res.kind === "ranked") {
      assert.strictEqual(res.snapshot.tier, "MYTHIC");
      assert.strictEqual(res.snapshot.division, "II");
      assert.strictEqual(Object.hasOwn(res.snapshot, "canonicalTier"), false);
      assert.strictEqual(res.snapshot.normalized, 0);
      assert.strictEqual(res.snapshot.points, 80);
    } else {
      assert.fail("esperaba ranked");
    }
  });

  test("LP negativos, decimales o faltantes y payloads rotos devuelven ok:false (RF-31, RF-52)", () => {
    for (const bad of [
      null,
      undefined,
      {},
      "no-array",
      [null],
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: -1 }],
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 12.5 }],
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: "50" }],
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II" }],
      [{ queueType: "RANKED_SOLO_5x5", tier: "", rank: "II", leaguePoints: 50 }],
      [{ queueType: "RANKED_SOLO_5x5", rank: "II", leaguePoints: 50 }],
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", leaguePoints: 50 }],
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "", leaguePoints: 50 }],
      [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: 2, leaguePoints: 50 }],
    ]) {
      assert.deepStrictEqual(parseRiotSoloRank(bad, NOW), { ok: false });
    }
  });
});

describe("roundDurationMinutes (RF-12, D35)", () => {
  test("redondea al minuto más cercano con mitades hacia arriba: 1769 s → 29 y 1770 s → 30", () => {
    assert.strictEqual(roundDurationMinutes(1769), 29);
    assert.strictEqual(roundDurationMinutes(1770), 30);
    assert.strictEqual(roundDurationMinutes(0), 0);
    assert.strictEqual(roundDurationMinutes(29), 0);
    assert.strictEqual(roundDurationMinutes(30), 1);
    assert.strictEqual(roundDurationMinutes(89), 1);
    assert.strictEqual(roundDurationMinutes(90), 2);
  });
});

describe("isRemakeMatch (RF-11, P14-8, O-5)", () => {
  test("earlySurrender con duración < 300 s es remake; FF15 (900 s) o 300 s exactos no lo son", () => {
    assert.strictEqual(REMAKE_MAX_DURATION_SECONDS, 300);
    assert.strictEqual(isRemakeMatch(180, true, "GameComplete"), true);
    assert.strictEqual(isRemakeMatch(299, true, "GameComplete"), true);
    assert.strictEqual(isRemakeMatch(300, true, "GameComplete"), false);
    assert.strictEqual(isRemakeMatch(900, true, "GameComplete"), false); // FF15
    assert.strictEqual(isRemakeMatch(180, false, "GameComplete"), false);
  });

  test("endOfGameResult === Abort_Unexpected es siempre remake", () => {
    assert.strictEqual(isRemakeMatch(1200, false, "Abort_Unexpected"), true);
    assert.strictEqual(isRemakeMatch(0, false, "Abort_Unexpected"), true);
  });
});

describe("parseRiotMatch (RF-11, RF-12, RF-36, RF-52, D35, D83, O-5)", () => {
  const PUUID = "puuid-jugador";
  const END_TS = Date.parse("2026-11-19T10:30:00.000Z");

  function rawMatch(overrides?: {
    matchId?: unknown;
    info?: Record<string, unknown>;
    participant?: Record<string, unknown>;
  }) {
    return {
      metadata: {
        matchId: overrides?.matchId ?? "LA2_1001",
      },
      info: {
        queueId: 420,
        gameDuration: 1770,
        gameEndTimestamp: END_TS,
        endOfGameResult: "GameComplete",
        participants: [
          {
            puuid: "otro-puuid",
            championName: "Ahri",
            kills: 2,
            deaths: 5,
            assists: 4,
            win: false,
            gameEndedInEarlySurrender: false,
          },
          {
            puuid: PUUID,
            championName: "MonkeyKing",
            kills: 9,
            deaths: 2,
            assists: 11,
            win: true,
            gameEndedInEarlySurrender: false,
            ...overrides?.participant,
          },
        ],
        ...overrides?.info,
      },
    };
  }

  test("parsea una partida Solo/Dúo válida conservando campeón de Riot, duración redondeada y sin rankDelta", () => {
    const res = parseRiotMatch(rawMatch(), PUUID);
    assert.deepStrictEqual(res, {
      kind: "match",
      match: {
        id: "LA2_1001",
        gameId: "lol",
        playedAt: new Date(END_TS),
        result: "win",
        summary: "MonkeyKing · 9/2/11",
        durationMinutes: 30,
      },
    });
    if (res.kind === "match") {
      assert.strictEqual(Object.hasOwn(res.match, "rankDelta"), false);
    }
  });

  test("FF15 (earlySurrender true con 900 s) se conserva como derrota válida (O-5)", () => {
    const res = parseRiotMatch(
      rawMatch({
        info: { gameDuration: 900 },
        participant: { win: false, gameEndedInEarlySurrender: true },
      }),
      PUUID,
    );
    assert.strictEqual(res.kind, "match");
    if (res.kind === "match") {
      assert.strictEqual(res.match.result, "loss");
      assert.strictEqual(res.match.durationMinutes, 15);
    }
  });

  test("remake (< 300 s con earlySurrender o Abort_Unexpected) devuelve kind: remake", () => {
    assert.deepStrictEqual(
      parseRiotMatch(
        rawMatch({
          info: { gameDuration: 195 },
          participant: { win: false, gameEndedInEarlySurrender: true },
        }),
        PUUID,
      ),
      { kind: "remake" },
    );
    assert.deepStrictEqual(
      parseRiotMatch(
        rawMatch({
          info: { gameDuration: 400, endOfGameResult: "Abort_Unexpected" },
        }),
        PUUID,
      ),
      { kind: "remake" },
    );
  });

  test("usa gameStartTimestamp o gameCreation si falta gameEndTimestamp", () => {
    const startTs = Date.parse("2026-11-18T18:00:00.000Z");
    const res = parseRiotMatch(
      rawMatch({ info: { gameEndTimestamp: undefined, gameStartTimestamp: startTs, gameDuration: 1769 } }),
      PUUID,
    );
    assert.strictEqual(res.kind, "match");
    if (res.kind === "match") {
      assert.deepStrictEqual(res.match.playedAt, new Date(startTs));
      assert.strictEqual(res.match.durationMinutes, 29);
    }
  });

  test("datos faltantes, resultado no booleano, participante ausente o cola distinta devuelven invalid (RF-52, D83)", () => {
    for (const bad of [
      null,
      {},
      rawMatch({ matchId: "" }),
      rawMatch({ info: { queueId: 440 } }),
      rawMatch({ info: { gameDuration: -10 } }),
      rawMatch({ info: { gameEndTimestamp: undefined, gameStartTimestamp: undefined, gameCreation: undefined } }),
      rawMatch({ participant: { puuid: "otro" } }),
      rawMatch({ participant: { win: undefined } }),
      rawMatch({ participant: { win: "win" } }),
      rawMatch({ participant: { championName: "" } }),
      rawMatch({ participant: { kills: -1 } }),
      rawMatch({ participant: { deaths: 1.5 } }),
      rawMatch({ participant: { assists: "3" } }),
    ]) {
      assert.deepStrictEqual(parseRiotMatch(bad, PUUID), { kind: "invalid" });
    }
  });
});
