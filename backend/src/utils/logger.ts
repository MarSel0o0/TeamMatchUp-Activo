// Registro del servidor. Único archivo del backend que usa `console` (RT-06).
// En el entorno de prueba no escribe nada (RNF-1).

type LogOutput = (...params: unknown[]) => void;

export interface LoggerOptions {
  isSilent: () => boolean;
  info: LogOutput;
  error: LogOutput;
}

export interface Logger {
  info: LogOutput;
  error: LogOutput;
}

export function createLogger({ isSilent, info, error }: LoggerOptions): Logger {
  return {
    info: (...params) => {
      if (!isSilent()) info(...params);
    },
    error: (...params) => {
      if (!isSilent()) error(...params);
    },
  };
}

// Se decide en cada mensaje para que valga el NODE_ENV que `loadConfig` deja en
// `process.env` (D11). Se llama a `console` en el momento para respetar sustituciones.
export const logger: Logger = createLogger({
  isSilent: () => process.env.NODE_ENV === "test",
  info: (...params) => console.log(...params),
  error: (...params) => console.error(...params),
});
