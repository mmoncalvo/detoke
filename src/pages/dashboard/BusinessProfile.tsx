import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { businessUpdateSchema } from '@shared/schemas';
import type { Business, BusinessCategory } from '@shared/types';
import { SelectField, TextAreaField, TextField } from '@/components/common/FormFields';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { LocationFields, toLocationValue, type LocationValue } from '@/components/dashboard/LocationFields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { useBusinessSaver } from '@/hooks/useBusinessSaver';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';


type Input = z.input<typeof businessUpdateSchema>;
type Output = z.output<typeof businessUpdateSchema>;

const FIELDS = ['name', 'businessCategoryId', 'tagline', 'description', 'whatsapp', 'phone', 'email', 'website', 'instagram', 'facebook'] as const;

const toForm = (business: Business): Input => Object.fromEntries(FIELDS.map((field) => [field, business[field] ?? ''])) as Input;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ProfileForm({ business }: { business: Business }) {
  const { save, uploadImage } = useBusinessSaver();
  const categories = useFetch<BusinessCategory[]>('/business-categories');
  const form = useForm<Input, unknown, Output>({ resolver: zodResolver(businessUpdateSchema), defaultValues: toForm(business) });
  const [location, setLocation] = useState<LocationValue>(() => toLocationValue(business));

  const onSubmit = form.handleSubmit(async (values) => {
    await save({ ...values, ...location });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5 pb-20" noValidate>
        <Section title="Identidad" description="Cómo te ven los clientes.">
          <TextField control={form.control} name="name" label="Nombre del negocio" />
          <SelectField control={form.control} name="businessCategoryId" label="Rubro" placeholder="Elegí tu rubro" options={categories.data ?? []} />
          <TextField control={form.control} name="tagline" label="Frase corta" maxLength={90} placeholder="Pizza a la piedra desde 1987" description="Se muestra en las tarjetas, debajo del nombre." />
          <TextAreaField control={form.control} name="description" label="Descripción" rows={4} maxLength={600} placeholder="Contá qué hacen, desde cuándo y qué los hace distintos." />
        </Section>

        <Section title="Imágenes">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <ImageUpload label="Logo" hint="Cuadrado." value={business.logo} className="size-32" onUpload={(file) => uploadImage('logo', file)} />
            <ImageUpload label="Foto de portada" hint="Horizontal, 16:9." value={business.coverImage} className="aspect-[16/9] w-full" onUpload={(file) => uploadImage('cover', file)} />
          </div>
        </Section>

        <Section title="Contacto">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="whatsapp" label="WhatsApp" type="tel" description="Acá llegan los pedidos." />
            <TextField control={form.control} name="phone" label="Teléfono" type="tel" />
            <TextField control={form.control} name="email" label="Email público" type="email" />
            <TextField control={form.control} name="website" label="Sitio web" placeholder="minegocio.com" />
            <TextField control={form.control} name="instagram" label="Instagram" placeholder="@minegocio" />
            <TextField control={form.control} name="facebook" label="Facebook" placeholder="facebook.com/minegocio" />
          </div>
        </Section>

        <Section title="Ubicación" description="Elegí la ciudad, buscá la dirección o marcá el punto en el mapa.">
          <LocationFields value={location} onChange={setLocation} />
        </Section>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} Guardar cambios</Button>
        </div>
      </form>
    </Form>
  );
}

export default function BusinessProfile() {
  useTitle('Mi negocio');
  const { business } = useAuth();
  return business ? <ProfileForm business={business} /> : null;
}
