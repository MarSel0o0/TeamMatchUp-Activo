// Reloj de las cuentas de juego (spec 004, RNF-1, RNF-7, RNF-9; plan, P-5 y sección 9).
// Único punto donde se lee el instante actual; los controladores lo toman una vez por
// petición y las pruebas lo fijan con `t.mock.method(clock, "now", ...)`. No es el reloj de
// las credenciales (`now` de `createApp`, en segundos Unix), que no se toca.
export const clock = {
  now: (): Date => new Date(),
};
