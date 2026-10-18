# Spec 005 — Coincidencias en el servidor
Estado: borrador

## Contexto y objetivo
El cruce de juego, rango y horario es el producto (`PRODUCT.md`, principio 1). Hoy lo
calcula la interfaz contra el backend simulado; con el servidor real, el cálculo pasa al
servidor con el mismo criterio, para que la vista de coincidencias no cambie.

Esta spec agrega la consulta de coincidencias por juego con sus filtros. Las coincidencias
se calculan en cada consulta y no se guardan.

Como R6 no tiene fuente oficial de rango (spec 004), en R6 las coincidencias solo cruzan
horario. Eso contradice el principio 1 de `PRODUCT.md` (rango y horario juntos): se acepta
de forma explícita como limitación de este hito y es reversible si aparece una fuente
oficial; en ese caso R6 vuelve a la regla general sin cambiar esta spec más que RF-10.

- Depende de: spec 004 (cuentas y rango) y spec 003 (disponibilidad).
- Origen: HU-09; RF-16 de la spec original.
- Las decisiones técnicas ya tomadas (sección 2 —entidades—, RT-12, secciones 5.1
  —`domain/`—, 8 —`unit/` y `matches.test.ts`—) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.

## Usuarios
- Jugador con cuenta en un juego que busca con quién jugar a su nivel y en su horario.

## Historias de usuario
- HU-1. Como jugador, quiero ver los jugadores de mi juego con rango similar y horas en
  común, ordenados por qué tan bien calzan conmigo, para elegir con quién jugar.
- HU-2. Como jugador, quiero filtrar por distancia de rango, horas en común, cuentas
  verificadas y nombre para acotar la lista.

## Definiciones
- **Candidato**: otro usuario con cuenta en el juego consultado.
- **Distancia de rango**: diferencia absoluta entre los rangos normalizados vigentes (spec
  004) del usuario y del candidato. No existe cuando el juego no tiene fuente de rango.
- **Bloques en común**: intersección de la disponibilidad (spec 003) de ambos.
- **Puntaje**: `redondear(0,55 × R + 0,45 × H)`, con `R = máx(0, 100 − 4 × distancia)` y
  `H = mín(100, bloques en común / 8 × 100)`. Es el criterio que aplica hoy la interfaz:
  una distancia de 25 o más anula el componente de rango y 8 horas o más en común saturan
  el de horario.
- **Puntaje solo horario**: `redondear(H)`. Se usa en los juegos sin fuente de rango.
- **Cuenta verificada**: la definida en la spec 004 (el dueño inició sesión en la
  plataforma del juego; en este hito solo CS2).
- **Filtros**: juego (obligatorio), distancia máxima de rango (número de 0 a 100; si falta,
  100), mínimo de horas en común (número de 0 a 168; si falta, 0), solo cuentas verificadas
  y texto de búsqueda. En la interfaz los dos filtros numéricos son barras deslizantes
  (distancia 0-50 en pasos de 5, por defecto 25; horas 0-12 en pasos de 1, por defecto 2),
  así que los valores ausentes o fuera de rango solo llegan por llamadas directas a la API.

## Requisitos funcionales
- RF-1: EL SISTEMA exige sesión válida para consultar coincidencias.
- RF-2: CUANDO un usuario consulta las coincidencias de un juego, EL SISTEMA responde 200 con
  la lista de candidatos que cumplen todos los filtros, ordenada por puntaje de mayor a
  menor.
- RF-3: EL SISTEMA entrega por cada candidato sus datos públicos (sin correo), su cuenta del
  juego, la distancia de rango (cuando existe), los bloques en común y el puntaje.
- RF-4: EL SISTEMA excluye siempre al usuario de la sesión de sus propias coincidencias.
- RF-5: SI falta el juego o no es un juego válido, ENTONCES EL SISTEMA responde 400.
- RF-6: SI el usuario de la sesión no tiene cuenta en el juego consultado, ENTONCES EL
  SISTEMA responde 404.
- RF-7: EL SISTEMA excluye a los candidatos cuya distancia supera la distancia máxima o
  cuyos bloques en común son menos que el mínimo de horas.
- RF-8: MIENTRAS el filtro de solo verificadas está activo, EL SISTEMA excluye a los
  candidatos cuya cuenta no está verificada.
- RF-9: CUANDO hay texto de búsqueda, EL SISTEMA conserva solo a los candidatos cuyo nombre
  visible o nombre de usuario lo contiene, sin distinguir mayúsculas ni espacios en los
  extremos del texto.
- RF-10: MIENTRAS el juego consultado no tiene fuente de rango (R6), EL SISTEMA no entrega
  distancia de rango, no aplica el filtro de distancia máxima y calcula el puntaje solo
  horario.
- RF-11: CUANDO un filtro numérico no se envía, EL SISTEMA aplica su valor sin restricción
  (distancia máxima 100, mínimo de horas 0).
- RF-12: SI la distancia máxima o el mínimo de horas no es un número o está fuera de su
  rango (0-100 y 0-168), ENTONCES EL SISTEMA responde 400 con un mensaje que nombra el
  filtro.

## Requisitos no funcionales
- RNF-1: El criterio de puntaje, el puntaje solo horario y la lectura de filtros son reglas
  puras, probadas por separado de la consulta (constitución, principio 3).
- RNF-2: La forma de cada candidato es la misma que consume hoy la vista de coincidencias,
  salvo el correo del candidato, que no se entrega (constitución, principio 5), y la
  distancia, que falta en R6 (RF-10).

## Casos límite
- Sin candidatos o sin ninguno que cumpla los filtros: 200 con lista vacía.
- Candidato sin disponibilidad: cero bloques en común; puede aparecer si el mínimo de horas
  es 0.
- Búsqueda vacía o solo con espacios: no filtra.
- R6 con distancia máxima 0: no excluye a nadie (RF-10); el puntaje de un candidato con 4
  horas en común es 50 y con 8 o más, 100.
- R6 con distancia máxima fuera de rango (ej. 150): 400 igual que en los otros juegos
  (RF-12 se aplica antes que RF-10).
- Filtro de solo verificadas en LoL o R6: lista vacía en este hito, porque esas cuentas no
  se pueden verificar (spec 004).
- Distancia máxima `abc`, `-1` o `101`, o mínimo de horas `169`: 400 nombrando el filtro.
- Distancia máxima `0` en LoL: solo candidatos con el mismo rango normalizado.

## Fuera de alcance
- Guardar coincidencias o su historial.
- Comparar rangos entre juegos distintos (sigue sin decidirse, `PRODUCT.md`).
- Cambios en la vista de coincidencias (spec 007).

## Criterios de finalización
- [ ] El criterio de puntaje tiene pruebas unitarias: distancia ≥ 25 anula el rango, ≥ 8
      horas saturan el horario, el puntaje se redondea; puntaje solo horario con 0, 4 y 8
      horas; intersección de bloques sin traslape, con traslape parcial y con listas vacías.
- [ ] La lectura de filtros tiene pruebas unitarias: ausente, no numérico, en los extremos y
      fuera de rango.
- [ ] Cada RF tiene al menos una prueba automática en verde, incluida una por filtro y una
      de R6 sin distancia.
- [ ] Una prueba confirma que ningún candidato trae correo ni hash.
- [ ] Comprobación de tipos y pruebas del servidor en verde.

## Dudas abiertas
- [NECESITA ACLARACIÓN] Escala de CS2 (spec 004): ¿la distancia y el puntaje de CS2 usan el
  rango normalizado de FACEIT, de Premier o una combinación?
- [NECESITA ACLARACIÓN] En LoL y CS2, si el usuario de la sesión o el candidato es una
  cuenta sin rango (sin clasificar, sin FACEIT), no hay distancia. ¿Ese candidato se
  excluye, se incluye con puntaje solo horario como en R6 sin aplicarle el filtro de
  distancia, o se incluye solo cuando la distancia máxima es 100?
