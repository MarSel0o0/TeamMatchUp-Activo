# Spec 008 — Vista nueva: ficha de jugador
Estado: borrador

## Contexto y objetivo
El enunciado del Hito 2 exige dos vistas completas nuevas que funcionen de punta a punta
contra el servidor real y respeten las rutas protegidas, sin nombrarlas. La spec 001
original propuso dos y el usuario las confirmó; esta es la primera.

Hoy, desde una coincidencia, el jugador solo ve una tarjeta: no puede revisar el perfil
completo del otro antes de invitarlo. La ficha muestra rango y horario juntos (`PRODUCT.md`,
principio 1) y lleva directo a proponer una sesión (principio 3). Además usa operaciones del
servidor que las vistas actuales no usan: obtener un usuario por id y leer la
disponibilidad y el resumen por juego de otro usuario.

- Depende de: spec 007.
- Origen: HU-11, RF-24 (vista 1) y sección 7 (V1) de la spec original.
- Las decisiones técnicas ya tomadas (secciones 6.4 —operaciones nuevas del contrato— y 7
  —ruta, componentes y estados—) están en `specs/_referencia/001-crear-backend-original.md`
  y pasan al `plan.md` de esta spec.

## Usuarios
- Jugador con la sesión iniciada que vio a alguien en sus coincidencias o en una sesión de
  la agenda y quiere decidir si jugar con esa persona.

## Historias de usuario
- HU-1. Como jugador que vio una coincidencia, quiero abrir la ficha de esa persona para
  decidir si invitarla.
- HU-2. Como jugador, quiero ver en la ficha el rango, su evolución y las últimas partidas
  del otro en cada juego, y cambiar de juego sin recargar.
- HU-3. Como jugador, quiero ver qué horas tenemos en común y qué tan lejos estamos de rango
  para saber si nos sirve jugar juntos.
- HU-4. Como jugador, quiero proponer una sesión desde la ficha para no tener que armarla
  desde cero en la agenda.

## Definiciones
- **Ficha**: página propia de un jugador, identificada por su identificador.
- **Primer bloque en común**: el bloque en común con el día más temprano de la semana y, a
  igual día, la hora más temprana.
- **Distancia de rango** y **bloques en común**: los definidos en la spec 005.
- **Mensaje de R6**: el definido en la spec 007.

## Requisitos funcionales
- RF-1: MIENTRAS no hay sesión iniciada, EL SISTEMA no muestra la ficha y lleva a login
  recordando la ruta de origen (spec 007, RF-7).
- RF-2: EL SISTEMA ofrece un acceso a la ficha desde cada tarjeta de la vista de
  coincidencias y desde cada participante mostrado en la agenda.
- RF-3: CUANDO el jugador abre una ficha, EL SISTEMA muestra el nombre visible, el nombre de
  usuario, la biografía y las cuentas vinculadas del jugador, sin su correo.
- RF-4: EL SISTEMA muestra una pestaña por cada juego en que el jugador tiene cuenta y, para
  la pestaña elegida, su rango vigente, el historial de rango y las últimas partidas; en R6
  muestra el mensaje de R6 en lugar del rango y del historial.
- RF-5: CUANDO el jugador cambia de pestaña, EL SISTEMA muestra los datos del otro juego sin
  recargar la página.
- RF-6: EL SISTEMA muestra los bloques en común entre el jugador de la ficha y el usuario de
  la sesión, junto con la distancia de rango en el juego elegido.
- RF-7: CUANDO el usuario elige "Proponer sesión", EL SISTEMA lleva a la agenda con un
  borrador de sesión del juego elegido, ubicado en el primer bloque en común y con un
  título que nombra al jugador de la ficha.
- RF-8: MIENTRAS se cargan los datos, EL SISTEMA muestra un estado de carga.
- RF-9: SI el jugador no existe o su identificador no tiene formato válido, ENTONCES EL
  SISTEMA muestra el estado vacío "Este jugador no existe".
- RF-10: SI el jugador no tiene cuentas vinculadas, ENTONCES EL SISTEMA muestra un estado
  vacío que lo indica, en lugar de las pestañas.
- RF-11: EL SISTEMA obtiene todos los datos de la ficha del servidor real y funciona también
  en modo simulado.
- RF-12: MIENTRAS no hay bloques en común, EL SISTEMA desactiva "Proponer sesión" y muestra
  el motivo "No tienen horas en común".
- RF-13: SI el usuario de la sesión no tiene cuenta en el juego elegido, ENTONCES EL SISTEMA
  muestra, en lugar de la distancia, "Vincula tu cuenta de <juego> para ver la distancia de
  rango" con un enlace a Configuración.
- RF-14: MIENTRAS el juego elegido es R6, EL SISTEMA muestra el mensaje de R6 en lugar de
  la distancia, aunque el usuario de la sesión tenga cuenta en R6.
- RF-15: CUANDO el usuario de la sesión abre su propia ficha, EL SISTEMA lo redirige a su
  perfil (`/perfil`).

## Requisitos no funcionales
- RNF-1: Usa los componentes, tokens de diseño y patrones existentes; ningún color escrito a
  mano (`AGENTS.md`).
- RNF-2: Operable con teclado: pestañas, enlaces y acciones accesibles sin ratón, con foco
  visible (`PRODUCT.md`, accesibilidad). El motivo de "Proponer sesión" desactivado se
  anuncia también a lectores de pantalla.
- RNF-3: La biografía se muestra como texto, nunca como HTML.
- RNF-4: Construcción, comprobación de tipos y lint de la interfaz en verde.

## Casos límite
- Juego de la ficha que el usuario de la sesión no juega: la pestaña se muestra igual (RF-4)
  y la distancia se reemplaza por el texto de RF-13 (en R6 manda RF-14).
- Sin bloques en común y sin cuenta en el juego: se aplican RF-12 y RF-13 a la vez.
- Ficha propia abierta desde una sesión de la agenda donde participa el propio usuario:
  redirige al perfil (RF-15).
- El jugador de la ficha o el usuario de la sesión no tienen rango en LoL o CS2: lo que se
  muestra en lugar de la distancia depende de la duda abierta de la spec 005.

## Fuera de alcance
- Enviar invitaciones o mensajes al jugador.
- Editar datos desde la ficha.
- Detalle de sesión (spec 009).

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde.
- [ ] Recorrido manual contra el servidor real con cuentas reales del equipo: entrar desde
      una coincidencia y desde un participante de la agenda, cambiar de juego sin recargar,
      ver horas en común y distancia, y proponer sesión hasta ver el borrador en la agenda.
- [ ] Recorrido manual de los estados: carga, jugador inexistente, identificador mal
      formado, jugador sin cuentas, sin horas en común, sin cuenta propia en el juego,
      pestaña R6, ficha propia que redirige al perfil y acceso sin sesión que lleva a login.

## Dudas abiertas
- [NECESITA ACLARACIÓN] Qué se muestra en lugar de la distancia cuando alguno de los dos no
  tiene rango en LoL o CS2 (depende de la duda de la spec 005).
