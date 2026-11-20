// Spec 010 (RF-6): el usuario de MongoDB del servidor del curso no puede usar una base propia
// (`not authorized on teammatchup_7041`, código 13), así que los datos viven en la base
// compartida `fullstack`. Para no mezclarse con las colecciones de otros grupos, todas las
// del proyecto llevan el prefijo `tmu_` en todos los entornos.
export const COLLECTION_PREFIX = "tmu_";

export const COLLECTIONS = {
  users: `${COLLECTION_PREFIX}users`,
  gameAccounts: `${COLLECTION_PREFIX}gameaccounts`,
  playSessions: `${COLLECTION_PREFIX}playsessions`,
  steamAttempts: `${COLLECTION_PREFIX}steamattempts`,
  riotChallenges: `${COLLECTION_PREFIX}riotchallenges`,
} as const;
