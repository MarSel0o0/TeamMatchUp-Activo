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

### Verificar la cuenta de League of Legends con Riot Games (opcional)

Con el servidor (`backend/`), un jugador de League of Legends puede verificar su Riot ID
cambiando temporalmente su ícono de invocador en el cliente de LoL. Es opcional: sin la clave de
Riot el botón «Verificar con Riot Games» no aparece y todo lo demás (incluida la vinculación
manual) funciona igual. En `backend/.env` (nunca se sube al repositorio) se define una única
variable opcional, que `backend/.env.example` trae comentada y sin valor (no requiere
`PUBLIC_URL`):

- `RIOT_API_KEY`: la clave de desarrollo de la API de Riot Games (caduca cada 24 horas).

#### Renovación manual de `RIOT_API_KEY` cada 24 horas (local y servidor del curso)

La clave de desarrollo de Riot Games vence a las 24 horas; mientras está caducada las operaciones
que consultan a Riot responden `503` sin perder datos ni cuentas verificadas. Para renovarla:

1. Entra al [portal de desarrolladores de Riot Games](https://developer.riotgames.com/) y genera
   una clave de desarrollo nueva (`RGAPI-...`).
2. En el equipo local o en el servidor del curso, edita `backend/.env` (nunca lo subas al
   repositorio) y reemplaza el valor de `RIOT_API_KEY`:
   ```env
   RIOT_API_KEY=RGAPI-tu-nueva-clave
   ```
3. Reinicia el proceso del servidor backend (en desarrollo local, detén y vuelve a lanzar
   `npm run dev` dentro de `backend/`; en el servidor del curso, reinicia el servicio o proceso de
   Node configurado).
4. El servidor vuelve a operar con Riot Games sin otro cambio; los desafíos abiertos que aún no
   hayan cumplido 10 minutos siguen vigentes.

Los detalles de arquitectura, las vistas implementadas y el contrato de endpoints
que deberá cumplir Express están documentados en [`frontend/README.md`](frontend/README.md).

## Equipo

Constanza Torres · Daniel Ayala · Sebastián Valenzuela · Benjamín Estupiñán ·
Marcelo Zamorano · Vicente Oliva
