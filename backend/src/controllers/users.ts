// Registro: `POST /api/users` (plan §3.5). RF-1..RF-7, RF-16, RF-19, RF-20, RF-21, RF-26.
// - Público (RF-26) y sin sesión: no lee ni escribe cookies ni la cabecera X-CSRF-Token,
//   así que la sesión que el navegador ya tuviera queda igual (RF-20).
// - Los campos del usuario se pasan uno a uno: lo demás del cuerpo se ignora (RF-16) y el
//   color, la biografía y la zona horaria quedan con sus valores por defecto (RF-1).
// - Duplicados: comprobación previa con el correo por delante (RF-3); si dos registros
//   chocan a la vez, el E11000 se traduce repitiendo la misma consulta (RF-21, D7).
import { Router } from "express";
import mongoose from "mongoose";
import { User, toOwnUserJson } from "../models/user.ts";
import { MESSAGES, validateRegistration } from "../services/credentials.ts";
import { hashPassword } from "../services/passwords.ts";

type DuplicateMessage = typeof MESSAGES.emailTaken | typeof MESSAGES.usernameTaken;

// RF-3: si se repiten los dos, el del correo. Los dos valores ya vienen normalizados.
export async function duplicateMessage(email: string, key: string): Promise<DuplicateMessage | null> {
  if (await User.exists({ email })) return MESSAGES.emailTaken;
  if (await User.exists({ usernameKey: key })) return MESSAGES.usernameTaken;
  return null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

export function createUsersRouter(): Router {
  const router = Router();

  router.post("/", async (request, response) => {
    const validation = validateRegistration(request.body);
    if (!validation.ok) {
      // Sin consultar la base (RF-5: las repeticiones se revisan solo con todo válido).
      response.status(400).json({ error: validation.error });
      return;
    }
    const { email, username, usernameKey, password, displayName } = validation.value;

    const duplicate = await duplicateMessage(email, usernameKey);
    if (duplicate !== null) {
      response.status(400).json({ error: duplicate });
      return;
    }

    const passwordHash = await hashPassword(password); // RF-2
    let user;
    try {
      user = await User.create({ email, username, usernameKey, passwordHash, displayName });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        // RF-21: carrera con otro registro; mismo mensaje y prioridad que RF-3, nunca 500.
        const raced = await duplicateMessage(email, usernameKey);
        if (raced !== null) {
          response.status(400).json({ error: raced });
          return;
        }
      }
      throw error; // → errorHandler (500 genérico)
    }

    response.status(201).json(toOwnUserJson(user)); // sin Set-Cookie ni X-CSRF-Token (RF-20)
  });

  return router;
}
