# Con qué está hecho y dónde está cada cosa

## Tecnologías

| Qué | Versión | Para qué |
|---|---|---|
| Astro | 7 | Genera las 428 páginas HTML |
| Tailwind CSS | 4 | Sistema de estilos, usado solo para los tokens de color |
| sharp | 0.35 | Lee las medidas de cada foto al compilar (Foto.astro), y recorta y optimiza las que se agregan (tools/preparar-fotos.mjs) |
| Manrope e Inter | variables | Tipografías oficiales del manual, guardadas en `public/fonts/` |
| JavaScript | módulos ES | Buscador, carrito, filtros. Sin frameworks ni librerías |
| Leaflet | 1.9.4 | Mapa de las sedes. Se descarga solo al llegar a esa sección |
| Python | 3.12 | Solo `validar.py` (nada que instalar) y `excel_catalogo.py`, que necesita `pip install -r tools/requirements.txt` (openpyxl). **No corre en el servidor** |

No hay React, ni Vue, ni jQuery. El sitio publicado es HTML, CSS, JavaScript e imágenes.

## Estructura

```
src/
├── datos/          TODO el contenido editable. Un archivo por página
├── pages/          Una página del sitio por archivo
├── components/     Piezas que se repiten (tarjeta, cabecera, pie)
├── layouts/        El armazón común de todas las páginas
├── scripts/        El JavaScript que corre en el navegador
└── styles/         Colores, tipografía y estilos

public/             Lo que se copia tal cual: imágenes y tipografía
tools/              Herramientas locales. NO se suben al servidor
conocimiento_generado/  Esta documentación
```

## Si quieres cambiar X, el archivo es Y

| Quiero cambiar | Archivo |
|---|---|
| Un precio, un producto, una oferta | `src/datos/productos.json` |
| El WhatsApp, una sede, el mínimo de envío gratis | `src/datos/config.json` |
| Los banners y textos de la portada | `src/datos/home.json` |
| Las categorías del menú | `src/datos/categorias.json` |
| Los servicios | `src/datos/servicios.json` |
| Los textos legales | `src/datos/legal.json` |
| La página Nosotros | `src/datos/nosotros.json` |
| Lo que la gente busca y no encuentra | `src/datos/sinonimos.json` |
| Los colores o la tipografía | `src/styles/global.css` |
| Cómo se ve una tarjeta de producto | `src/components/TarjetaProducto.astro` **y** `src/scripts/tarjeta.js` |
| El logo | `public/img/isotipo-xivica.svg` y `src/components/Logo.astro` |
| Una foto de sede, portada o Nosotros | `public/img/fotos/` y el campo `foto` del JSON. Se dibuja con `src/components/Foto.astro` |
| El tagline "Cerca cuando la necesitas" | `src/datos/config.json` → `tagline` |
| Qué productos salen destacados | `src/scripts/destacados.js` |

## Comandos

```bash
npm run dev      # ver el sitio en tu computador
npm run build    # compilarlo
npm test         # correr las pruebas
npm run verificar # revisarlo todo: pruebas, catálogo y colores
npm run validar
```

## Las herramientas de tools/

Se ejecutan **en el computador de quien trabaja**, nunca en el servidor. El sitio
publicado no necesita Python.

| Herramienta | Qué hace |
|---|---|
| `verificar.mjs` | **El comando de todos los días.** Corre las pruebas, el catálogo y los colores de una vez |
| `python.mjs` | Encuentra el Python del equipo. **Todo lo de Python pasa por aquí**, porque el comando no se llama igual en Windows que en Linux |
| `validar.py` | Revisa que el catálogo esté bien antes de publicar |
| `excel_catalogo.py` | El puente con la planilla del dueño: `revisar` antes y `aplicar` solo si está limpia |
| `revisar-css.py` | Comprueba que no se use un color que no existe. **Correrla después de tocar estilos**: un `var(--color)` mal escrito no da error, simplemente deja de verse |
| `preparar-fotos.mjs` | **Se sigue usando.** Recorta y optimiza las fotos de sedes, portada y Nosotros. En Node, no en Python: funciona igual en Windows |

## Rendimiento medido

Lighthouse en móvil, sobre el sitio compilado:

| | Portada | Ficha | Catálogo |
|---|---|---|---|
| Rendimiento | 100 | 100 | 99 |
| Accesibilidad | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 |
| Buenas prácticas | 100 | 100 | 100 |

El HTML de la portada pesa 52 KB. El sitio anterior pesaba 227 KB antes de mostrar nada.
