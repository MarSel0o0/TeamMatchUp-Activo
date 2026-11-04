---
version: 1
slug: "frontend-src"
primary_target: "frontend/src"
related_targets: []
---

Scope: toda la interfaz autenticada de TeamMatchUp (acceso, perfil, configuración,
coincidencias, agenda). Modo visitante: Operate; la pantalla de acceso es la única
que persuade.

Audiencia: jugadores de LoL, R6 y CS2 sin grupo fijo, de noche, con el juego
minimizado al lado. Evaluación académica como audiencia secundaria: las cinco vistas
del Hito deben quedar evidentes.

Tarea: cruzar rango verificado con traslape horario y terminar en una sesión
agendada. Momento memorable elegido por el usuario: concretar la sesión, así que la
agenda es la superficie insignia y recibe el peso del diseño.

Restricciones: español; React 18 + TS + Vite; datos simulados etiquetados como
tales; sin inventar cifras, usuarios ni respaldos.

## Direction contract

THESIS: la aplicación es el lobby antes de la partida: una sala nocturna donde tres
condiciones (juego, rango, horario) se cruzan y solo el traslape se enciende. Rechaza
la parrilla de tarjetas iguales de icono + título + texto y el dashboard oscuro con
neón en todos los bordes: el brillo se reserva para el traslape y la acción.

OWN-WORLD: grafito profundo con grano fijo y luz ambiental tenue; paneles con bisel
doble y borde que se ilumina bajo el cursor; navegación en isla flotante de vidrio;
un único acento volt (#cdf24b) para lo que el jugador hace y para el traslape; Geist
para el texto y Geist Mono para todo dato; tres tintas de juego usadas solo donde el
juego es la información. Regla de forma: paneles 22px, internos 12px, interactivos
en píldora.

STORY: el visitante ve tres círculos que se encuentran y entiende que el producto es
la zona en común; cree que hay gente de su nivel porque el rango se lee desde la
fuente; y termina publicando una sesión o sumándose a la de otro.

MOTION: todo movimiento tiene motivo (jerarquía, secuencia, respuesta o cambio de
estado). Transiciones de página con fundido y blur; revelados al entrar en pantalla
con IntersectionObserver; píldora activa con layoutId; filas que se reacomodan al
filtrar; contadores y anillos de afinidad que se llenan; resorte en botones
principales. Solo transform y opacity; `prefers-reduced-motion` respetado vía
MotionConfig y CSS.

FIRST VIEWPORT: la agenda abre con la semana completa, las horas propias iluminadas
y las sesiones ya publicadas con la tinta de su juego. La acción primaria, anotar una
sesión, vive arriba a la derecha y también en cada bloque vacío al pasar por encima.
