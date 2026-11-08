import { Loader2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AutocompleteProps<T> {
  id: string;
  value: string;
  onInputChange: (text: string) => void;
  /** Called after the user stops typing; errors leave the list empty. */
  search: (text: string) => Promise<T[]>;
  onSelect: (option: T) => void;
  getKey: (option: T) => string;
  renderOption: (option: T) => ReactNode;
  placeholder?: string;
  minChars?: number;
  emptyText?: string;
  className?: string;
  invalid?: boolean;
}

const DEBOUNCE_MS = 300;

/** Text field with suggestions: keyboard navigation, loading and empty states, ARIA combobox. */
export function Autocomplete<T>({ id, value, onInputChange, search, onSelect, getKey, renderOption, placeholder, minChars = 2, emptyText = 'Sin resultados', className, invalid }: AutocompleteProps<T>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
    if (query === null) return;
    const text = query.trim();
    if (text.length < minChars) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ticket = ++request.current;
    const timer = setTimeout(() => {
      search(text)
        .then((found) => ticket === request.current && (setOptions(found), setActive(found.length ? 0 : -1)))
        .catch(() => ticket === request.current && setOptions([]))
        .finally(() => ticket === request.current && setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, minChars, search]);

  const choose = (option: T) => {
    onSelect(option);
    setOpen(false);
    setQuery(null);
    setOptions([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp' && options.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      // Enter picks a suggestion; it never submits the surrounding form half-typed.
      e.preventDefault();
      if (open && active >= 0 && options[active]) choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && query !== null && query.trim().length >= minChars;

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid}
        noAutofill
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onInputChange(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query !== null && setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
      {showList && (
        <ul id={listId} role="listbox" className="absolute z-[1100] mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
          {loading && options.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>}
          {!loading && options.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>}
          {options.map((option, index) => (
            <li
              key={getKey(option)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // mousedown keeps the focus in the field, so the blur does not close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn('cursor-pointer rounded-md px-3 py-2 text-sm', index === active && 'bg-accent text-accent-foreground')}
            >
              {renderOption(option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
