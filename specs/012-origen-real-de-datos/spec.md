# Spec 012 — Origen real de los datos y cuentas verificadas
Estado: implementada (validada el 2026-11-18). Aprobada el 2026-11-04; aclaración de RF-6
del 2026-11-18, tras la primera validación (aprobada por el usuario el 2026-11-18).

## Contexto y objetivo
Hoy el rango, el historial, las partidas y la marca de verificada de toda cuenta de juego los
entrega un proveedor simulado y se etiquetan como "Datos de demostración" (spec 004, spec 007).
`PRODUCT.md` (principio 2) dice que el rango "se obtiene, no se declara" y que la verificación
es lo que separa TeamMatchUp de un mensaje en Discord: con todo simulado, ese principio no se
cumple.

Esta spec prepara la plataforma para que una cuenta de juego pueda pasar a ser **verificada**:
su dueño demostró ante la plataforma del juego que la controla, y desde entonces sus datos
provienen de una **fuente real**. No agrega ninguna fuente concreta: la verificación con
Steam (CS2) es la spec 013 y la verificación de Riot ID (LoL) es la spec 014. Rainbow Six
Siege no cambia (queda simulado; una posible spec 015).

Lo que sí fija esta spec, común a las 013 y 014:
- qué significa "cuenta verificada" y quién puede tenerla;
- que cada bloque de datos de una cuenta declara su origen (fuente real o simulado);
- la exclusividad de una cuenta real verificada entre usuarios;
- la resincronización bajo demanda con espera mínima;
- qué pasa cuando una fuente real no responde o no está configurada.

- Depende de: specs 001 a 007 y 011 (implementadas o en borrador).
- Origen: conversación con el usuario del 2026-11-04 (preguntas 1 a 5, en "Decisiones del
  usuario").

### Decisiones del usuario
- **2026-11-04 — P1. Riot con development key.** Se usará la clave de desarrollo de Riot y se
  renovará cada vez que caduque (24 h). El equipo sabe y acepta que los términos de Riot no
  admiten un producto público con esa clave, y lo asume para la demostración del curso.
  **Esta decisión revoca** la de la spec 004 del 2026-10-17 ("Todo simulado, sin fuentes"),
  tomada justamente por ese motivo. Detalle en la spec 014.
- **2026-11-04 — P2. Solo cuenta la verificación real.** La marca de verificada deja de
  fijarla el simulador: una cuenta solo está verificada si su dueño la verificó con la
  plataforma del juego. Todas las cuentas simuladas, incluidas las de demostración, quedan sin
  verificar. Se aceptó que el filtro "Solo verificadas" de Coincidencias quede casi vacío en
  la demostración hasta que haya cuentas verificadas de verdad. **Revoca** RF-41 de la
  spec 004 y la "proporción fija de cuentas verificadas" (spec 004, decisión del 2026-10-17).
- **2026-11-04 — P3. El vínculo manual se mantiene.** Vincular una cuenta escribiendo su
  identificador sigue igual que hoy (sin verificar, con datos simulados). Verificar es un paso
  posterior, desde el perfil, que pasa la cuenta a datos reales.
- **2026-11-04 — P4. La primera verificación gana, con exclusividad.** Una cuenta real solo
  puede estar verificada por un usuario de TeamMatchUp. Si otro usuario ya la verificó, la
  nueva verificación se rechaza. Al verificarse, se desvinculan automáticamente las cuentas
  sin verificar de otros usuarios con ese mismo identificador.
- **2026-11-04 — P5. Actualización solo bajo demanda.** Los datos reales se actualizan
  únicamente cuando el dueño pide resincronizar, con una espera mínima de 5 minutos entre
  resincronizaciones de una misma cuenta verificada. No hay actualización automática.
- **2026-11-04 — D1. Visibilidad.** La marca de verificada y el origen de cada bloque son
  visibles para cualquier usuario con sesión (perfil, ficha de jugador, coincidencias), no
  solo para el dueño: es lo que da confianza (HU-2). RF-22.
- **2026-11-04 — D2. Singular.** Con un minuto restante el mensaje de RF-16 dice "espera 1
  minuto antes de volver a resincronizar".
- **2026-11-04 — D3. Rótulo del filtro.** "Solo cuentas con rango verificado" pasa a "Solo
  cuentas verificadas", porque una cuenta de CS2 verificada con Steam tiene su rango simulado
  (spec 013). RF-23.

## Usuarios
- Jugador registrado que quiere que su rango y su identidad en el juego se vean como reales.
- Jugador que busca compañeros y quiere distinguir cuentas comprobadas de cuentas declaradas.
- Evaluación del curso: debe poder ver qué datos son reales y cuáles de demostración.

## Historias de usuario
- HU-1. Como jugador, quiero que mi cuenta verificada muestre que sus datos vienen de la
  plataforma del juego, para que los demás confíen en mi rango.
- HU-2. Como jugador que busca compañeros, quiero filtrar solo cuentas verificadas de verdad,
  para no jugar con alguien que declaró un rango falso.
- HU-3. Como dueño real de una cuenta, quiero que nadie más pueda presentarla como suya, para
  que mi identidad en TeamMatchUp sea única.
- HU-4. Como jugador, quiero actualizar mis datos reales cuando lo necesite, para ver mi rango
  vigente.

## Definiciones
- **Fuente real**: la plataforma oficial de un juego consultada por la plataforma para obtener
  identidad o datos de una cuenta (Steam para CS2, spec 013; Riot Games para LoL, spec 014).
- **Verificar una cuenta**: proceso, propio de cada fuente real, con el que el usuario de la
  sesión demuestra que controla una cuenta del juego.
- **Cuenta verificada**: cuenta de juego cuyo dueño completó la verificación con su fuente real
  y que no se ha desvinculado desde entonces. Ninguna otra cuenta está verificada.
- **Cuenta sin verificar**: cualquier otra cuenta, vinculada a mano (spec 004). Todos sus
  datos son simulados.
- **Identificador real**: el identificador estable que la fuente real asigna a la cuenta, que
  no cambia aunque el jugador cambie su nombre visible (por ejemplo, el SteamID64, o el
  identificador interno de Riot detrás de un Riot ID). Es el que decide si dos cuentas son
  "la misma cuenta real".
- **Bloque de datos**: cada grupo de datos de una cuenta que puede tener un origen distinto:
  (1) identidad (identificador y nombre visible), (2) rango e historial, (3) últimas
  partidas, (4) perfil del juego (avatar, nivel, horas jugadas, según la fuente).
- **Origen de un bloque**: `simulado` o el nombre de la fuente real de la que vino.
- **Espera mínima**: 5 minutos contados desde la última resincronización exitosa de una cuenta
  verificada.

## Requisitos funcionales

### Marca de verificada
- RF-1: EL SISTEMA marca una cuenta como verificada solo cuando su dueño completa la
  verificación con su fuente real (specs 013 y 014); ninguna otra operación la marca.
- RF-2: EL SISTEMA muestra como no verificada toda cuenta vinculada a mano, toda cuenta de
  Rainbow Six Siege y toda cuenta de los datos de demostración (spec 011).
- RF-3: CUANDO el usuario desvincula una cuenta verificada, EL SISTEMA elimina también su
  verificación; si la vuelve a vincular, la cuenta queda sin verificar.
- RF-4: MIENTRAS el filtro "Solo verificadas" de Coincidencias está activo, EL SISTEMA
  conserva solo a los candidatos cuya cuenta del juego filtrado está verificada según RF-1.
- RF-22: EL SISTEMA muestra a cualquier usuario con sesión la marca de verificada de una
  cuenta y el origen de cada uno de sus bloques, en el perfil, la ficha de jugador y las
  coincidencias.
- RF-23: EL SISTEMA rotula el filtro de RF-4 como "Solo cuentas verificadas", y los mensajes
  de error de ese filtro usan ese mismo rótulo (spec 005, RF-14).

### Origen de los datos
- RF-5: EL SISTEMA informa, para cada bloque de datos de cada cuenta, su origen.
- RF-6: EL SISTEMA muestra junto a cada bloque de origen simulado la etiqueta
  "Datos de demostración", y junto a cada bloque de origen real el nombre de su fuente
  ("Datos de Steam", "Datos de Riot Games").
- RF-7: EL SISTEMA nunca atribuye a una fuente real un dato simulado, ni muestra como simulado
  un dato obtenido de una fuente real.
- RF-6 incluye el bloque de identidad: junto al identificador de la cuenta se muestra la
  etiqueta de su origen (aclaración del 2026-11-18).
- RF-8: CUANDO una cuenta sin verificar pasa a verificada, EL SISTEMA descarta su rango, su
  historial y sus partidas simulados y los reemplaza por los de la fuente real en los bloques
  que esa fuente entrega; los bloques que la fuente no entrega siguen simulados y etiquetados
  (RF-6).
- RF-9: EL SISTEMA agrega un punto al historial de rango de una cuenta verificada solo cuando
  una lectura de la fuente real trae un rango distinto del vigente, y nunca mezcla en un mismo
  historial puntos simulados y reales.

### Exclusividad de la cuenta real
- RF-10: SI el usuario intenta verificar una cuenta real que otro usuario ya tiene verificada,
  ENTONCES EL SISTEMA rechaza la verificación con 409 "esta cuenta ya está verificada por otro
  usuario" y no cambia ninguna cuenta.
- RF-11: CUANDO una cuenta queda verificada, EL SISTEMA desvincula en ese mismo momento las
  cuentas sin verificar de otros usuarios que tengan el mismo juego y el mismo identificador
  real o el mismo identificador escrito.
- RF-12: SI el usuario intenta vincular a mano un identificador que corresponde a una cuenta
  verificada por otro usuario, ENTONCES EL SISTEMA rechaza el vínculo con 409 "esta cuenta ya
  está verificada por otro usuario".
- RF-13: CUANDO el usuario verifica una cuenta de un juego en el que ya tenía una cuenta sin
  verificar, EL SISTEMA convierte esa cuenta en la verificada (sigue habiendo una sola cuenta
  por juego y usuario, spec 004), y reemplaza su identificador por el verificado si eran
  distintos.

### Edición de cuentas verificadas
- RF-14: SI el usuario intenta cambiar el identificador o la región de una cuenta verificada,
  ENTONCES EL SISTEMA rechaza el cambio con 400 "una cuenta verificada no se puede editar:
  desvincúlala y vuelve a verificarla".

### Resincronización
- RF-15: CUANDO el dueño pide resincronizar una cuenta verificada, EL SISTEMA consulta su
  fuente real y actualiza los bloques de origen real.
- RF-16: SI el dueño pide resincronizar una cuenta verificada antes de cumplirse la espera
  mínima, ENTONCES EL SISTEMA responde 429 "espera N minutos antes de volver a
  resincronizar" (N = minutos que faltan, redondeados hacia arriba; con N = 1, "espera 1
  minuto antes de volver a resincronizar") sin consultar la fuente.
- RF-17: EL SISTEMA no actualiza por su cuenta los datos de una cuenta verificada: solo lo
  hace al verificarla (RF-8) y al resincronizarla (RF-15).
- RF-18: MIENTRAS una cuenta no está verificada, EL SISTEMA resincroniza como hoy (spec 004),
  sin espera mínima.

### Fuente no disponible
- RF-19: SI la fuente real no responde, rechaza la consulta, supera su límite de consultas o no
  está configurada, ENTONCES EL SISTEMA responde 503 "<fuente> no está disponible por ahora,
  intenta más tarde", conserva sin cambios la cuenta y sus datos, y no cuenta el intento para
  la espera mínima.
- RF-20: MIENTRAS una fuente real no está configurada, EL SISTEMA arranca y funciona igual, y
  vincular a mano, ver y resincronizar cuentas sin verificar siguen disponibles.
- RF-21: SI la fuente real informa que la cuenta ya no existe, ENTONCES EL SISTEMA responde 404
  "la cuenta ya no existe en <fuente>", conserva la cuenta con sus últimos datos y la mantiene
  verificada.

## Requisitos no funcionales
- RNF-1: Toda la suite de pruebas pasa sin conexión a Internet y sin claves de fuentes reales
  (como exigen las specs 001 y 004).
- RNF-2: Las claves de las fuentes reales son secretos de entorno: nunca aparecen en el
  repositorio, en respuestas, en mensajes de error ni en registros.
- RNF-3: Ninguna respuesta expone el identificador real interno de una fuente cuando es
  distinto del identificador que el usuario ve (por ejemplo, el identificador interno de Riot).
- RNF-4: Los mensajes nuevos van en español, en minúscula y sin punto final (spec 002, RNF-7).
- RNF-5: Una consulta a una fuente real que no responde en 8 segundos cuenta como fuente no
  disponible (RF-19).

## Casos límite
- Usuario A verifica la cuenta X; B la tenía vinculada sin verificar: la cuenta de B
  desaparece de su perfil, sin aviso (RF-11).
- Tras lo anterior, B intenta vincular X a mano: 409 (RF-12).
- A desvincula X: B ya puede vincularla a mano o verificarla (RF-3, RF-12).
- A tenía LoL vinculado a mano con `Uno#LAS` y verifica `Dos#LAS`: queda una sola cuenta de
  LoL, verificada, con `Dos#LAS` (RF-13).
- Dos usuarios verifican la misma cuenta casi al mismo tiempo: solo una verificación gana; la
  otra recibe 409 (RF-10).
- Resincronización a los 4 min 10 s de la anterior: 429 "espera 1 minuto antes de volver a
  resincronizar" (RF-16).
- La fuente cae a mitad de una resincronización: 503, datos intactos, la siguiente petición no
  espera (RF-19).
- El jugador cambió su nombre visible en la fuente: la cuenta sigue siendo la misma (mismo
  identificador real) y la resincronización actualiza el nombre que se muestra.
- Cuenta de R6: nunca verificada, siempre "Datos de demostración" (RF-2).
- Datos de demostración de la spec 011: todas sin verificar (RF-2).

## Fuera de alcance
- Fuentes reales concretas (specs 013 y 014) y Rainbow Six Siege real.
- Actualización automática o periódica de los datos reales.
- Avisos o notificaciones al usuario cuya cuenta se desvinculó por RF-11.
- Disputas de propiedad: recuperar una cuenta verificada por otro usuario.
- Iniciar sesión en TeamMatchUp con Steam o Riot.

## Criterios de finalización
- [x] RF-1 a RF-23 cubiertos por pruebas en verde, sin red (RNF-1). (Desmarcado el 2026-11-18
      por RF-14 sin prueba del endpoint; vuelto a marcar con la T11.)
- [x] Ninguna cuenta de demostración sale verificada; el filtro "Solo verificadas" solo
      deja pasar cuentas verificadas por RF-1.
- [x] En la interfaz cada bloque de datos muestra su origen (RF-6). (Desmarcado el
      2026-11-18 por la identidad sin etiqueta; vuelto a marcar con la T11.)
- [x] Constitución, `PRODUCT.md` y specs afectadas actualizadas (ver "Impacto").
      (`PRODUCT.md` queda para las specs 013 y 014, como dice "Impacto".)

## Impacto en otras specs y documentos
- **Constitución, principio 5**: hoy solo admite datos simulados y prohíbe atribuirlos a una
  fuente real. Propuesta de texto adicional (requiere aprobación del usuario): "Los datos de
  una cuenta verificada que la plataforma obtiene de la fuente oficial del juego son reales y
  se muestran atribuidos a esa fuente; nunca se atribuye a una fuente real un dato simulado."
- **`PRODUCT.md`**: "Evidence on Hand" y "Capabilities" dicen que no hay integración viva con
  Riot o Steam; se actualizan cuando se implementen las specs 013 y 014.
- **Spec 004**: se revocan RF-41 y la proporción fija de verificadas; la decisión "Todo
  simulado, sin fuentes" queda revocada para LoL y CS2; "Fuera de alcance" deja de excluir
  Steam OpenID y la verificación de propiedad; la marca fija de datos simulados pasa a ser
  por bloque (RF-5); editar y resincronizar suman RF-14 y RF-16.
- **Spec 005**: el filtro "Solo verificadas" usa RF-1 (RF-4) y cambia su rótulo y sus
  mensajes a "Solo cuentas verificadas" (RF-23).
- **Spec 007**: la etiqueta "Datos de demostración" pasa a ser por bloque (RF-6).
- **Spec 008**: la ficha de jugador muestra el origen por bloque y la marca de verificada real.
- **Spec 011**: los datos de demostración salen todos sin verificar.

## Dudas abiertas
Ninguna. D1 a D3 se cerraron el 2026-11-04 (ver "Decisiones del usuario").
