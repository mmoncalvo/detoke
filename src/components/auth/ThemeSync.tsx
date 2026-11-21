import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

// Which account theme this browser already applied ("userId:theme"), so a reload does not undo a later
// switch from the navbar, which only lasts in this browser.
const APPLIED_KEY = 'detoke.accountTheme';

function read() {
  try {
    return localStorage.getItem(APPLIED_KEY);
  } catch {
    return null;
  }
}

function write(value: string | null) {
  try {
    if (value) localStorage.setItem(APPLIED_KEY, value);
    else localStorage.removeItem(APPLIED_KEY);
  } catch {
    /* storage not available */
  }
}

/**
 * The theme saved in Mi cuenta is applied when the user signs in, on any device, and again when it
 * changes in the account. Not while an admin impersonates: the admin's browser keeps its own theme.
 */
export function ThemeSync() {
  const { user, impersonatedBy } = useAuth();
  const { setTheme } = useTheme();
  const hadUser = useRef(false);

  useEffect(() => {
    if (!user) {
      // Signed out: the next sign-in applies the account theme again.
      if (hadUser.current) write(null);
      hadUser.current = false;
      return;
    }
    hadUser.current = true;
    if (impersonatedBy || !user.theme) return;
    const applied = `${user.id}:${user.theme}`;
    if (read() === applied) return;
    write(applied);
    setTheme(user.theme);
  }, [user, impersonatedBy, setTheme]);

  return null;
}
