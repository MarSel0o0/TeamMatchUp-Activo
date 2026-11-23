# Spec 019 — Partidas reales de CS2 con Leetify
Estado: aprobada (2026-11-22, por el usuario)

## Contexto y objetivo
En la ficha de una cuenta de CS2 verificada con Steam, el rango Premier ya es real (spec 015),
pero las partidas siguen simuladas y salen con "Datos de demostración" (spec 015, D3 y RF-13).
La consulta a Leetify que ya hace la plataforma con el SteamID64 de la cuenta también entrega
las partidas recientes del jugador, y hoy no se usan.

Objetivo: que el bloque de partidas de esas cuentas muestre las partidas reales que entrega
Leetify, con el mínimo alcance posible. Por qué: las partidas simuladas en una cuenta verificada
contradicen la promesa de mostrar datos reales cuando existen (spec 012) y hacen menos creíble la
ficha justo en las cuentas que el usuario se tomó el trabajo de verificar.

### Decisiones del usuario
- **2026-11-22 — D1. Partidas en vivo, sin guardarlas.** Las partidas de Leetify se piden al ver
  la ficha y no se guardan. Lo piden las pautas para desarrolladores de Leetify (§6, «Do not
  store data»: usar los datos que la API entrega en cada consulta), igual que D27 de la spec
  015. Revisadas el 2026-11-22: mostrar en vivo sin guardar es justo lo que piden. RF-1, RF-6.
- **2026-11-22 — D2. Sin porcentaje de victorias.** En estas cuentas no se muestra el porcentaje
  de victorias: sería una cifra calculada por la plataforma que Leetify no entrega, y las pautas
  (§5.4) piden no recalcular ni presentar puntajes distintos a los de su API. RF-4.
- **D3. Cuántas partidas.** Se muestran como máximo 8, las más recientes, el mismo número que
  muestra hoy el bloque de partidas (spec 004). RF-2.
- **D4. Reemplazo en la spec 015.** Esta spec reemplaza D3 (en lo que dice de las partidas) y
  RF-13 de la spec 015. Lo que D3 dice del rango sigue rigiendo.

## Usuarios
- El dueño de una cuenta de CS2 verificada con Steam, que la ve en su perfil.
- Cualquier usuario con sesión que ve la ficha de ese jugador (spec 008).

## Historias de usuario
- HU-1. Como jugador de CS2 con mi cuenta verificada, quiero ver mis partidas reales en mi ficha
  para que lo que muestro de mí sea cierto.
- HU-2. Como usuario que busca compañeros, quiero ver las partidas reales de un jugador
  verificado para juzgar mejor si me conviene jugar con él o ella.

## Definiciones
- **Cuenta de CS2 verificada con Steam**: cuenta de CS2 cuya propiedad se comprobó con Steam
  (spec 013).
- **Partida de Leetify**: cada una de las partidas recientes que Leetify entrega en el perfil del
  jugador, consultado con su SteamID64 (la misma consulta de la spec 015).
- **Resultado**: victoria, derrota o empate, tal como lo informa Leetify.
- **Marcador**: las rondas ganadas por el equipo del jugador y por el rival, tal como las
  entrega Leetify.

## Requisitos funcionales

### Partidas de Leetify
- RF-1: CUANDO un usuario con sesión ve la ficha de una cuenta de CS2 verificada con Steam, EL
  SISTEMA pide a Leetify las partidas recientes de esa cuenta en ese momento (D1).
- RF-2: EL SISTEMA muestra en el bloque de partidas de una cuenta de CS2 verificada con Steam
  hasta 8 partidas de Leetify, de la más reciente a la más antigua según su fecha de término,
  en lugar de las partidas simuladas (D3).
- RF-3: EL SISTEMA muestra de cada partida de Leetify su fecha, su mapa, su resultado
  ("Victoria", "Derrota" o "Empate") y su marcador, con los valores que entrega Leetify, sin
  recalcularlos (pautas, §5).
- RF-4: EL SISTEMA no muestra el porcentaje de victorias en el bloque de partidas de una cuenta
  de CS2 verificada con Steam (D2).
- RF-5: EL SISTEMA muestra en el bloque de partidas de Leetify la etiqueta "Datos de Leetify"
  con la atribución que ya existe para el rango: el logo "Data Provided by Leetify" enlazado a
  Leetify y el enlace "View on Leetify" al perfil del jugador (spec 015, D26), y nunca
  "Datos de demostración".
- RF-6: EL SISTEMA no guarda las partidas de Leetify: no quedan en la base de datos ni cambian
  los datos guardados de la cuenta (D1; spec 015, D27).

### Leetify no disponible o sin partidas
- RF-7: SI Leetify no responde en 8 segundos, rechaza la consulta o entrega una respuesta que no
  se puede leer, ENTONCES EL SISTEMA muestra en el bloque de partidas el texto "No hay partidas
  disponibles en Leetify" y el resto de la ficha se ve igual que si Leetify hubiera respondido
  (spec 015, RF-14 y RNF-4).
- RF-8: SI Leetify no tiene perfil para el SteamID64 de la cuenta o no entrega partidas,
  ENTONCES EL SISTEMA muestra en el bloque de partidas el texto "No hay partidas disponibles en
  Leetify".
- RF-9: SI una partida de Leetify llega sin fecha, sin mapa, sin un resultado reconocible o sin
  un marcador de dos números, ENTONCES EL SISTEMA la omite y muestra las demás; si se omiten
  todas, rige RF-8.
- RF-10: MIENTRAS las partidas de Leetify se están pidiendo, EL SISTEMA muestra el resto de la
  ficha sin esperarlas y un indicador de carga en el bloque de partidas.

### Lo que no cambia
- RF-11: EL SISTEMA mantiene las partidas simuladas, con "Datos de demostración", en las cuentas
  de CS2 sin verificar, en las demás cuentas que hoy las tienen simuladas y en el modo simulado
  de la interfaz, donde nunca muestra partidas atribuidas a Leetify (spec 015, RF-22 y RF-23).
- RF-12: EL SISTEMA calcula las coincidencias igual que hoy. Hoy no usan las partidas (solo el
  rango, la verificación y la disponibilidad), así que las partidas de Leetify no entran en
  ellas.

## Requisitos no funcionales
- RNF-1: Las pruebas simulan Leetify y pasan sin conexión y sin clave (spec 015, RNF-1).
- RNF-2: Las partidas se obtienen solo de la API pública de Leetify, con la misma clave opcional
  y las mismas reglas de secreto de la spec 015 (RNF-2, RNF-3).
- RNF-3: Una falla de Leetify al pedir las partidas nunca cambia el rango guardado de la cuenta
  ni su estado (con rating, sin rango Premier o rango no disponible).
- RNF-4: Nada nuevo en la base de datos y ninguna migración.

## Casos límite
- Leetify entrega menos de 8 partidas: se muestran todas las que entrega (RF-2).
- Leetify entrega más de 8: se muestran las 8 de término más reciente (RF-2).
- Partida empatada: resultado "Empate" (RF-3).
- Leetify responde con perfil pero sin partidas recientes: "No hay partidas disponibles en
  Leetify" (RF-8).
- Leetify tarda más de 8 segundos: el texto de RF-7, sin bloquear el resto de la ficha (RF-10).
- La cuenta tiene el rango no disponible porque la última lectura del rango falló, pero ahora
  Leetify responde: se muestran las partidas; el rango sigue como está (RNF-3).
- Recargar la ficha vuelve a pedir las partidas a Leetify (RF-1, sin caché).
- Partidas simuladas que ya están guardadas para cuentas de CS2 verificadas: dejan de mostrarse
  en esas cuentas; esta versión no las borra (RNF-4).

## Fuera de alcance
- El historial del rango Premier: RF-11 y RF-12 de la spec 015 no cambian.
- Coincidencias: siguen usando lo de hoy, que no incluye las partidas (RF-12).
- El detalle de una partida y cualquier dato de la partida además de fecha, mapa, resultado y
  marcador (rango en la partida, estadísticas, etc.).
- Otras consultas de Leetify para partidas: la de partidas del perfil y la de detalle de
  partida. Solo se usa la consulta de perfil que ya se hace.
- Cualquier caché de las partidas, en el servidor o en la interfaz.
- Borrar las partidas simuladas ya guardadas de cuentas de CS2 verificadas.
- El porcentaje de victorias calculado con partidas de Leetify (D2).
- Partidas reales de CS2 en cuentas sin verificar.

## Criterios de finalización
- [ ] RF-1 a RF-12 cubiertos por pruebas en verde, sin red (RNF-1).
- [ ] En el navegador, con Leetify simulado: una cuenta verificada muestra sus partidas con
      "Datos de Leetify", el logo y "View on Leetify", sin porcentaje de victorias; con Leetify
      caído o sin partidas, el texto de RF-7 y RF-8 con el resto de la ficha intacto.
- [ ] Modo simulado: ninguna partida atribuida a Leetify (RF-11).
- [ ] Ningún cambio en la base de datos ni migraciones (RNF-4).

## Impacto en otras specs y documentos
Los archivos de otras specs no se editan: cada excepción es un RF de esta spec.
- **Spec 015**: D3 (en lo que dice de las partidas) y RF-13 quedan reemplazados por RF-2 a RF-5;
  su "Fuera de alcance" deja de excluir las partidas reales de CS2 de Leetify; su
  "Impacto" sobre la spec 013 ("las partidas siguen simuladas") deja de regir.
- **Spec 012**: en las cuentas de CS2 verificadas con Steam, el bloque de partidas tiene origen
  Leetify en lugar de simulado (RF-5).
- **Spec 004 / 007**: en esas cuentas el bloque de partidas no muestra el porcentaje de
  victorias (RF-4).
- **`PRODUCT.md`**: "Evidence on Hand" y "Capabilities" se actualizan al implementar esta spec.

## Dudas abiertas
Ninguna.
