# Droguería Xivica

Sitio de comercio de Droguería Xivica: 407 productos con precio actualizado,
catálogo filtrable y pedido que se cierra por WhatsApp.

## Empezar

```bash
npm install
npm run dev      # http://localhost:4321
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el sitio en tu computador, con recarga automática |
| `npm run build` | Compila el sitio en `dist/` |
| `npm run preview` | Sirve lo compilado, como se verá publicado |
| `npm test` | Corre las pruebas de JavaScript y de Python |

## Antes de subir un cambio al catálogo

```bash
npm run validar
```

Si algo está mal, dice exactamente qué producto y por qué. La misma revisión
corre sola en GitHub: si falla, el sitio no se publica y sigue funcionando la
versión anterior.

## Dónde está cada cosa

| Qué quieres cambiar | Archivo |
|---|---|
| Precios, productos, ofertas | `src/datos/productos.json` |
| WhatsApp, sedes, horarios | `src/datos/config.json` |
| Textos y banners de la portada | `src/datos/home.json` |
| Servicios | `src/datos/servicios.json` |
| Textos legales | `src/datos/legal.json` |
| Colores y tipografía | `src/styles/global.css` |
| Palabras que la gente busca | `src/datos/sinonimos.json` |

**Ningún texto se escribe dentro del código.** Todo el contenido editable vive
en `src/datos/`.

## Documentación

- `conocimiento_generado/REGLAS-DEL-CATALOGO.md` — por qué el sitio muestra lo
  que muestra, escrito para leerlo con el dueño del negocio.
- `PENDIENTES.md` — lo que falta para publicar en el dominio definitivo.
- `docs/` — la especificación y el plan con que se construyó.

## Herramientas

Las de `tools/` se ejecutan **en tu computador**, no en el servidor. El sitio
publicado no necesita Python para nada.
