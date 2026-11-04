# Spec 014 — Verificación de cuentas de League of Legends con Riot ID
Estado: aprobada (2026-11-04)

## Contexto y objetivo
Hoy un jugador de LoL escribe su Riot ID a mano y recibe rango, historial y partidas
simulados (spec 004). Esta spec le permite **verificar** su cuenta: demuestra que la controla
poniéndose en el cliente de LoL un ícono de invocador que TeamMatchUp le indica, y la
plataforma lo comprueba con Riot Games. Desde entonces el rango, el historial, las últimas
partidas y el perfil de la cuenta son datos reales de Riot (spec 012).

El inicio de sesión oficial de Riot (Riot Sign On) solo se entrega a productos aprobados por
Riot, así que no se usa. El ícono es una prueba de control conocida: solo quien tiene acceso a
la cuenta puede cambiar su ícono.

- Depende de: spec 012 (cuenta verificada, origen por bloque, exclusividad, resincronización y
  fuente no disponible) y specs 002 a 005.
- Origen: conversación con el usuario del 2026-11-04.

### Decisiones del usuario
- **2026-11-04 — Clave de desarrollo de Riot.** Se usa la clave de desarrollo, que caduca cada
  24 horas y se renueva a mano cuando caduca. Límites conocidos: 20 consultas por segundo y
  100 cada 2 minutos. El equipo acepta que los términos de Riot no admiten un producto público
  con esa clave (spec 012, decisión P1).
- **2026-11-04 — Ícono de inicio.** El ícono pedido es siempre uno de los íconos de inicio que
  toda cuenta de LoL tiene desde que se crea, para que cualquier jugador pueda ponérselo sin
  comprarlo ni desbloquearlo, y nunca el que el jugador ya tiene puesto.
- **2026-11-04 — Datos reales de Riot.** Rango de la cola clasificatoria Solo/Dúo (tier,
  división y LP), historial de rango, últimas partidas y perfil (nivel e ícono).
- **2026-11-04 — D1. Cuenta verificada sin clasificar.** Queda fuera de las coincidencias de
  LoL y su perfil dice "sin clasificar". RF-13.
- **2026-11-04 — D2. Partidas.** Solo las clasificatorias Solo/Dúo, porque son las que
  explican el rango. RF-11.

## Usuarios
- Jugador de LoL registrado en TeamMatchUp.

## Historias de usuario
- HU-1. Como jugador de LoL, quiero verificar mi Riot ID cambiando mi ícono, para demostrar
  que la cuenta es mía.
- HU-2. Como jugador de LoL, quiero que mi rango y mis partidas sean los reales, para que las
  coincidencias me junten con gente de mi nivel.
- HU-3. Como jugador, quiero volver a mi ícono de siempre después de verificar, sin perder la
  verificación.

## Definiciones
- **Íconos de inicio**: los íconos de invocador con número del 0 al 28, que toda cuenta de LoL
  tiene disponibles desde su creación.
- **Desafío de verificación**: pedido abierto para un usuario con un Riot ID, una región y un
  ícono de inicio asignado, válido por 10 minutos desde que se crea.
- **Rango real**: tier, división y LP de la cola clasificatoria Solo/Dúo según Riot.
- **Sin clasificar**: cuenta sin rango en Solo/Dúo en la temporada vigente.

## Requisitos funcionales

### Pedir el desafío
- RF-1: CUANDO el usuario de la sesión pide verificar un Riot ID con una región, EL SISTEMA
  valida el formato como en la spec 004, comprueba con Riot que la cuenta existe en esa región
  y crea un desafío con un ícono de inicio elegido al azar distinto del que la cuenta tiene
  puesto.
- RF-2: EL SISTEMA muestra la imagen del ícono asignado, su vigencia restante y cómo cambiarlo
  en el cliente de LoL.
- RF-3: SI Riot no encuentra una cuenta con ese Riot ID, o la cuenta no tiene perfil de LoL en
  esa región, ENTONCES EL SISTEMA responde 404 "no existe una cuenta de League of Legends con
  ese Riot ID en esa región" y no crea ningún desafío.
- RF-4: CUANDO el usuario pide un desafío nuevo teniendo uno abierto, EL SISTEMA anula el
  anterior y crea uno nuevo (RF-1).
- RF-5: SI la cuenta pedida ya está verificada por otro usuario, ENTONCES EL SISTEMA responde
  409 "esta cuenta ya está verificada por otro usuario" sin crear desafío (spec 012, RF-10).
- RF-6: SI el usuario ya tiene una cuenta de LoL verificada, ENTONCES EL SISTEMA no crea
  desafíos; para cambiarla debe desvincularla antes (spec 012, RF-3).

### Confirmar el desafío
- RF-7: CUANDO el usuario confirma un desafío vigente y Riot informa que la cuenta tiene puesto
  el ícono asignado, EL SISTEMA verifica la cuenta de LoL (spec 012, RF-1, RF-8, RF-11, RF-13),
  obtiene sus datos reales (RF-11) y cierra el desafío.
- RF-8: SI la cuenta todavía no tiene puesto el ícono asignado, ENTONCES EL SISTEMA responde
  400 "el ícono de tu perfil todavía no coincide con el pedido" y mantiene el desafío abierto.
- RF-9: SI el desafío venció, se anuló o no existe, ENTONCES EL SISTEMA responde 400 "la
  verificación venció, pide un ícono nuevo".
- RF-10: SI el usuario confirma más de 10 veces un mismo desafío, ENTONCES EL SISTEMA anula el
  desafío y responde 429 "demasiados intentos, pide un ícono nuevo".

### Datos reales
- RF-11: CUANDO una cuenta de LoL queda verificada o se resincroniza, EL SISTEMA obtiene de
  Riot el Riot ID vigente, el rango real, el nivel, el ícono y sus últimas partidas clasificatorias Solo/Dúo (hasta 20),
  y los marca con origen Riot Games (spec 012, RF-5).
- RF-12: EL SISTEMA muestra de cada partida real el resultado, la fecha, la duración y el
  campeón jugado; no muestra variación de LP por partida, porque Riot no la entrega.
- RF-13: MIENTRAS una cuenta verificada está sin clasificar, EL SISTEMA muestra "sin
  clasificar" en lugar de su rango y la deja fuera de las coincidencias de LoL, tanto
  como candidata como para buscar candidatos.
- RF-14: CUANDO cambia el Riot ID de una cuenta verificada en Riot, EL SISTEMA muestra el
  nuevo al resincronizarla, sin perder la verificación ni el historial.
- RF-15: EL SISTEMA no exige que el jugador mantenga el ícono asignado después de verificar.

### Clave de Riot
- RF-16: SI Riot rechaza la clave (caducada o inválida) o informa que se superó el límite de
  consultas, ENTONCES EL SISTEMA responde 503 "Riot Games no está disponible por ahora, intenta
  más tarde" en cualquier operación de esta spec y conserva sin cambios cuentas y desafíos
  (spec 012, RF-19).
- RF-17: CUANDO se reemplaza la clave de Riot en la configuración y se reinicia el servidor,
  EL SISTEMA vuelve a operar con Riot sin otro cambio.

## Requisitos no funcionales
- RNF-1: Las consultas a Riot respetan sus límites (20 por segundo y 100 cada 2 minutos);
  verificar una cuenta, incluida su primera lectura de datos, usa como máximo 25 consultas.
- RNF-2: Las pruebas simulan Riot y pasan sin conexión ni clave (spec 012, RNF-1).
- RNF-3: El identificador interno de Riot de una cuenta no sale en ninguna respuesta
  (spec 012, RNF-3).

## Casos límite
- El jugador tiene puesto un ícono de inicio: el asignado es otro de los 28 restantes (RF-1).
- El jugador se pone el ícono, confirma, y después vuelve a su ícono: sigue verificado (RF-15).
- El jugador confirma a los 10 min 5 s: vencido (RF-9).
- Dos usuarios piden desafíos para el mismo Riot ID: el primero que confirma gana; el otro
  recibe 409 al confirmar (spec 012, RF-10).
- Riot ID válido en formato pero de otra región: 404 (RF-3).
- La clave caduca entre pedir el desafío y confirmarlo: 503; al renovarla, el desafío sigue
  vigente si no pasaron 10 minutos (RF-16).
- Cuenta con menos de 20 partidas Solo/Dúo: se muestran las que haya; ninguna: lista vacía.
  Las partidas de otras colas no se muestran (RF-11).
- Cuenta verificada que deja de estar clasificada al cambiar de temporada: "sin clasificar"
  (RF-13), y el historial conserva los puntos anteriores.

## Fuera de alcance
- Riot Sign On (inicio de sesión oficial de Riot) y la clave de producción.
- Otras colas (Flex, ARAM) y otros juegos de Riot (Valorant, TFT).
- Renovación automática de la clave.
- Iniciar sesión o registrarse en TeamMatchUp con Riot.

## Criterios de finalización
- [ ] RF-1 a RF-17 cubiertos por pruebas en verde, sin red.
- [ ] Recorrido manual con una cuenta de LoL real: pedir el ícono, ponérselo, confirmar, ver
      rango y partidas, resincronizar, volver al ícono propio, desvincular.
- [ ] Procedimiento de renovación de la clave documentado para el servidor del curso.

## Impacto en otras specs
- Spec 005: una cuenta de LoL verificada sin clasificar no participa en las coincidencias
  (RF-13).
- Spec 010: agrega la clave de Riot como secreto del servidor y su renovación manual.

## Dudas abiertas
Ninguna. D1 y D2 se cerraron el 2026-11-04 (ver "Decisiones del usuario").
