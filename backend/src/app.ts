// Composición de Express (RF-4, RF-5, RF-7, RF-16, RF-17). No conecta a la base:
// la conexión vive en src/server.ts.

import express from "express";
import { errorHandler, unknownEndpoint } from "./utils/middleware.ts";

const app = express();

// El cuerpo se interpreta antes de buscar la ruta: 400/413/415 ganan sobre 404.
// Límite de 102 400 bytes exactos (RF-16); `strict` rechaza JSON escalar o null (RF-5).
app.use(express.json({ limit: 102_400, strict: true }));

// (Aquí se montan los routers /api/... de las specs 002–006.)

app.use(unknownEndpoint);
app.use(errorHandler); // siempre el último

export default app;
