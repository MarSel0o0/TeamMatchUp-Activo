# Spec 013 — Verificación de cuentas de Counter-Strike 2 con Steam
Estado: aprobada (2026-11-04)

## Contexto y objetivo
Hoy un jugador de CS2 escribe su SteamID64 a mano y nada comprueba que la cuenta sea suya
(spec 004). Esta spec le permite **verificar** su cuenta de CS2 iniciando sesión en Steam:
Steam confirma a TeamMatchUp qué cuenta controla el usuario y la plataforma la marca como
verificada (spec 012). Desde entonces el perfil de Steam y las horas jugadas de CS2 son datos
reales.

Steam no entrega el rango Premier de CS2 ni el historial de partidas competitivas, así que el
rango, el historial y las partidas de una cuenta de CS2 verificada **siguen siendo simulados**
y se etiquetan como tales (spec 012, RF-6, RF-8).

- Depende de: spec 012 (cuenta verificada, origen por bloque, exclusividad, resincronización y
  fuente no disponible) y specs 002 a 004.
- Origen: conversación con el usuario del 2026-11-04.

### Decisiones del usuario
- **2026-11-04 — Verificación con el inicio de sesión de Steam.** El usuario no escribe ni
  prueba nada a mano: inicia sesión en la página oficial de Steam y vuelve a TeamMatchUp. Su
  contraseña de Steam nunca pasa por TeamMatchUp.
- **2026-11-04 — Datos reales de Steam: perfil y horas.** Nombre visible, avatar, país (si el
  perfil lo muestra) y horas jugadas de CS2 (total y últimas dos semanas, si el perfil las
  muestra).
- **2026-11-04 — Rango de CS2 simulado.** Steam no lo expone. Integrar una fuente de terceros
  para el rango (por ejemplo Leetify) queda fuera de esta spec.
- **2026-11-04 — D1. Cuenta de Steam sin CS2.** Se verifica igual y muestra 0 horas, porque
  con perfil privado no se puede distinguir si la cuenta tiene el juego. RF-17.
- **2026-11-04 — D2. Visibilidad.** El nombre, el avatar, el país y las horas de Steam son
  visibles para cualquier usuario con sesión, igual que la marca de verificada (spec 012,
  RF-22). RF-15.

## Usuarios
- Jugador de CS2 registrado en TeamMatchUp con cuenta de Steam.

## Historias de usuario
- HU-1. Como jugador de CS2, quiero verificar mi cuenta iniciando sesión en Steam, para
  demostrar que es mía sin copiar mi SteamID64.
- HU-2. Como jugador de CS2, quiero que mi perfil muestre mi nombre, avatar y horas reales de
  Steam, para que los demás vean con quién van a jugar.
- HU-3. Como jugador, quiero actualizar mis horas cuando quiera, para que estén al día.

## Definiciones
- **Inicio de sesión de Steam**: la página oficial de Steam en la que el usuario inicia sesión
  y autoriza a TeamMatchUp a conocer su SteamID64. Al terminar, Steam devuelve al usuario a
  TeamMatchUp con una respuesta firmada.
- **Intento de verificación**: el recorrido que empieza cuando el usuario elige "Verificar con
  Steam" y termina cuando vuelve a TeamMatchUp, o a los 10 minutos.
- **Perfil público / privado**: configuración de privacidad de la cuenta de Steam. Con perfil
  privado, Steam no entrega horas ni país.

## Requisitos funcionales

### Iniciar la verificación
- RF-1: CUANDO el usuario de la sesión elige "Verificar con Steam", EL SISTEMA lo lleva a la
  página oficial de inicio de sesión de Steam y abre un intento de verificación válido por 10
  minutos, ligado a ese usuario.
- RF-2: EL SISTEMA ofrece "Verificar con Steam" tanto si el usuario ya tiene una cuenta de CS2
  vinculada a mano como si no tiene ninguna.
- RF-3: SI el usuario ya tiene una cuenta de CS2 verificada, ENTONCES EL SISTEMA no ofrece
  verificar otra; para cambiarla debe desvincularla antes (spec 012, RF-3).

### Volver de Steam
- RF-4: CUANDO el usuario vuelve de Steam con una respuesta que Steam confirma como auténtica y
  que corresponde a un intento abierto del mismo usuario, EL SISTEMA verifica la cuenta de CS2
  con el SteamID64 que confirmó Steam (spec 012, RF-1, RF-8, RF-11, RF-13), cierra el intento
  y lo lleva a su perfil con el aviso "cuenta de Steam verificada".
- RF-5: SI el usuario cancela en Steam o vuelve sin una respuesta de inicio de sesión,
  ENTONCES EL SISTEMA no cambia ninguna cuenta y lo lleva a su perfil con el aviso
  "verificación con Steam cancelada".
- RF-6: SI la respuesta no es auténtica según Steam, no corresponde a ningún intento abierto,
  corresponde a un intento de otro usuario, ya se usó, el intento venció o el usuario ya
  tiene una cuenta de CS2 verificada, ENTONCES EL SISTEMA
  no cambia ninguna cuenta y lo lleva a su perfil con el aviso "no se pudo verificar con
  Steam, vuelve a intentarlo".
- RF-7: SI al volver de Steam el usuario ya no tiene sesión en TeamMatchUp, ENTONCES EL
  SISTEMA no cambia ninguna cuenta y lo lleva a iniciar sesión.
- RF-8: SI el SteamID64 confirmado ya está verificado por otro usuario, ENTONCES EL SISTEMA no
  cambia ninguna cuenta y lo lleva a su perfil con el aviso "esta cuenta ya está verificada
  por otro usuario" (spec 012, RF-10).
- RF-9: SI Steam no puede confirmar la respuesta por no estar disponible, ENTONCES EL SISTEMA
  no cambia ninguna cuenta y lo lleva a su perfil con el aviso "Steam no está disponible por
  ahora, intenta más tarde" (spec 012, RF-19).

### Datos reales
- RF-10: CUANDO una cuenta de CS2 queda verificada, EL SISTEMA obtiene de Steam el nombre
  visible, el avatar, el país y las horas jugadas de CS2 (total y últimas dos semanas), y los
  marca con origen Steam (spec 012, RF-5).
- RF-11: SI el perfil de Steam no muestra el país o las horas, ENTONCES EL SISTEMA verifica la
  cuenta igual y muestra "perfil de Steam privado" en lugar de esos datos.
- RF-12: SI la verificación tuvo éxito pero la consulta del perfil falla, ENTONCES EL SISTEMA
  deja la cuenta verificada, sin datos de perfil, y el usuario puede obtenerlos
  resincronizando (spec 012, RF-15, RF-19).
- RF-13: EL SISTEMA mantiene el rango, el historial y las partidas de una cuenta de CS2
  verificada con origen simulado y la etiqueta "Datos de demostración" (spec 012, RF-6, RF-8).
- RF-14: CUANDO el dueño resincroniza una cuenta de CS2 verificada, EL SISTEMA actualiza desde
  Steam el nombre visible, el avatar, el país y las horas (spec 012, RF-15, RF-16).

### Interfaz
- RF-15: EL SISTEMA muestra a cualquier usuario con sesión, en la cuenta de CS2 verificada,
  la marca "Verificada con Steam", el nombre visible, el avatar y el país de Steam, y las
  horas de CS2 (spec 012, RF-22).
- RF-16: EL SISTEMA reemplaza, para una cuenta de CS2 sin verificar, la sugerencia de escribir
  el SteamID64 por la acción "Verificar con Steam", sin quitar el vínculo manual (spec 012,
  decisión P3).
- RF-17: SI el perfil de Steam es público y la cuenta no tiene Counter-Strike 2, ENTONCES EL
  SISTEMA verifica la cuenta igual y muestra 0 horas de CS2.

## Requisitos no funcionales
- RNF-1: TeamMatchUp nunca recibe ni guarda la contraseña de Steam del usuario.
- RNF-2: La verificación funciona aunque no esté configurada la clave de Steam para consultar
  perfiles; sin esa clave, la cuenta queda verificada sin datos de perfil (RF-12).
- RNF-3: Las pruebas simulan Steam y pasan sin conexión (spec 012, RNF-1).
- RNF-4: La dirección a la que Steam devuelve al usuario es la de la instancia en uso
  (desarrollo local o servidor del curso), tomada de la configuración.

## Casos límite
- El usuario abre dos intentos seguidos: ambos son válidos hasta que uno se complete o venza;
  al completarse uno, el otro ya no puede verificar (RF-6, porque la cuenta ya está
  verificada; ver RF-3).
- El usuario inicia sesión en Steam con una cuenta distinta de la que tenía vinculada a mano:
  queda verificada la de Steam y reemplaza a la manual (spec 012, RF-13).
- Se recarga la página de vuelta de Steam: la respuesta ya se usó → RF-6.
- Alguien copia la dirección de vuelta de otro usuario y la abre con su propia sesión: RF-6.
- Perfil de Steam privado: verificada, "perfil de Steam privado" (RF-11).
- Cuenta de Steam sin CS2 en su biblioteca: verificada; 0 horas si el perfil es público
  (RF-17), "perfil de Steam privado" si no (RF-11).

## Fuera de alcance
- Rango Premier, historial o partidas reales de CS2 (Leetify, FACEIT u otras fuentes).
- Iniciar sesión o registrarse en TeamMatchUp con Steam.
- Otros juegos de Steam.

## Criterios de finalización
- [ ] RF-1 a RF-17 cubiertos por pruebas en verde, sin red.
- [ ] Recorrido manual en desarrollo local con una cuenta de Steam real: verificar, ver
      perfil y horas, resincronizar, desvincular.
- [ ] Recorrido manual en el servidor del curso con la dirección de vuelta configurada.

## Dudas abiertas
Ninguna. D1 y D2 se cerraron el 2026-11-04 (ver "Decisiones del usuario").
