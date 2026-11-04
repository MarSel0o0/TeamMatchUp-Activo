#!/usr/bin/env python3
# Hook PreToolUse del agente planner: solo puede escribir dentro de specs/.
# Equivale al permiso de opencode "edit: deny, salvo specs/**".
import json
import os
import sys

entrada = json.load(sys.stdin)
destino = (entrada.get("tool_input") or {}).get("file_path", "")
proyecto = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR") or entrada.get("cwd") or ".")
specs = os.path.join(proyecto, "specs") + os.sep

ruta = os.path.realpath(os.path.join(proyecto, destino))
if not ruta.startswith(specs):
    print(f"El planner solo puede escribir dentro de specs/; {destino} queda fuera.", file=sys.stderr)
    sys.exit(2)
