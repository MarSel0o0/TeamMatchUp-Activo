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

Los detalles de arquitectura, las vistas implementadas y el contrato de endpoints
que deberá cumplir Express están documentados en [`frontend/README.md`](frontend/README.md).

## Equipo

Constanza Torres · Daniel Ayala · Sebastián Valenzuela · Benjamín Estupiñán ·
Marcelo Zamorano · Vicente Oliva
