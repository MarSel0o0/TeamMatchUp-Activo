# Constitución de TeamMatchUp

1. **Stack cerrado.** Frontend: React 18 + TypeScript + Vite. Backend: Express 5 + Mongoose + TypeScript. Tests: node:test.
   Una dependencia nueva solo entra si una spec aprobada la justifica, y con versión exacta.
2. **La spec manda.** No se escribe código sin un RF de una spec aprobada.
   Un cambio de requisitos sigue el orden spec → plan → tasks → código, y cada tarea cita sus RF.
3. **Lógica separada de la interfaz.** Las reglas viven en domain/ como funciones puras, sin React, HTTP ni reloj ("hoy" llega como parámetro).
   Los componentes acceden a los datos solo a través de ApiContract y nunca llaman a fetch.
4. **Tests primero en el backend.** Toda función de dominio y todo endpoint del backend tiene un test con node:test, escrito antes que el código (rojo → verde).
   Ninguna tarea se cierra con tests, typecheck o lint en rojo, ni con un .only en el código. En el frontend bastan build, typecheck y lint en verde, hasta que una spec diga otra cosa.
5. **Los datos del usuario son suyos.** Toda escritura usa el usuario de la sesión, nunca un id enviado por el cliente.
   Contraseñas con bcrypt, JWT solo en cookie HttpOnly, ninguna respuesta con el hash ni el correo de otro, secretos solo en .env, nada de datos reales inventados. Los datos que la plataforma simula (rango, historial, partidas y marca de verificada) no cuentan como datos reales inventados siempre que vayan marcados y se muestren etiquetados como simulados y nunca se atribuyan a una fuente real, aunque estén asociados a un identificador de juego real.

6. **Idioma.** Identificadores y nombres de archivo en inglés; comentarios, documentación, specs y mensajes de error en español.
   La interfaz está en español por defecto y puede tener una versión en inglés, que se incorpora mediante su propia spec.
