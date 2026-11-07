import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const Icon = resolvedTheme === 'dark' ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema"><Icon className="size-5" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}><Sun /> Claro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}><Moon /> Oscuro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}><Monitor /> Sistema</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
