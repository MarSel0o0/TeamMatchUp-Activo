/**
 * Hojas de estilo de la librería que usa la interfaz (spec 017, plan 3.1; RNF-7, RNF-8). Solo
 * importaciones con efecto: una por componente usado, en un único sitio. Cada archivo `*.layer.css`
 * va dentro de `@layer mantine`, así que el CSS del proyecto (sin capa) gana siempre, sin importar el
 * orden ni la especificidad. No se importan `baseline.css` (fija fondo, color y tipografía del cuerpo,
 * RF-4) ni `default-css-variables.css` (repite variables que ya inyecta el proveedor).
 * `themeColors.test.ts` lee este archivo: cada hoja importada se revisa en busca de colores literales.
 */
import '@mantine/core/styles/global.layer.css';
import '@mantine/core/styles/UnstyledButton.layer.css';
import '@mantine/core/styles/VisuallyHidden.layer.css';
import '@mantine/core/styles/Button.layer.css';
import '@mantine/core/styles/ActionIcon.layer.css';
import '@mantine/core/styles/CloseButton.layer.css';
import '@mantine/core/styles/Input.layer.css';
import '@mantine/core/styles/InlineInput.layer.css';
import '@mantine/core/styles/Switch.layer.css';
import '@mantine/core/styles/Slider.layer.css';
import '@mantine/core/styles/Tabs.layer.css';
import '@mantine/core/styles/Overlay.layer.css';
import '@mantine/core/styles/Paper.layer.css';
import '@mantine/core/styles/ModalBase.layer.css';
import '@mantine/core/styles/Modal.layer.css';
import '@mantine/core/styles/Badge.layer.css';
import '@mantine/core/styles/Loader.layer.css';
import '@mantine/core/styles/Skeleton.layer.css';
