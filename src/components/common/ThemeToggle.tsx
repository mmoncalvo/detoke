import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const Icon = isDark ? Sun : Moon;
  return (
    <Button variant="ghost" size="icon" aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      <Icon className="size-5" />
    </Button>
  );
}
