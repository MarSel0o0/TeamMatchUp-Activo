// Spec 010 (RF-1, RF-9, D-3): copia la interfaz compilada (`frontend/dist`) a `backend/dist`,
// que es la carpeta que sirve el servidor en producción. Multiplataforma y sin dependencias.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
const target = fileURLToPath(new URL("../dist", import.meta.url));

if (!existsSync(join(source, "index.html"))) {
  process.stderr.write("no se encontró frontend/dist/index.html: compila la interfaz primero\n");
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
process.stdout.write("interfaz copiada a backend/dist\n");
