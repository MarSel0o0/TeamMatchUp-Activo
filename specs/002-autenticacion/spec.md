# Spec 002 — Registro, inicio y cierre de sesión
Estado: borrador

## Contexto y objetivo
El Hito 2 exige registro, inicio de sesión, cierre de sesión y una operación que devuelva
la sesión actual, con el JWT en una cookie httpOnly y la información complementaria en
localStorage, de modo que la aplicación quede protegida contra XSS y CSRF. En la
presentación el equipo debe explicar qué ataque mitiga cada pieza.

Esta spec agrega al servidor de la spec 001 la creación de usuarios (el "crear" de la
entidad usuario) y la sesión completa, y deja lista la protección que usarán todas las
operaciones de las specs 003 a 006. La interfaz todavía no la consume: eso es la spec 007.

- Depende de: spec 001.
- Origen: HU-01, HU-02, HU-03 y HU-04 (parte del servidor), HU-13 (regla general) y HU-15;
  RF-01 a RF-04 de la spec original.
- Las decisiones técnicas ya tomadas (sección 2, RT-07, RT-08, RT-09, RT-11, RT-16, RT-19,
  secciones 5.4 —modelo de usuario—, 5.6, 5.7, 8 —`auth.test.ts` y altas de
  `users.test.ts`— y 10) están en `specs/_referencia/001-crear-backend-original.md` y pasan
  al `plan.md` de esta spec.

## Usuarios
- Jugador sin cuenta, que quiere registrarse.
- Jugador registrado, que entra, sigue dentro al volver y sale.
- Equipo evaluado, que debe demostrar qué mitiga cada pieza de la autenticación.

## Historias de usuario
- HU-1. Como jugador sin cuenta, quiero registrarme con correo, nombre de usuario y
  contraseña para usar la plataforma.
- HU-2. Como jugador registrado, quiero iniciar sesión con mi correo y mi contraseña para
  ver mis coincidencias.
- HU-3. Como jugador con la sesión iniciada, quiero que la aplicación pueda confirmar quién
  soy en cualquier momento para no tener que volver a entrar al recargar.
- HU-4. Como jugador, quiero cerrar sesión para que nadie use mi cuenta en este equipo.
- HU-5. Como jugador, quiero que nadie pueda actuar a mi nombre enviando mi identificador
  ni desde otro sitio web.
- HU-6. Como equipo evaluado, queremos que cada pieza de la autenticación tenga una prueba
  que demuestre el ataque que mitiga.

## Definiciones
- **Credencial de sesión**: JWT firmado con el secreto del servidor que identifica al
  usuario. Viaja solo en una cookie HttpOnly; el código de la página no puede leerla.
- **Comprobante anti-CSRF**: valor aleatorio generado en cada inicio de sesión, incluido
  dentro de la credencial y entregado aparte al cliente para que lo guarde en
  localStorage y lo reenvíe en cada petición.
- **Operación protegida**: la que exige una sesión válida, es decir, credencial válida y
  no expirada más un comprobante anti-CSRF que coincide con el de la credencial.
- **Datos públicos del usuario**: identificador, nombre de usuario, nombre visible, color de
  avatar, biografía, zona horaria y fecha de creación. El correo no es público.

## Requisitos funcionales
- RF-1: CUANDO alguien se registra con correo, nombre de usuario, contraseña y, de forma
  opcional, nombre visible, todos válidos, EL SISTEMA crea el usuario y responde 201 con
  sus datos públicos y su correo, sin la contraseña ni su hash.
- RF-2: EL SISTEMA guarda la contraseña solo como hash bcrypt con sal y costo 10.
- RF-3: SI el correo o el nombre de usuario ya están registrados, ENTONCES EL SISTEMA
  responde 400 con un mensaje que nombra el campo repetido y no crea nada.
- RF-4: SI la contraseña tiene menos de 8 caracteres, ENTONCES EL SISTEMA responde 400 y no
  crea nada.
- RF-5: SI falta un campo obligatorio, el correo no tiene formato válido o el nombre de
  usuario no tiene entre 3 y 24 caracteres formados solo por letras, dígitos, punto, guion
  o guion bajo, ENTONCES EL SISTEMA responde 400 con un mensaje específico y no crea nada.
- RF-6: CUANDO el nombre visible llega vacío o ausente, EL SISTEMA usa el nombre de usuario;
  SI supera 40 caracteres, ENTONCES EL SISTEMA responde 400.
- RF-7: EL SISTEMA guarda el correo sin espacios en los extremos y en minúsculas, y lo
  compara sin distinguir mayúsculas al registrar y al iniciar sesión.
- RF-8: CUANDO alguien inicia sesión con un correo y una contraseña correctos, EL SISTEMA
  responde 200 con el usuario (sin hash ni credencial en el cuerpo), entrega la credencial
  de sesión en una cookie HttpOnly con SameSite=Strict y entrega el comprobante anti-CSRF
  en la respuesta, de forma legible para el cliente.
- RF-9: SI el correo no está registrado o la contraseña es incorrecta, ENTONCES EL SISTEMA
  responde 401 con el mismo mensaje en ambos casos: "Correo o contraseña incorrectos.".
- RF-10: SI una petición a una operación protegida llega sin credencial, ENTONCES EL SISTEMA
  responde 401 con "sesión no iniciada".
- RF-11: SI la credencial está alterada, firmada con otro secreto o el comprobante anti-CSRF
  falta o no coincide, ENTONCES EL SISTEMA responde 401 con "token inválido".
- RF-12: SI la credencial expiró, ENTONCES EL SISTEMA responde 401 con "sesión expirada".
- RF-13: CUANDO un usuario con sesión válida consulta la sesión actual, EL SISTEMA responde
  200 con ese usuario, incluido su correo.
- RF-14: CUANDO alguien cierra sesión, EL SISTEMA elimina la cookie de la credencial y
  responde 200 con un mensaje, haya o no una sesión iniciada.
- RF-15: EL SISTEMA identifica al usuario de toda operación protegida a partir de la
  credencial de sesión y nunca a partir de un identificador enviado por el cliente.
- RF-16: EL SISTEMA ignora en el registro cualquier campo distinto de correo, nombre de
  usuario, contraseña y nombre visible.
- RF-17: EL SISTEMA trata el secreto de firma como variable obligatoria (spec 001, RF-2) y
  lo incluye sin valor en el archivo de ejemplo de variables.

## Requisitos no funcionales
- RNF-1: La credencial de sesión expira una hora después del inicio de sesión.
- RNF-2: En producción la cookie se marca como Secure.
- RNF-3: La credencial contiene solo el identificador, el nombre de usuario y el
  comprobante anti-CSRF; nunca el correo ni otros datos privados.
- RNF-4: Ninguna respuesta incluye el hash de la contraseña (constitución, principio 5).
- RNF-5: Cada pieza del servidor de la tabla "Qué mitiga cada pieza" (sección 5.6 de la
  referencia) tiene al menos una prueba automática: firma de la credencial (credencial
  alterada → 401), cookie HttpOnly y SameSite=Strict, comprobante anti-CSRF (petición sin
  él → 401), expiración (credencial expirada → 401), hash con sal (hash distinto de la
  contraseña), mensaje único ante credenciales incorrectas, ausencia del hash en las
  respuestas e identidad tomada de la credencial.

## Casos límite
- Iniciar sesión con el correo en mayúsculas o con espacios en los extremos funciona (RF-7).
- Iniciar sesión sin correo o sin contraseña en el cuerpo: 400.
- Cerrar sesión sin sesión iniciada: 200 (RF-14).
- Tras cerrar sesión, consultar la sesión actual desde el mismo navegador responde 401
  porque la cookie ya no está. Una credencial copiada antes del cierre sigue siendo válida
  hasta que expira (limitación reconocida; ver fuera de alcance).
- Un registro que incluye identificador, hash o fecha de creación los ignora (RF-16).
- El registro no inicia sesión por sí solo; la interfaz encadena registro e inicio de
  sesión (spec 007).

## Fuera de alcance
- Invalidar credenciales en el servidor, renovarlas o revocar sesiones.
- Recuperación de contraseña, verificación de correo y límite de intentos de inicio.
- Consultar, editar o eliminar usuarios (spec 003).
- Cambios en la interfaz (spec 007).

## Criterios de finalización
- [ ] Cada RF tiene al menos una prueba automática en verde.
- [ ] Cada pieza listada en RNF-5 tiene identificada la prueba que la demuestra.
- [ ] Una prueba confirma que la credencial verifica con el secreto del servidor y que su
      comprobante coincide con el entregado al cliente.
- [ ] Comprobación de tipos y pruebas del servidor en verde.

## Dudas abiertas
- Ninguna.
