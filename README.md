# TeamMatchUp

Plataforma web que empareja jugadores de **League of Legends**, **Rainbow Six Siege**
y **Counter-Strike 2** cruzando dos condiciones que hoy nadie resuelve junta: que
tengan un **nivel competitivo similar** y que estén **disponibles en los mismos
bloques horarios**.

## Estado del repositorio

| Carpeta | Contenido | Estado |
| --- | --- | --- |
| `frontend/` | Aplicación React + TypeScript (Vite) | Implementada |
| `backend/` | Servidor Express | Pendiente |

El frontend funciona de extremo a extremo contra un backend simulado en el
navegador, y está preparado para consumir el servidor Express en cuanto exista:
todo el acceso a datos pasa por un contrato único y se cambia de implementación
con una variable de entorno.

## Cómo levantarlo

```bash
cd frontend
npm install
npm run dev
```

Luego entra a http://localhost:5173 con la cuenta de demostración
`demo@teammatchup.gg` / `demo1234`.

### Verificar la cuenta de CS2 con Steam (opcional)

Con el servidor (`backend/`), un jugador de CS2 puede verificar su cuenta iniciando sesión en
Steam. Es opcional: sin la clave de Steam el botón «Verificar con Steam» no aparece y todo lo
demás funciona igual. En `backend/.env` (nunca se sube al repositorio) se definen dos variables,
que `backend/.env.example` trae comentadas y sin valores:

- `STEAM_API_KEY`: la clave de la API web de Steam de la instancia.
- `PUBLIC_URL`: la dirección con que el navegador abre la instancia, sin ruta ni barra final
  (en desarrollo, la de Vite, `http://localhost:5173`; en el servidor del curso, su dirección
  `https`). Steam devuelve al usuario a esa dirección.

Los detalles de arquitectura, las vistas implementadas y el contrato de endpoints
que deberá cumplir Express están documentados en [`frontend/README.md`](frontend/README.md).

## Equipo

Constanza Torres · Daniel Ayala · Sebastián Valenzuela · Benjamín Estupiñán ·
Marcelo Zamorano · Vicente Oliva
