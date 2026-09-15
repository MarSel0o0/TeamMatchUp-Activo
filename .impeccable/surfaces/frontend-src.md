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

THESIS: la aplicación es la hoja de inscripción de una LAN — cada hora es una línea
donde alguien escribe su nombre y los demás se anotan debajo. Rechaza el arreglo por
defecto del rubro: la parrilla de tarjetas iguales de icono + título + texto, y su
opuesto predecible, el dashboard oscuro con acento neón y bordes brillantes.

OWN-WORLD: papel de formulario continuo en stock oscuro, con bandas alternas de fila;
reglado hairline que estructura cada superficie en vez de tarjetas; margen de
perforación (sprockets) impreso como elemento estructural real al costado de las
rejas; numeración de filas; sellos de goma rotados para los estados verificados; una
sola familia tipográfica (Archivo, autohospedada) con numerales tabulares en todo
dato; tinta clara sobre papel oscuro, un tinte de sello saturado y tres tintas de
juego usadas solo donde el juego es la información.

STORY: el visitante entiende que otros ya escribieron sus horas; cree que hay gente
real de su nivel en bloques que le calzan, porque el rango viene sellado desde la
fuente y no declarado; y firma una línea — publica una sesión o se anota en la de
otro.

FIRST VIEWPORT: la agenda abre con la hoja completa ocupando el ancho: siete columnas
de día, las horas como filas numeradas contra el margen de perforación, y las
sesiones ya escritas dentro de sus bloques con la tinta de su juego. Sobre la hoja,
una cabecera de formulario con el nombre del documento y los filtros como casillas;
la acción primaria, anotar una sesión, vive en la esquina superior derecha de la hoja
y también en cada línea vacía al pasar por encima.

FORM: hoja de inscripción de LAN party; candidato 6 de mi lista ordenada por
resonancia; seed key 41f83abf. El dado corrió degradado (sin challengers ni tableros
de calidad) porque la política de red del entorno bloquea el servicio de roll.
Traducción de material declarada: el mundo es papel, pero la escena de uso es
nocturna, así que el stock se imprime oscuro en vez del crema que el artefacto
tendría de día.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
