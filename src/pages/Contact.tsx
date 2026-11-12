import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Clock, Loader2, Mail, MessageCircle, Store } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { z } from 'zod';
import { CONTACT_REASONS, CONTACT_REASON_LABELS, REASONS_WITH_BUSINESS, type ContactInfo, type ContactReason } from '@shared/contact';
import { contactSchema } from '@shared/schemas';
import { api } from '@/api';
import { SelectField, TextAreaField, TextField } from '@/components/common/FormFields';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { whatsappUrl } from '@/lib/format';
import { whatsappLinkProps } from '@/lib/whatsapp';

type Input = z.input<typeof contactSchema>;
type Output = z.output<typeof contactSchema>;

const REASONS = CONTACT_REASONS.map((id) => ({ id, name: CONTACT_REASON_LABELS[id] }));

const FAQS = [
  { question: '¿Cómo funciona el pedido por WhatsApp?', answer: 'Sumás productos de un negocio, elegís entrega y forma de pago, y Detoke arma tu pedido con un link. Se abre WhatsApp y se lo enviás directo al comercio, que lo confirma y coordina con vos; el estado lo seguís en vivo desde ese link.' },
  { question: '¿Cuánto cuesta usar Detoke?', answer: 'Publicar tu negocio es gratis y no cobramos comisión por los pedidos. Los pagos se arreglan directamente entre el cliente y el comercio.' },
  { question: '¿Cómo edito los datos de mi negocio?', answer: 'Entrá a tu panel y abrí Mi negocio. Ahí podés cambiar el nombre, el rubro, la descripción, el logo, la portada, el contacto y la ubicación en el mapa.' },
  { question: '¿Cómo cambio mis horarios?', answer: 'En tu panel, en Horarios, elegís qué días abrís y en qué franjas. Si cortás al mediodía usá Horario cortado. Los clientes ven al instante si estás abierto.' },
  { question: 'Tuve un problema con un pedido, ¿qué hago?', answer: 'Cada comercio gestiona sus pedidos, así que lo más rápido es escribirle por WhatsApp desde su página. Si no te responde, contanos acá y lo revisamos.' },
];

function Channels({ info }: { info: ContactInfo }) {
  const rows = [
    info.email && { icon: Mail, label: info.email, href: `mailto:${info.email}` },
    info.whatsapp && { icon: MessageCircle, label: 'Escribinos por WhatsApp', href: whatsappUrl(info.whatsapp) },
    info.hours && { icon: Clock, label: info.hours },
  ].filter((row) => !!row);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Otros canales</h2>
      <ul className="mt-3 space-y-2.5 text-sm">
        {rows.map(({ icon: Icon, label, href }) => (
          <li key={label} className="flex items-center gap-2.5">
            <Icon className="size-4 shrink-0 text-primary" />
            {href ? <a href={href} {...(href.startsWith('mailto:') ? {} : whatsappLinkProps())} className="min-w-0 break-words hover:underline">{label}</a> : <span>{label}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Contact() {
  useTitle('Contacto');
  const { user, business } = useAuth();
  const info = useFetch<ContactInfo>('/contact/info');
  const [sent, setSent] = useState(false);

  const blank = (): Input => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: '',
    reason: undefined as unknown as ContactReason,
    businessName: business?.name ?? '',
    message: '',
    consent: false,
    company: '',
  });
  const form = useForm<Input, unknown, Output>({ resolver: zodResolver(contactSchema), defaultValues: blank() });
  const reason = form.watch('reason');
  const length = form.watch('message')?.length ?? 0;
  const asksBusiness = REASONS_WITH_BUSINESS.includes(reason);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api('/contact', { method: 'POST', body: { ...values, businessName: asksBusiness ? values.businessName : null } });
      setSent(true);
    } catch (err) {
      toast.error((err as Error).message);
    }
  });

  const again = () => {
    form.reset(blank());
    setSent(false);
  };

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold sm:text-5xl">Hablemos</h1>
      <p className="mt-2 max-w-xl text-lg text-muted-foreground sm:text-nowrap">¿Tenés una duda, una idea o algo no funcionó como esperabas? Escribinos.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 rounded-2xl border bg-card p-5 sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center py-14 text-center" role="status">
              <CheckCircle2 className="size-12 text-success" />
              <h2 className="mt-4 text-2xl font-bold">¡Recibimos tu mensaje!</h2>
              <p className="mt-1 max-w-sm text-muted-foreground">Gracias por escribirnos. Te vamos a responder a {form.getValues('email')}.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button onClick={again}>Enviar otro mensaje</Button>
                <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField control={form.control} name="name" label="Tu nombre" autoComplete="name" />
                  <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
                  <TextField control={form.control} name="phone" label="Teléfono o WhatsApp (opcional)" type="tel" autoComplete="tel" />
                  <SelectField control={form.control} name="reason" label="Motivo" placeholder="Elegí un motivo" options={REASONS} />
                </div>
                {asksBusiness && <TextField control={form.control} name="businessName" label="Nombre del negocio (opcional)" />}
                <TextAreaField
                  control={form.control}
                  name="message"
                  label="Mensaje"
                  rows={6}
                  maxLength={2000}
                  placeholder="Contanos en qué te podemos ayudar."
                  className='min-h-60'
                  description={<span className="block text-right tabular-nums">{length} / 2000</span>}
                />
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start gap-2.5">
                        <FormControl><Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" /></FormControl>
                        <FormLabel className="font-normal leading-snug">Acepto que Detoke me contacte para responder este mensaje.</FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="absolute -left-[9999px]" aria-hidden>
                  <label>No completar este campo<input tabIndex={-1} autoComplete="off" {...form.register('company')} /></label>
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="animate-spin" />} {form.formState.isSubmitting ? 'Enviando' : 'Enviar mensaje'}
                </Button>
              </form>
            </Form>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          {info.data && <Channels info={info.data} />}

          <section className="rounded-2xl bg-accent p-5 text-accent-foreground">
            <h2 className="flex gap-2 mt-2 text-lg font-semibold"><Store className="size-6" />¿Tenés un negocio? Sumalo gratis</h2>
            <p className="mt-1 text-sm">Publicá tu catálogo en minutos y recibí los pedidos en tu WhatsApp.</p>
            <Button asChild className="mt-3"><Link to="/register?type=business">Sumá tu negocio</Link></Button>
          </section>

          <section className="rounded-2xl border bg-card px-5 py-4">
            <h2 className="mb-1 text-lg font-semibold">Preguntas frecuentes</h2>
            <Accordion type="single" collapsible>
              {FAQS.map(({ question, answer }) => (
                <AccordionItem key={question} value={question}>
                  <AccordionTrigger>{question}</AccordionTrigger>
                  <AccordionContent>{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </aside>
      </div>
    </div>
  );
}
