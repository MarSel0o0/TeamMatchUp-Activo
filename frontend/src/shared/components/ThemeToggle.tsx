import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { MouseEvent } from 'react';
import { useTheme } from '@/app/providers/useTheme';
import { Icon } from './Icon';
import './themeToggle.css';

/**
 * Cambia entre tema oscuro y claro. Muestra el tema al que se va a pasar, y el
 * icono gira al cambiar; la página entera se abre en círculo desde el botón.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const toLight = theme === 'dark';
  const label = toLight ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <button type="button" className="theme-toggle" onClick={handleClick} aria-label={label} title={label}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="theme-toggle__icon"
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        >
          <Icon as={toLight ? Sun : Moon} size={17} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
