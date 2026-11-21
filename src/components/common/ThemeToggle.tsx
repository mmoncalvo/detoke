import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme, type Theme } from '@/context/ThemeContext';

/** `onChange` runs after the switch (Mi cuenta uses it to save the choice in the account). */
export function ThemeToggle({ className, onChange }: { className?: string; onChange?: (theme: Theme) => void }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  const Icon = isDark ? Sun : Moon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label={label} onClick={() => {
          const next = isDark ? 'light' : 'dark';
          setTheme(next);
          onChange?.(next);
        }}>
          <Icon className="size-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
