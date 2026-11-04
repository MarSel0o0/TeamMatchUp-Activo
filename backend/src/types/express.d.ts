// Declaration merging de Express (plan D12, RT-16): `withUser` deja aquí el identificador
// del usuario sacado de la credencial (RF-15). Ausente fuera de las rutas protegidas.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
