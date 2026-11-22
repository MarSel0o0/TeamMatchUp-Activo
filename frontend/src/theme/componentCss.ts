/**
 * CSS de los componentes migrados a la librería (spec 017, plan 3.1): sin capa, así que gana siempre a
 * `@layer mantine`, y solo con tokens de `styles/tokens.css`. Se importa después de `styles/global.css`
 * (`main.tsx`). Cada tarea de migración añade aquí el suyo; `themeColors.test.ts` revisa que ninguno tenga
 * colores literales.
 */
import './components/focus.css';
import './components/button.css';
import './components/icon-button.css';
import './components/loader.css';
import './components/notice.css';
import './components/badge.css';
import './components/skeleton.css';
import './components/field.css';
import './components/switch.css';
import './components/slider.css';
import './components/chip.css';
import './components/tabs.css';
import './components/modal.css';
