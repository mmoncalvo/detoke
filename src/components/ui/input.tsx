import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Attributes that keep the browser's own suggestions away from a field with its own (search boxes,
 * city and address pickers). Chrome ignores autocomplete="off" on fields it takes for an address, but
 * not an unknown token; password managers have their own opt-outs.
 */
export const NO_AUTOFILL = {
  autoComplete: 'detoke-off',
  autoCorrect: 'off',
  spellCheck: false,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
} as const

function Input({ className, type, noAutofill, ...props }: React.ComponentProps<'input'> & { noAutofill?: boolean }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-10 w-full min-w-0 rounded-md border bg-card px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        className,
      )}
      {...(noAutofill ? NO_AUTOFILL : {})}
      {...props}
    />
  )
}

export { Input }
