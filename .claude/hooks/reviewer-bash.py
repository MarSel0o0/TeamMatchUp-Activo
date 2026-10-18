#!/usr/bin/env python3
# Hook PreToolUse del agente reviewer. Equivale a los permisos de opencode
# "shell: ask, salvo tests, git diff y git status: allow": esos comandos se
# aprueban solos y el resto pasa por la pregunta de permiso habitual.
import json
import re
import sys

PERMITIDOS = [
    r"node --test(\s.*)?",
    r"(PLAYWRIGHT_CHROMIUM_PATH=\S+\s+)?npm run test:(unit|e2e)(\s.*)?",
    r"git diff(\s.*)?",
    r"git status(\s.*)?",
]
# Un comando compuesto o con redirecciones nunca se aprueba solo: "git diff; rm x"
# empieza como un comando permitido pero no lo es.
METACARACTERES = re.compile(r"[;&|`<>\n]|\$\(")

entrada = json.load(sys.stdin)
comando = ((entrada.get("tool_input") or {}).get("command") or "").strip()

if comando and not METACARACTERES.search(comando) and any(
    re.fullmatch(patron, comando) for patron in PERMITIDOS
):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "permissionDecisionReason": "Comando de solo lectura o de tests permitido al reviewer.",
        }
    }))
