# Spec 013 — Verificación de cuentas de Counter-Strike 2 con Steam
Estado: aprobada (2026-11-04). Revisada el 2026-11-18 tras la clarificación (D3 a D12),
aprobada por el usuario el 2026-11-18.

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
  fuente no disponible; implementada y validada el 2026-11-18) y specs 002 a 004.
- Origen: conversación con el usuario del 2026-11-04; clarificación del 2026-11-18.

### Decisiones del usuario
- **2026-11-04 — Verificación con el inicio de sesión de Steam.** El usuario no escribe ni
  prueba nada a mano: inicia sesión en la página oficial de Steam y vuelve a TeamMatchUp. Su
  contraseña de Steam nunca pasa por TeamMatchUp.
- **2026-11-04 — Datos reales de Steam: perfil y horas.** Nombre visible, avatar, país (si el
  perfil lo muestra) y horas jugadas de CS2 (total y últimas dos semanas, si el perfil las
  muestra).
- **2026-11-04 — Rango de CS2 simulado.** Steam no lo expone. Integrar una fuente de terceros
  para el rango (por ejemplo Leetify) queda fuera de esta spec.
- **2026-11-04 — D1. Cuenta de Steam sin CS2.** Se verifica igual y muestra 0 horas. Precisada
  por D7: las 0 horas exigen que Steam muestre la lista de juegos. RF-17.
- **2026-11-04 — D2. Visibilidad.** El nombre, el avatar, el país y las horas de Steam son
  visibles para cualquier usuario con sesión, igual que la marca de verificada (spec 012,
  RF-22). RF-15.
- **2026-11-18 — D3. La vuelta de Steam la completa la sesión del usuario.** Steam devuelve
  al usuario a una página de TeamMatchUp, y esa página completa la verificación con la sesión
  y el comprobante anti-CSRF del usuario, como cualquier otra operación protegida (spec 002).
  No se relaja ninguna regla de sesión. RF-4, RF-7, RNF-6.
- **2026-11-18 — D4. Sin clave de Steam no se ofrece verificar.** Sin la clave para consultar
  perfiles, Steam es una fuente no configurada (spec 012, RF-20) y "Verificar con Steam" no se
  ofrece. **Revoca** el RNF-2 anterior ("la verificación funciona sin clave"). RF-22, RNF-2.
- **2026-11-18 — D5. Volver a verificar se rechaza en esta spec.** La regla de RF-3 es propia
  de la 013; la verificación común de la 012 no cambia. RF-3, RF-6.
- **2026-11-18 — D6. Una verificación sin perfil no cuenta para la espera.** Igual que un
  intento fallido de la spec 012 (RF-19). RF-12.
- **2026-11-18 — D7. Privacidad por dato.** Cada dato que Steam no entrega muestra "perfil de
  Steam privado" en su lugar; las 0 horas solo se muestran si Steam entrega la lista de
  juegos y CS2 no está en ella. RF-11, RF-17.
- **2026-11-18 — D8. Dónde se ve.** "Verificar con Steam" en la fila de la cuenta de CS2 sin
  verificar y sobre el formulario de vínculo de CS2; los datos de Steam en la fila de la
  cuenta (perfil, Configuración y ficha de jugador); en coincidencias, solo la marca y el
  origen. El identificador sigue siendo el SteamID64. RF-2, RF-15, RF-16.
- **2026-11-18 — D9. Formatos.** País por su nombre en español; horas enteras redondeadas
  hacia abajo. RF-18, RF-19.
- **2026-11-18 — D10. Modo simulado.** "Verificar con Steam" se ve desactivado con un texto
  que lo explica; nunca se simula una verificación ni datos de Steam (constitución,
  principio 5). RF-21.
- **2026-11-18 — D11. Intentos.** Un solo intento abierto por usuario: abrir uno nuevo anula
  el anterior. Sin sesión al volver, el intento se descarta y hay que empezar de nuevo.
  RF-1, RF-7.
- **2026-11-18 — D12. Pendientes de la validación de la 012.** El aviso global "Datos de
  demostración" se muestra solo en modo simulado, y el texto junto a "Resincronizar" de una
  cuenta verificada con Steam habla de Steam y de la espera. RF-24, RF-25.
- **2026-11-18 — Recorridos manuales.** El equipo aporta la cuenta real de Steam y la clave de
  Steam de cada instancia, que vive solo en su configuración y nunca en el repositorio.

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
- **Página de vuelta**: la página de TeamMatchUp a la que Steam devuelve al usuario; completa
  la verificación con la sesión del usuario (D3).
- **Intento de verificación**: el recorrido que empieza cuando el usuario elige "Verificar con
  Steam" y termina cuando se completa, se descarta, lo anula un intento nuevo o pasan 10
  minutos.
- **Perfil público / privado**: configuración de privacidad de la cuenta de Steam. Steam
  separa la privacidad del perfil (país) y la de los detalles de juego (lista de juegos y
  horas): cada una puede estar oculta por separado.
- **Fuente Steam configurada**: la instancia tiene la clave de Steam para consultar perfiles
  (D4).
- **Modo simulado**: el modo de la interfaz sin servidor de la spec 007.

## Requisitos funcionales

### Iniciar la verificación
- RF-1: CUANDO el usuario de la sesión elige "Verificar con Steam" para su cuenta de CS2, EL
  SISTEMA lo lleva a la página oficial de inicio de sesión de Steam y abre un intento de
  verificación válido por 10 minutos, ligado a ese usuario; si ya tenía un intento abierto,
  ese intento queda anulado (D11). La verificación con Steam es solo para CS2.
- RF-2: EL SISTEMA ofrece "Verificar con Steam" tanto si el usuario ya tiene una cuenta de CS2
  vinculada a mano como si no tiene ninguna: en la fila de su cuenta de CS2 sin verificar
  (perfil y Configuración) y, si no tiene cuenta de CS2, sobre el formulario de vínculo de CS2
  en Configuración (D8).
- RF-3: SI el usuario ya tiene una cuenta de CS2 verificada, ENTONCES EL SISTEMA no ofrece
  verificar otra y rechaza el intento si llega igual; para cambiarla debe desvincularla antes
  (spec 012, RF-3; D5).

### Volver de Steam
- RF-4: CUANDO el usuario vuelve de Steam a la página de vuelta con una respuesta que Steam
  confirma como auténtica y que corresponde al intento abierto del usuario de la sesión, EL
  SISTEMA verifica la cuenta de CS2 con el SteamID64 que confirmó Steam (spec 012, RF-1,
  RF-8, RF-11, RF-13), cierra el intento y lo lleva a su perfil con el aviso "cuenta de Steam
  verificada".
- RF-5: SI el usuario cancela en Steam o vuelve sin una respuesta de inicio de sesión,
  ENTONCES EL SISTEMA no cambia ninguna cuenta y lo lleva a su perfil con el aviso
  "verificación con Steam cancelada".
- RF-6: SI la respuesta no es auténtica según Steam, no corresponde a ningún intento abierto,
  corresponde a un intento de otro usuario, ya se usó, el intento venció o fue anulado por uno
  más nuevo, la respuesta no vuelve a la dirección de esta instancia, o el usuario ya tiene
  una cuenta de CS2 verificada, ENTONCES EL SISTEMA no cambia ninguna cuenta y lo lleva a su
  perfil con el aviso "no se pudo verificar con Steam, vuelve a intentarlo".
- RF-7: SI al volver de Steam el usuario ya no tiene sesión en TeamMatchUp, ENTONCES EL
  SISTEMA no cambia ninguna cuenta, descarta el intento y lo lleva a iniciar sesión; después
  de iniciar sesión, la verificación no continúa sola y debe empezarla de nuevo (D11).
- RF-8: SI el SteamID64 confirmado ya está verificado por otro usuario, ENTONCES EL SISTEMA no
  cambia ninguna cuenta y lo lleva a su perfil con el aviso "esta cuenta ya está verificada
  por otro usuario" (spec 012, RF-10).
- RF-9: SI Steam no puede confirmar la respuesta por no estar disponible, ENTONCES EL SISTEMA
  no cambia ninguna cuenta y lo lleva a su perfil con el aviso "Steam no está disponible por
  ahora, intenta más tarde" (spec 012, RF-19).
- RF-20: EL SISTEMA muestra los avisos de RF-4, RF-5, RF-6, RF-8 y RF-9 en el perfil, con
  esos textos literales, hasta que el usuario sale de la página.

### Datos reales
- RF-10: CUANDO una cuenta de CS2 queda verificada, EL SISTEMA obtiene de Steam el nombre
  visible, el avatar, el país y las horas jugadas de CS2 (total y últimas dos semanas), y los
  marca con origen Steam (spec 012, RF-5).
- RF-11: SI Steam no entrega el país, ENTONCES EL SISTEMA verifica la cuenta igual y muestra
  "perfil de Steam privado" en lugar del país; SI Steam no entrega la lista de juegos,
  ENTONCES EL SISTEMA muestra "perfil de Steam privado" en lugar de las horas. Cada dato se
  trata por separado (D7).
- RF-12: SI la verificación tuvo éxito pero la consulta del perfil falla, ENTONCES EL SISTEMA
  deja la cuenta verificada, sin datos de perfil; esa verificación no cuenta para la espera
  mínima, así que el usuario puede obtenerlos resincronizando de inmediato (spec 012, RF-15,
  RF-16, RF-19; D6).
- RF-13: EL SISTEMA mantiene el rango, el historial y las partidas de una cuenta de CS2
  verificada con origen simulado y la etiqueta "Datos de demostración" (spec 012, RF-6, RF-8).
- RF-14: CUANDO el dueño resincroniza una cuenta de CS2 verificada, EL SISTEMA actualiza desde
  Steam el nombre visible, el avatar, el país y las horas (spec 012, RF-15, RF-16).
- RF-23: SI al resincronizar Steam no devuelve ningún perfil para el SteamID64 de la cuenta,
  ENTONCES EL SISTEMA lo trata como cuenta que ya no existe: responde 404 "la cuenta ya no
  existe en Steam" y conserva la cuenta verificada con sus últimos datos (spec 012, RF-21).

### Interfaz
- RF-15: EL SISTEMA muestra a cualquier usuario con sesión, en la fila de la cuenta de CS2
  verificada (perfil, Configuración y ficha de jugador), la marca "Verificada con Steam", el
  nombre visible, el avatar, el país y las horas de CS2 de Steam, con la etiqueta "Datos de
  Steam" (spec 012, RF-6, RF-22). En coincidencias muestra la marca y el origen, como la
  spec 012. El identificador de la cuenta sigue siendo el SteamID64 (D8).
- RF-16: EL SISTEMA mantiene el formulario de vínculo manual de CS2 sin cambios junto a
  "Verificar con Steam" (spec 012, decisión P3).
- RF-17: SI Steam entrega la lista de juegos de la cuenta y Counter-Strike 2 no está en ella,
  ENTONCES EL SISTEMA verifica la cuenta igual y muestra 0 horas de CS2 (D1, D7).
- RF-18: EL SISTEMA muestra el país por su nombre en español y las horas como horas enteras
  redondeadas hacia abajo ("312 h", "0 h"), tanto el total como las últimas dos semanas (D9).
- RF-19: EL SISTEMA muestra el nombre visible de Steam tal como lo entrega Steam, recortado
  con "…" si no cabe; SI el avatar de Steam no carga, ENTONCES muestra en su lugar el avatar de
  TeamMatchUp del usuario (D9).
- RF-21: MIENTRAS el modo simulado está activo, EL SISTEMA muestra "Verificar con Steam"
  desactivado con el texto "No disponible en modo de demostración" y no simula ninguna
  verificación ni dato de Steam (D10).
- RF-22: MIENTRAS la fuente Steam no está configurada, EL SISTEMA no ofrece "Verificar con
  Steam"; vincular a mano y todo lo demás sigue igual (spec 012, RF-20; D4).
- RF-24: MIENTRAS el modo simulado no está activo, EL SISTEMA no muestra el aviso global
  "Datos de demostración" (barra de navegación, pie y portada); MIENTRAS está activo, lo
  muestra como hoy. Las etiquetas por bloque de la spec 012 no cambian (D12).
- RF-25: EL SISTEMA muestra junto a "Resincronizar" de una cuenta de CS2 verificada con Steam
  el texto "Al resincronizar, se vuelven a leer tus datos de Steam. Puedes hacerlo cada 5
  minutos."; en una cuenta sin verificar mantiene el texto de la spec 007 (D12).

### Eliminación del usuario
- RF-26: CUANDO un usuario elimina su cuenta de TeamMatchUp (spec 003), EL SISTEMA elimina
  también sus intentos de verificación abiertos; una vuelta posterior de Steam cae en RF-6 o
  RF-7.

## Requisitos no funcionales
- RNF-1: TeamMatchUp nunca recibe ni guarda la contraseña de Steam del usuario.
- RNF-2: La clave de Steam es un secreto de la configuración de cada instancia: nunca aparece
  en el repositorio, en respuestas, en mensajes de error ni en registros (spec 012, RNF-2).
  Sin ella, la fuente Steam no está configurada (RF-22).
- RNF-3: Las pruebas simulan Steam y pasan sin conexión (spec 012, RNF-1).
- RNF-4: La dirección a la que Steam devuelve al usuario es la de la instancia en uso
  (desarrollo local o servidor del curso), tomada de la configuración; una respuesta que
  vuelve a otra dirección se rechaza (RF-6).
- RNF-5: Esta spec no justifica ninguna dependencia nueva (constitución, principio 1).
- RNF-6: La vuelta de Steam no relaja ninguna regla de sesión de la spec 002: completar la
  verificación exige sesión válida y comprobante anti-CSRF, como toda operación protegida
  (D3).
- RNF-7: Los intentos vencidos o anulados no se acumulan: desaparecen solos, sin tareas
  programadas.

## Casos límite
- El usuario abre dos intentos seguidos: el primero queda anulado; si vuelve con la respuesta
  del primero, RF-6 (D11).
- El usuario inicia sesión en Steam con una cuenta distinta de la que tenía vinculada a mano:
  queda verificada la de Steam y reemplaza a la manual (spec 012, RF-13).
- Se recarga la página de vuelta de Steam: la respuesta ya se usó → RF-6.
- Alguien copia la dirección de vuelta de otro usuario y la abre con su propia sesión: el
  intento es de otro usuario → RF-6.
- Alguien hace que otra persona inicie sesión en Steam con un intento abierto por él: la
  vuelta se completa con la sesión de quien vuelve, que no es dueña del intento → RF-6 (D3).
- Vuelve de Steam sin sesión en TeamMatchUp: RF-7; tras iniciar sesión debe empezar de nuevo.
- Perfil de Steam privado: verificada, "perfil de Steam privado" en el país y en las horas
  (RF-11).
- Perfil público con detalles de juego privados: país visible y "perfil de Steam privado" en
  las horas (RF-11, D7).
- Cuenta de Steam sin CS2 en su biblioteca: verificada; 0 horas si Steam entrega la lista de
  juegos (RF-17), "perfil de Steam privado" en las horas si no (RF-11).
- Steam falla después de confirmar la identidad: verificada sin perfil, se puede
  resincronizar de inmediato (RF-12).
- Instancia sin clave de Steam: "Verificar con Steam" no aparece (RF-22).
- Modo simulado: "Verificar con Steam" aparece desactivado (RF-21).
- La cuenta de Steam desaparece: al resincronizar, 404 "la cuenta ya no existe en Steam" y la
  cuenta sigue verificada (RF-23).
- El usuario elimina su cuenta de TeamMatchUp con un intento abierto: el intento se elimina
  (RF-26).

## Fuera de alcance
- Rango Premier, historial o partidas reales de CS2 (Leetify, FACEIT u otras fuentes).
- Iniciar sesión o registrarse en TeamMatchUp con Steam.
- Otros juegos de Steam.
- Continuar automáticamente una verificación interrumpida por falta de sesión (RF-7).

## Criterios de finalización
- [ ] RF-1 a RF-26 cubiertos por pruebas en verde, sin red.
- [ ] Recorrido manual en desarrollo local con la cuenta real de Steam del equipo: verificar,
      ver perfil y horas, resincronizar, desvincular.
- [ ] Recorrido manual en el servidor del curso con la dirección de vuelta configurada.
- [ ] Modo simulado: "Verificar con Steam" desactivado y sin aviso de datos reales.

## Impacto en otras specs y documentos
Por decisión del usuario (2026-11-18), los archivos de otras specs no se editan: los ajustes
quedan registrados aquí.
- **Spec 002**: el nombre visible, el avatar, el país y las horas de Steam de una cuenta de
  juego verificada son datos públicos de esa cuenta (D2). Las reglas de sesión y de
  comprobante no cambian (RNF-6).
- **Spec 007**: el aviso global de su RF-11 se muestra solo en modo simulado (RF-24); el texto
  junto a "Resincronizar" de su RF-18 cambia en las cuentas verificadas con Steam (RF-25); en
  modo simulado "Verificar con Steam" se ve desactivado (RF-21).
- **Spec 012**: la regla de no volver a verificar (RF-3) es propia de la 013 y no cambia la
  verificación común; una verificación sin perfil no cuenta para la espera mínima (RF-12).
- **`PRODUCT.md`**: "Evidence on Hand" y "Capabilities" se actualizan al implementar esta
  spec (spec 012, "Impacto").

## Dudas abiertas
Ninguna. D1 y D2 se cerraron el 2026-11-04; D3 a D12 y los recorridos manuales, el
2026-11-18 (ver "Decisiones del usuario").
