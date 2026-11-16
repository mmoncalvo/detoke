# Recursos de marca para redes

Mismo diseño que la web: verde del hero, toldo de rayas, "detoke!" con el "!" mostaza, títulos en Quicksand y texto en Figtree. Cada imagen está en PNG (para subir) y en SVG (fuente editable, con el texto en curvas y las fotos incluidas).

| Archivo | Tamaño | Dónde va |
| --- | --- | --- |
| `perfil/detoke-perfil-1080` | 1080 × 1080 | Foto de perfil de Facebook e Instagram (las dos la recortan en círculo) |
| `facebook/detoke-facebook-portada-1640x624` | 1640 × 624 | Portada de la página de Facebook. Lo importante queda en el centro, que es lo que se ve en el celular |
| `instagram/detoke-instagram-post-presentacion-1080x1350` | 1080 × 1350 | Primer post (4:5). En la grilla del perfil se ve bien el recorte 3:4 |
| `instagram/detoke-instagram-historia-como-funciona-1080x1920` | 1080 × 1920 | Historia "cómo funciona", para guardar en un destacado |
| `instagram/destacados/detoke-destacado-*` | 1080 × 1920 | Portadas de destacados: Cómo pedir, Comercios, Sumá tu negocio, Novedades, Zonas |
| `instagram/detoke-post-comercios-1080x1350` | 1080 × 1350 | Post para invitar a los comercios a sumarse (sirve también para Facebook). Texto sugerido en `textos-comercios.md` |
| `instagram/detoke-historia-comercios-1080x1920` | 1080 × 1920 | La misma invitación en formato historia |
| `logo/*` | | Logo en verde (fondo claro), en crema (fondo oscuro) e isotipo "d!" |

Para regenerarlas: `npm i --no-save playwright lucide-static` y `node scripts/marketing-social.cjs`. Las fotos salen de `data/images` (seed) y los íconos de Lucide.
