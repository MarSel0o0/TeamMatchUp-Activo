// Autenticación: `POST /api/auth/login` (plan §3.6), `GET /api/auth/me` (§3.7) y
// `POST /api/auth/logout` (§3.8).
// RF-7, RF-8, RF-9, RF-13, RF-14, RF-16, RF-18, RF-19, RF-25, RF-26, RNF-2, RNF-4, RNF-5.
// - Login y logout son públicos; `me` es protegida con `withUser` (RF-26). El inicio de
//   sesión no escribe en la base: la credencial es sin estado (RNF-5).
// - Los atributos de la cookie salen siempre de `sessionCookieOptions` (D8), así el borrado
//   coincide con la emisión y `Secure` solo aparece en producción (RNF-2).
import { Router } from "express";
import { User, toOwnUserJson } from "../models/user.ts";
import { MESSAGES, validateLogin } from "../services/credentials.ts";
import { verifyPassword } from "../services/passwords.ts";
import {
  CSRF_HEADER,
  SESSION_COOKIE,
  SESSION_MESSAGES,
  createCsrfToken,
  sessionCookieOptions,
  signSessionToken,
} from "../services/sessionToken.ts";
import type { NodeEnv } from "../utils/config.ts";
import { createWithUser } from "../utils/middleware.ts";

export interface AuthRouterOptions {
  jwtSecret: string;
  nodeEnv: NodeEnv;
  now: () => number; // segundos Unix
}

export function createAuthRouter({ jwtSecret, nodeEnv, now }: AuthRouterOptions): Router {
  const router = Router();
  const cookieOptions = sessionCookieOptions(nodeEnv);
  const withUser = createWithUser({ jwtSecret, now });

  router.post("/login", async (request, response) => {
    const validation = validateLogin(request.body);
    if (!validation.ok) {
      // RF-18, RF-19: sin consultar usuarios.
      response.status(400).json({ error: validation.error });
      return;
    }
    const { email, password } = validation.value; // correo ya normalizado (RF-7)

    // `email` es siempre un string: nunca llega un objeto como filtro (RF-19).
    const user = await User.findOne({ email });
    // RF-9: mismo código y mensaje si el correo no existe o la contraseña no coincide.
    // `verifyPassword` no compara si la contraseña supera 72 bytes.
    if (user === null || !(await verifyPassword(password, user.passwordHash))) {
      response.status(401).json({ error: MESSAGES.badCredentials });
      return;
    }

    // RF-8, RF-25: credencial y comprobante nuevos en cada inicio; reemplazan los anteriores.
    const csrf = createCsrfToken();
    const token = signSessionToken({ id: user.id, username: user.username, csrf }, jwtSecret, now());
    response.cookie(SESSION_COOKIE, token, cookieOptions);
    response.setHeader(CSRF_HEADER, csrf);
    response.status(200).json(toOwnUserJson(user)); // sin hash, credencial ni comprobante (RNF-4)
  });

  // RF-13: datos propios tal como están guardados ahora; la identidad sale solo de la
  // credencial (RF-15), nunca de la consulta ni del cuerpo.
  router.get("/me", withUser, async (request, response) => {
    const userId = request.userId;
    const user = userId === undefined ? null : await User.findById(userId);
    if (user === null) {
      // Borrado entre la revisión de `withUser` y esta consulta (RF-22).
      response.status(401).json({ error: SESSION_MESSAGES.invalidToken });
      return;
    }
    response.status(200).json(toOwnUserJson(user)); // con correo, sin hash (RNF-4)
  });

  // RF-14: no revisa la credencial ni el comprobante; siempre borra la cookie.
  router.post("/logout", (_request, response) => {
    response.clearCookie(SESSION_COOKIE, cookieOptions);
    response.status(200).json({ message: "sesión cerrada" });
  });

  return router;
}
