/**
 * Clave del almacenamiento donde se guarda el tema elegido («light» o «dark»). Sin imports: la leen
 * `config/env.ts` (la aplicación) y `vite.config.ts` (el script que fija el tema antes de la primera
 * pintura), que no puede importar `env.ts` porque usa `import.meta.env`.
 */
export const THEME_STORAGE_KEY = 'tmu.theme';
