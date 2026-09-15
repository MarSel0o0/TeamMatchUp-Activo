# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jugadores de League of Legends, Rainbow Six Siege y Counter-Strike 2 que no tienen
un grupo fijo. Llegan después de una mala racha jugando con desconocidos asignados
por el emparejamiento automático: sin comunicación, con diferencias grandes de
nivel dentro del equipo. Muchos sí conocen gente con quien jugar, pero nunca logran
coincidir en horarios.

La audiencia secundaria es la evaluación académica del Hito 1: las cinco vistas del
enunciado deben quedar evidentes y demostrables para quien revisa.

## Product Purpose

Cruzar tres condiciones que hoy ninguna herramienta resuelve junta: que dos personas
jueguen el mismo título, que tengan un nivel competitivo similar y que estén
disponibles en los mismos bloques horarios. El éxito no es que el usuario reciba una
lista de perfiles: es que termine con una sesión agendada y jugada.

## Positioning

La coordinación hoy ocurre en servidores de Discord, foros y grupos de mensajería,
donde los mensajes se pierden, nadie verifica el nivel real de cada jugador y no
existe ningún mecanismo que cruce disponibilidad horaria. TeamMatchUp obtiene el
rango desde la fuente de cada juego —no lo declara el usuario— y lo cruza con una
grilla horaria semanal explícita. Un competidor no puede copiar eso sin construir
las dos mitades.

## Operating Context

El usuario declara sus bloques disponibles una vez y los ajusta poco. Vuelve a la
aplicación cuando quiere jugar: revisa quién calza con él y busca cerrar un horario
concreto. El uso real ocurre de noche y en fines de semana, frente al mismo monitor
donde juega, muchas veces con el juego abierto al lado.

El rango cambia con el tiempo, así que la plataforma lo reobtiene de forma periódica
desde APIs públicas o scraping de sitios de estadísticas, y conserva el historial de
variación además del valor vigente.

## Capabilities and Constraints

Confirmado y construido:

- Registro e inicio de sesión con credenciales propias; el resto de la aplicación
  exige sesión iniciada y cada usuario modifica solo su información.
- Vinculación de cuentas por juego (Riot ID, Ubisoft ID, SteamID64). No es
  obligatorio registrar los tres: cada usuario declara solo los que juega.
- Grilla de disponibilidad semanal por bloques de una hora.
- Perfil con rango vigente, historial de variación y últimas partidas; el cambio
  entre juegos ocurre sin recargar la página.
- Coincidencias por juego con filtros dinámicos.
- Agenda semanal: publicar sesiones en bloques concretos y sumarse a las de otros.

Restricciones técnicas:

- React 18 + TypeScript + Vite. El backend Express todavía no existe: el acceso a
  datos pasa por un contrato único (`services/apiContract.ts`) con dos
  implementaciones intercambiables, y hoy corre la simulada en el navegador.
- Interfaz en español.
- Escalas de rango distintas por juego, normalizadas a 0-100 para poder compararlas.

Explícitamente sin decidir (el enunciado las marca como preliminares): el criterio
exacto de similitud de rango entre juegos y la fuente de datos definitiva de cada
título.

## Brand Commitments

- Nombre: TeamMatchUp.
- Los tres juegos y sus identidades son material del producto, no decoración.
- El usuario pidió una interfaz interactiva y llamativa, que retenga la atención.
  Queda registrado como restricción, sin expandirlo aquí.

## Evidence on Hand

No existe ningún dato real todavía: no hay usuarios registrados, ni cuentas
vinculadas verificadas, ni partidas reales, ni integración viva con Riot, Ubisoft o
Steam. Todo lo que se ve hoy son datos de demostración generados con semilla fija y
están etiquetados como tales en la interfaz.

Nada de lo siguiente puede inventarse: cantidad de usuarios, partidas emparejadas,
testimonios, tasas de éxito o respaldo de los estudios de los juegos.

## Product Principles

1. El cruce es el producto. Rango sin horario, u horario sin rango, es la mitad
   inútil; toda vista debe mostrar las dos dimensiones juntas.
2. El rango se obtiene, no se declara. La verificación es lo que separa esto de un
   mensaje en Discord.
3. La lista de compatibles no es el final. El flujo termina en una sesión agendada.
4. El usuario llega cansado y con el juego abierto al lado. La interfaz compite con
   volver a jugar solo, no con otra aplicación.
5. Nada inventado: los datos de demostración se muestran como lo que son.

## Accessibility & Inclusion

Uso nocturno prolongado frente al monitor de juego. Sin requisito normativo
establecido por el usuario; se aplica el piso de contraste y operabilidad por
teclado del estándar de calidad del proyecto.
