// Interfaz única del proveedor de rango y su única implementación, la simulada
// (spec 004, RF-34; plan, sección 1). Sin red, sin claves y sin variables de entorno.
import { simulateReading } from "../domain/rankSimulator.ts";
import type { ReadingInput, SimulatedReading } from "../domain/rankSimulator.ts";

export interface RankProvider {
  read(input: ReadingInput): SimulatedReading;
}

export const simulatedRankProvider: RankProvider = {
  read: (input) => simulateReading(input),
};
