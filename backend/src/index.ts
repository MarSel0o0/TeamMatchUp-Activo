// Punto de entrada: única pieza con efectos de proceso (plan §3.6).
// RF-2, RF-11, RF-15, RF-20, RF-21: si la configuración es inválida, el proceso termina con
// código 1 antes de conectar o escuchar. El mensaje va directo a la salida de error, fuera
// del logger, para que se vea en todos los entornos, también en prueba (RNF-1, D10).
// RF-12, RF-13, RF-14: si el arranque falla (base no disponible o dirección/puerto no
// utilizable), el mensaje va por el logger (callado en prueba, D10) y el código es 1.
import app from "./app.ts";
import { startServer } from "./server.ts";
import { formatConfigErrors, loadConfig } from "./utils/config.ts";
import { logger } from "./utils/logger.ts";

const result = loadConfig();
if (!result.ok) {
  process.stderr.write(formatConfigErrors(result.errors) + "\n");
  process.exit(1);
}

try {
  await startServer(result.config, { app, log: logger });
} catch (error) {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
