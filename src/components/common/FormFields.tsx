import type { ComponentProps, ReactNode } from 'react';
import type { Control } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface FieldProps {
  // Forms have different value types, and react-hook-form's Control is invariant in them.
  control: unknown;
  name: string;
  label: string;
  description?: ReactNode;
}

export function TextField({ control, name, label, description, ...input }: FieldProps & Omit<ComponentProps<typeof Input>, 'name'>) {
  return (
    <FormField
      control={control as Control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...input} {...field} value={field.value ?? ''} /></FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextAreaField({ control, name, label, description, ...input }: FieldProps & Omit<ComponentProps<typeof Textarea>, 'name'>) {
  return (
    <FormField
      control={control as Control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Textarea {...input} {...field} value={field.value ?? ''} /></FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SelectField({ control, name, label, description, placeholder, options }: FieldProps & { placeholder: string; options: { id: string; name: string }[] }) {
  return (
    <FormField
      control={control as Control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value ?? ''} onValueChange={field.onChange}>
            <FormControl><SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger></FormControl>
            <SelectContent>{options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
