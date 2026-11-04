import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  assembleCandidates,
  buildMatches,
  compareByCodePoint,
  compareCandidates,
  foldText,
  matchesSearch,
  rankDistance,
  scoreCandidate,
} from "../../src/domain/matching.ts";
import type {
  CandidateInput,
  CandidateUser,
  MatchCandidate,
  RankedAccount,
} from "../../src/domain/matching.ts";
import type { MatchCriteria } from "../../src/domain/matchQuery.ts";
import { ladder, normalizeStep } from "../../src/domain/rankScale.ts";
import type { GameId } from "../../src/domain/games.ts";

// Spec 005, RF-2, RF-3 (distancia y puntaje), RF-4, RF-7, RF-8, RF-9, RF-17, DP5-7, DP5-8,
// DP5-11, DP5-12, DP-26, RNF-1; plan, secciones 3.3 a 3.5 y 8. Sin base de datos ni reloj.

const GAME_IDS: readonly GameId[] = ["lol", "r6", "cs2"];

/** Fotografía de rango como la guarda la 004: escalón, puntos y valor normalizado. */
function snapshot(gameId: GameId, stepIndex: number, points: number) {
  const step = ladder(gameId)[stepIndex];
  assert.notStrictEqual(step, undefined);
  return { ...step, points, normalized: normalizeStep(gameId, stepIndex) };
}

// Referencia derivada de otra forma (plan, sección 8): todo por 800 en BigInt.
//   valor exacto = (440·R + 45·mín(800, 100·b)) / 800, redondeo con mitades hacia arriba.
function referenceScore(distance: number, sharedCount: number): number {
  const rankPart = BigInt(Math.max(0, 100 - 4 * distance));
  const hoursPart = BigInt(Math.min(800, 100 * sharedCount));
  const numerator = 440n * rankPart + 45n * hoursPart;
  const denominator = 800n;
  return Number((2n * numerator + denominator) / (2n * denominator));
}

describe("distancia", () => {
  test("es el valor absoluto de la diferencia de los normalizados", () => {
    assert.strictEqual(rankDistance({ normalized: 40 }, { normalized: 40 }), 0);
    assert.strictEqual(rankDistance({ normalized: 40 }, { normalized: 55 }), 15);
    assert.strictEqual(rankDistance({ normalized: 0 }, { normalized: 100 }), 100);
  });

  test("es simétrica", () => {
    for (const a of [0, 3, 17, 50, 99, 100]) {
      for (const b of [0, 1, 22, 64, 100]) {
        assert.strictEqual(
          rankDistance({ normalized: a }, { normalized: b }),
          rankDistance({ normalized: b }, { normalized: a }),
          `(${a}, ${b})`,
        );
      }
    }
  });

  for (const gameId of GAME_IDS) {
    test(`mismo escalón con distintos puntos → 0 en ${gameId}`, () => {
      const steps = ladder(gameId).length;
      for (const stepIndex of [0, Math.floor(steps / 2), steps - 1]) {
        const low = snapshot(gameId, stepIndex, 0);
        const high = snapshot(gameId, stepIndex, 99);
        assert.notStrictEqual(low.points, high.points);
        assert.strictEqual(rankDistance(low, high), 0, `escalón ${stepIndex}`);
        assert.strictEqual(rankDistance(high, low), 0, `escalón ${stepIndex}`);
      }
    });

    test(`escalones distintos → distancia positiva igual a la diferencia en ${gameId}`, () => {
      const last = ladder(gameId).length - 1;
      const bottom = snapshot(gameId, 0, 0);
      const top = snapshot(gameId, last, 0);
      assert.strictEqual(rankDistance(bottom, top), 100);
      const next = snapshot(gameId, 1, 0);
      assert.strictEqual(rankDistance(bottom, next), next.normalized - bottom.normalized);
      assert.ok(rankDistance(bottom, next) > 0);
    });
  }
});

describe("puntaje", () => {
  test("ejemplos del plan, sección 3.3", () => {
    assert.strictEqual(scoreCandidate(0, 4), 78);
    assert.strictEqual(scoreCandidate(0, 8), 100);
    assert.strictEqual(scoreCandidate(0, 168), 100);
    assert.strictEqual(scoreCandidate(25, 0), 0);
    assert.strictEqual(scoreCandidate(0, 0), 55);
    assert.strictEqual(scoreCandidate(24, 0), 2);
    assert.strictEqual(scoreCandidate(1, 1), 58);
    assert.strictEqual(scoreCandidate(2, 3), 67);
  });

  test("redondeo escrito a mano y mitades exactas hacia arriba", () => {
    // d = 0, b = 1: 0,55·100 + 0,45·12,5 = 60,625 → 61.
    assert.strictEqual(scoreCandidate(0, 1), 61);
    // d = 0, b = 2: 55 + 11,25 = 66,25 → 66.
    assert.strictEqual(scoreCandidate(0, 2), 66);
    // d = 24, b = 4: 0,55·4 + 0,45·50 = 2,2 + 22,5 = 24,7 → 25.
    assert.strictEqual(scoreCandidate(24, 4), 25);
    // d = 25, b = 1: 0 + 0,45·12,5 = 5,625 → 6.
    assert.strictEqual(scoreCandidate(25, 1), 6);
    // Toda mitad exacta de la rejilla (N mod 40 = 20) sube al entero siguiente.
    let halves = 0;
    for (let distance = 0; distance <= 100; distance += 1) {
      for (let shared = 0; shared <= 168; shared += 1) {
        const rankPart = Math.max(0, 100 - 4 * distance);
        const times40 = 22 * rankPart + Math.min(1800, 225 * shared);
        if (times40 % 40 === 20) {
          halves += 1;
          assert.strictEqual(scoreCandidate(distance, shared), (times40 + 20) / 40);
        }
      }
    }
    assert.ok(halves > 0, "la rejilla contiene mitades exactas");
  });

  test("recorrido exhaustivo d = 0..100 × b = 0..168 contra la referencia en BigInt", () => {
    for (let distance = 0; distance <= 100; distance += 1) {
      for (let shared = 0; shared <= 168; shared += 1) {
        const actual = scoreCandidate(distance, shared);
        assert.strictEqual(actual, referenceScore(distance, shared), `(${distance}, ${shared})`);
        assert.ok(Number.isInteger(actual), `(${distance}, ${shared}) es entero`);
        assert.ok(actual >= 0 && actual <= 100, `(${distance}, ${shared}) en 0..100`);
      }
    }
  });

  test("más allá de 8 bloques el aporte de horas no crece", () => {
    for (const distance of [0, 7, 30]) {
      assert.strictEqual(scoreCandidate(distance, 8), scoreCandidate(distance, 168));
      assert.strictEqual(scoreCandidate(distance, 8), scoreCandidate(distance, 1000));
    }
  });

  test("es monótono: más distancia nunca sube el puntaje y más bloques nunca lo bajan", () => {
    for (let shared = 0; shared <= 168; shared += 6) {
      for (let distance = 0; distance < 100; distance += 1) {
        assert.ok(scoreCandidate(distance + 1, shared) <= scoreCandidate(distance, shared));
      }
    }
    for (let distance = 0; distance <= 100; distance += 5) {
      for (let shared = 0; shared < 168; shared += 1) {
        assert.ok(scoreCandidate(distance, shared + 1) >= scoreCandidate(distance, shared));
      }
    }
  });
});

// ---------------------------------------------------------------------------------------
// Datos de prueba para búsqueda, filtros, orden y armado.

interface TestAccount extends RankedAccount {
  id: string;
  gameId: GameId;
  simulated: true;
}

function makeUser(username: string, displayName = username): CandidateUser {
  return {
    id: `id-${username}`,
    username,
    displayName,
    avatarColor: "#123456",
    bio: "",
    timezone: "America/Santiago",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeAccount(userId: string, normalized: number, verified = false): TestAccount {
  return {
    id: `acc-${userId}`,
    userId,
    gameId: "lol",
    currentRank: { normalized },
    verified,
    simulated: true,
  };
}

function makeCandidate(
  username: string,
  normalized: number,
  blocks: readonly string[],
  options: { verified?: boolean; displayName?: string } = {},
): CandidateInput<TestAccount> {
  const user = makeUser(username, options.displayName);
  return {
    user,
    account: makeAccount(user.id, normalized, options.verified ?? false),
    blocks,
  };
}

const NO_FILTERS: MatchCriteria = {
  gameId: "lol",
  maxRankDistance: 100,
  minSharedHours: 0,
  onlyVerified: false,
  search: null,
};

const VIEWER_BLOCKS: readonly string[] = ["0-1", "0-2", "0-3", "0-4", "1-1", "1-2", "1-3", "1-4"];

const VIEWER = {
  userId: "id-viewer",
  account: { userId: "id-viewer", currentRank: { normalized: 50 }, verified: true },
  blocks: VIEWER_BLOCKS,
};

function names(matches: readonly MatchCandidate<TestAccount>[]): string[] {
  return matches.map((match) => match.user.username);
}

describe("búsqueda", () => {
  test("foldText normaliza a NFC y pasa a minúsculas", () => {
    assert.strictEqual(foldText("ÑANDÚ"), "ñandú");
    assert.strictEqual(foldText("a\u0301"), "\u00e1");
    assert.strictEqual(foldText(""), "");
  });

  test("null no filtra", () => {
    assert.strictEqual(matchesSearch(makeUser("ana"), null), true);
  });

  test("busca en el nombre visible y en el nombre de usuario, sin importar mayúsculas", () => {
    const user = makeUser("zeta99", "Ana Pérez");
    assert.strictEqual(matchesSearch(user, "ana"), true);
    assert.strictEqual(matchesSearch(user, "PÉREZ"), true);
    assert.strictEqual(matchesSearch(user, "ZETA"), true);
    assert.strictEqual(matchesSearch(user, "a9"), true);
    assert.strictEqual(matchesSearch(user, "luis"), false);
  });

  test("es literal: a.b, .*, ( y [ no tienen significado especial", () => {
    const dotted = makeUser("a.b");
    const plain = makeUser("axb");
    assert.strictEqual(matchesSearch(dotted, "a.b"), true);
    assert.strictEqual(matchesSearch(plain, "a.b"), false);

    const star = makeUser("pro.*gamer");
    assert.strictEqual(matchesSearch(star, ".*"), true);
    assert.strictEqual(matchesSearch(makeUser("progamer"), ".*"), false);

    const paren = makeUser("ana(2)");
    assert.strictEqual(matchesSearch(paren, "("), true);
    assert.strictEqual(matchesSearch(makeUser("ana2"), "("), false);

    const bracket = makeUser("x[1]");
    assert.strictEqual(matchesSearch(bracket, "["), true);
    assert.strictEqual(matchesSearch(makeUser("x1"), "["), false);
  });

  test("ÑANDÚ encuentra a Ñandú; nandu no", () => {
    const user = makeUser("jugador1", "Ñandú");
    assert.strictEqual(matchesSearch(user, "ÑANDÚ"), true);
    assert.strictEqual(matchesSearch(user, "ñandú"), true);
    assert.strictEqual(matchesSearch(user, "nandu"), false);
  });

  test("una a no encuentra á, ni siquiera descompuesta en NFD", () => {
    const composed = makeUser("x1", "\u00e1ngel");
    const decomposed = makeUser("x2", "a\u0301ngel");
    assert.strictEqual(matchesSearch(composed, "a"), false);
    assert.strictEqual(matchesSearch(decomposed, "a"), false);
    assert.strictEqual(matchesSearch(composed, "á"), true);
    // La búsqueda en NFD también encuentra el nombre compuesto, y viceversa.
    assert.strictEqual(matchesSearch(composed, "a\u0301"), true);
    assert.strictEqual(matchesSearch(decomposed, "\u00e1"), true);
  });
});

describe("filtros", () => {
  const candidates = [
    makeCandidate("dist0", 50, VIEWER_BLOCKS),
    makeCandidate("dist20", 70, VIEWER_BLOCKS),
    makeCandidate("dist21", 71, VIEWER_BLOCKS),
  ];

  test("sin filtros no descarta a nadie", () => {
    assert.deepStrictEqual(names(buildMatches(NO_FILTERS, VIEWER, candidates)).sort(), [
      "dist0",
      "dist20",
      "dist21",
    ]);
  });

  test("distancia igual al máximo se conserva; mayor se descarta", () => {
    const result = buildMatches({ ...NO_FILTERS, maxRankDistance: 20 }, VIEWER, candidates);
    assert.deepStrictEqual(names(result).sort(), ["dist0", "dist20"]);
    const zero = buildMatches({ ...NO_FILTERS, maxRankDistance: 0 }, VIEWER, candidates);
    assert.deepStrictEqual(names(zero), ["dist0"]);
  });

  test("bloques en común iguales al mínimo se conservan; menos se descartan", () => {
    const shared = [
      makeCandidate("tres", 50, ["0-1", "0-2", "0-3"]),
      makeCandidate("dos", 50, ["0-1", "0-2"]),
      makeCandidate("ninguno", 50, ["6-23"]),
    ];
    const atMinimum = buildMatches({ ...NO_FILTERS, minSharedHours: 3 }, VIEWER, shared);
    assert.deepStrictEqual(names(atMinimum), ["tres"]);
    const two = buildMatches({ ...NO_FILTERS, minSharedHours: 2 }, VIEWER, shared);
    assert.deepStrictEqual(names(two), ["tres", "dos"]);
    const all = buildMatches({ ...NO_FILTERS, minSharedHours: 0 }, VIEWER, shared);
    assert.strictEqual(all.length, 3);
  });

  test("minSharedHours 168 no deja a nadie si el visitante tiene menos bloques", () => {
    const result = buildMatches({ ...NO_FILTERS, minSharedHours: 168 }, VIEWER, candidates);
    assert.deepStrictEqual(result, []);
  });

  test("solo verificadas deja únicamente las cuentas verificadas", () => {
    const mixed = [
      makeCandidate("verificada", 50, VIEWER_BLOCKS, { verified: true }),
      makeCandidate("sin_verificar", 50, VIEWER_BLOCKS, { verified: false }),
    ];
    const only = buildMatches({ ...NO_FILTERS, onlyVerified: true }, VIEWER, mixed);
    assert.deepStrictEqual(names(only), ["verificada"]);
    const all = buildMatches({ ...NO_FILTERS, onlyVerified: false }, VIEWER, mixed);
    assert.strictEqual(all.length, 2);
  });

  test("la búsqueda filtra por nombre visible o de usuario", () => {
    const people = [
      makeCandidate("a.b", 50, VIEWER_BLOCKS),
      makeCandidate("axb", 50, VIEWER_BLOCKS),
      makeCandidate("nando", 50, VIEWER_BLOCKS, { displayName: "Ñandú" }),
    ];
    assert.deepStrictEqual(
      names(buildMatches({ ...NO_FILTERS, search: "a.b" }, VIEWER, people)),
      ["a.b"],
    );
    assert.deepStrictEqual(
      names(buildMatches({ ...NO_FILTERS, search: "ÑANDÚ" }, VIEWER, people)),
      ["nando"],
    );
    assert.deepStrictEqual(buildMatches({ ...NO_FILTERS, search: "nandu" }, VIEWER, people), []);
  });

  test("los filtros se combinan (todos deben cumplirse)", () => {
    const people = [
      makeCandidate("ok", 52, VIEWER_BLOCKS, { verified: true }),
      makeCandidate("lejos", 90, VIEWER_BLOCKS, { verified: true }),
      makeCandidate("pocas_horas", 52, ["0-1"], { verified: true }),
      makeCandidate("no_verificada", 52, VIEWER_BLOCKS, { verified: false }),
      makeCandidate("otro_nombre", 52, VIEWER_BLOCKS, { verified: true, displayName: "Zed" }),
    ];
    const criteria: MatchCriteria = {
      gameId: "lol",
      maxRankDistance: 10,
      minSharedHours: 4,
      onlyVerified: true,
      search: "ok",
    };
    assert.deepStrictEqual(names(buildMatches(criteria, VIEWER, people)), ["ok"]);
  });

  test("el propio usuario se excluye aunque venga en la entrada", () => {
    const own: CandidateInput<TestAccount> = {
      user: makeUser("viewer"),
      account: makeAccount(VIEWER.userId, 50, true),
      blocks: VIEWER_BLOCKS,
    };
    const other = makeCandidate("otra", 50, VIEWER_BLOCKS);
    const result = buildMatches(NO_FILTERS, VIEWER, [own, other]);
    assert.deepStrictEqual(names(result), ["otra"]);
    assert.deepStrictEqual(buildMatches(NO_FILTERS, VIEWER, [own]), []);
  });

  test("sin candidatos devuelve una lista vacía", () => {
    assert.deepStrictEqual(buildMatches(NO_FILTERS, VIEWER, []), []);
  });

  test("un visitante sin bloques ve a todos con 0 bloques en común", () => {
    const result = buildMatches(NO_FILTERS, { ...VIEWER, blocks: [] }, candidates);
    assert.strictEqual(result.length, 3);
    for (const match of result) assert.deepStrictEqual(match.sharedBlocks, []);
  });
});

describe("orden", () => {
  function candidate(
    username: string,
    score: number,
    distance: number,
    shared: number,
  ): MatchCandidate<TestAccount> {
    return {
      user: makeUser(username),
      gameId: "lol",
      account: makeAccount(`id-${username}`, 0),
      rankDistance: distance,
      sharedBlocks: Array.from({ length: shared }, (_, index) => `0-${index}`),
      score,
    };
  }

  test("primero el mayor puntaje", () => {
    const high = candidate("zzz", 80, 9, 1);
    const low = candidate("aaa", 70, 0, 20);
    assert.ok(compareCandidates(high, low) < 0);
    assert.ok(compareCandidates(low, high) > 0);
  });

  test("a igual puntaje, la menor distancia", () => {
    const near = candidate("zzz", 70, 2, 1);
    const far = candidate("aaa", 70, 5, 20);
    assert.ok(compareCandidates(near, far) < 0);
    assert.ok(compareCandidates(far, near) > 0);
  });

  test("a igual puntaje y distancia, más bloques en común", () => {
    const many = candidate("zzz", 70, 2, 6);
    const few = candidate("aaa", 70, 2, 3);
    assert.ok(compareCandidates(many, few) < 0);
    assert.ok(compareCandidates(few, many) > 0);
  });

  test("a igual todo lo anterior, el nombre de usuario por código Unicode", () => {
    const first = candidate("Ana", 70, 2, 3);
    const second = candidate("ana", 70, 2, 3);
    // "A" (65) va antes que "a" (97): el orden no depende del idioma.
    assert.ok(compareCandidates(first, second) < 0);
    assert.ok(compareCandidates(second, first) > 0);
    assert.strictEqual(compareCandidates(first, first), 0);
  });

  test("buildMatches ordena por puntaje, distancia, bloques y nombre", () => {
    const nine = ["0-0", "0-1", "0-2", "0-3", "0-4", "0-5", "0-6", "0-7", "0-8"];
    const viewer = { ...VIEWER, blocks: nine };
    const people = [
      makeCandidate("z_bajo", 50, []), // (0, 0) → 55
      makeCandidate("b_lejos", 55, nine.slice(0, 6)), // (5, 6) → 78
      makeCandidate("m_nueve", 50, nine), // (0, 9) → 100
      makeCandidate("a_ocho", 50, nine.slice(0, 8)), // (0, 8) → 100
      makeCandidate("n_cerca", 50, nine.slice(0, 4)), // (0, 4) → 78
      makeCandidate("k_nueve", 50, nine), // (0, 9) → 100
    ];
    const result = buildMatches(NO_FILTERS, viewer, people);
    assert.deepStrictEqual(
      result.map((match) => [match.user.username, match.score, match.rankDistance]),
      [
        ["k_nueve", 100, 0], // empate total salvo el nombre: k antes que m
        ["m_nueve", 100, 0],
        ["a_ocho", 100, 0], // mismo puntaje y distancia, menos bloques
        ["n_cerca", 78, 0], // mismo puntaje que b_lejos, menor distancia
        ["b_lejos", 78, 5],
        ["z_bajo", 55, 0],
      ],
    );
  });

  test("compareByCodePoint compara por código Unicode, no por unidad UTF-16", () => {
    // "～" es U+FF5E (una unidad); U+1F600 son las unidades D83D DE00: con `<` saldría al revés.
    assert.ok(compareByCodePoint("～", "\u{1F600}") < 0);
    assert.ok(compareByCodePoint("\u{1F600}", "～") > 0);
    assert.ok("\u{1F600}" < "～", "con el operador < el resultado sería el contrario");
  });

  test("compareByCodePoint: primer código distinto decide; el prefijo más corto va primero", () => {
    assert.ok(compareByCodePoint("a", "b") < 0);
    assert.ok(compareByCodePoint("b", "a") > 0);
    assert.ok(compareByCodePoint("ab", "abc") < 0);
    assert.ok(compareByCodePoint("abc", "ab") > 0);
    assert.ok(compareByCodePoint("", "a") < 0);
    assert.ok(compareByCodePoint("a", "") > 0);
    assert.strictEqual(compareByCodePoint("abc", "abc"), 0);
    assert.strictEqual(compareByCodePoint("", ""), 0);
    assert.ok(compareByCodePoint("A", "a") < 0);
    assert.ok(compareByCodePoint("\u{1F600}", "\u{1F600}a") < 0);
  });
});

describe("armado", () => {
  test("assembleCandidates une cada cuenta con su dueño y omite las cuentas sin dueño", () => {
    const owned = makeAccount("id-ana", 40);
    const orphan = makeAccount("id-fantasma", 41);
    const second = makeAccount("id-beto", 42);
    const owners = new Map([
      ["id-ana", { user: makeUser("ana"), blocks: ["0-1"] }],
      ["id-beto", { user: makeUser("beto"), blocks: ["1-1", "1-2"] }],
    ]);
    const result = assembleCandidates([owned, orphan, second], owners);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0]?.account, owned);
    assert.strictEqual(result[0]?.user.username, "ana");
    assert.deepStrictEqual(result[0]?.blocks, ["0-1"]);
    assert.strictEqual(result[1]?.account, second);
    assert.strictEqual(result[1]?.user.username, "beto");
    assert.deepStrictEqual(result[1]?.blocks, ["1-1", "1-2"]);
  });

  test("assembleCandidates con listas vacías devuelve una lista vacía", () => {
    assert.deepStrictEqual(assembleCandidates([], new Map()), []);
    assert.deepStrictEqual(assembleCandidates([makeAccount("x", 1)], new Map()), []);
  });

  test("buildMatches devuelve el gameId del criterio y la misma cuenta recibida", () => {
    const input = makeCandidate("ana", 54, ["0-1", "0-2", "5-5"]);
    const criteria: MatchCriteria = { ...NO_FILTERS, gameId: "cs2" };
    const [match, ...rest] = buildMatches(criteria, VIEWER, [input]);
    assert.strictEqual(rest.length, 0);
    assert.ok(match);
    assert.strictEqual(match.gameId, "cs2");
    assert.strictEqual(match.account, input.account);
    assert.strictEqual(match.user, input.user);
    assert.strictEqual(match.rankDistance, 4);
    assert.deepStrictEqual(match.sharedBlocks, ["0-1", "0-2"]);
    assert.strictEqual(match.score, scoreCandidate(4, 2));
  });

  test("los bloques en común salen ordenados por día y hora, sin repetidos", () => {
    const viewer = { ...VIEWER, blocks: ["2-20", "0-23", "0-5", "0-5", "6-0"] };
    const input = makeCandidate("ana", 50, ["6-0", "0-5", "0-23", "2-20", "2-20", "3-3"]);
    const [match] = buildMatches(NO_FILTERS, viewer, [input]);
    assert.deepStrictEqual(match?.sharedBlocks, ["0-5", "0-23", "2-20", "6-0"]);
  });

  test("no modifica las entradas", () => {
    const blocks = ["0-2", "0-1"];
    const input = makeCandidate("ana", 50, blocks);
    const inputs = [input];
    const viewerBlocks = ["0-1", "0-2"];
    buildMatches(NO_FILTERS, { ...VIEWER, blocks: viewerBlocks }, inputs);
    assert.deepStrictEqual(blocks, ["0-2", "0-1"]);
    assert.deepStrictEqual(viewerBlocks, ["0-1", "0-2"]);
    assert.deepStrictEqual(inputs, [input]);
  });
});
