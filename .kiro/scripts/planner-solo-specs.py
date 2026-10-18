#!/usr/bin/env python3
# Hook PreToolUse del agente planner (Kiro): solo puede escribir dentro de specs/.
# Segunda barrera además de las reglas fs_write del agente. Exit 2 bloquea la herramienta
# y el mensaje de stderr vuelve al modelo.
import json
import os
import sys

entrada = json.load(sys.stdin)
datos = entrada.get("tool_input") or {}

# El matcher "write" también calza con la herramienta "code"; solo algunas de sus
# operaciones escriben archivos. Las de lectura pasan sin revisar.
if entrada.get("tool_name") == "code" and datos.get("operation") not in ("rename_symbol", "format_code"):
    sys.exit(0)
proyecto = os.path.realpath(entrada.get("cwd") or os.getcwd())
specs = os.path.join(proyecto, "specs") + os.sep

# Las herramientas de escritura de Kiro usan "path"; otras (p. ej. rename) "file_path".
destinos = [datos.get(clave) for clave in ("path", "file_path", "targetFile")]
destinos = [d for d in destinos if isinstance(d, str) and d]

# Herramientas del grupo "write" sin ruta conocida: se bloquean por precaución.
if not destinos:
    print("El planner solo puede escribir dentro de specs/ y no se pudo leer la ruta destino.", file=sys.stderr)
    sys.exit(2)

for destino in destinos:
    ruta = os.path.realpath(os.path.join(proyecto, os.path.expanduser(destino)))
    if not ruta.startswith(specs):
        print(f"El planner solo puede escribir dentro de specs/; {destino} queda fuera.", file=sys.stderr)
        sys.exit(2)
