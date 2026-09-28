# Cómo hacer los cambios más comunes

Cada receta dice qué archivo tocar y qué escribir. Después de cualquier cambio en el
catálogo, revisar con:

```
npm run validar
```

---

## Cambiar el precio de un producto

En `src/datos/productos.json`, buscar el producto por su nombre y cambiar `precio`.

```json
"precio": 62900
```

**El precio va sin signo de pesos, sin puntos y sin comillas.** `62900`, no `"$62.900"`.
Si se escribe mal, el sitio no se publica.

---

## Poner un producto en oferta

Se agrega `precio_antes` con el precio de antes y `descuento` con el porcentaje:

```json
"precio": 32600,
"precio_antes": 44010,
"descuento": 26
```

`precio_antes` tiene que ser **mayor** que `precio`, y `descuento` tiene que cuadrar con
los dos: se calcula como `(precio_antes − precio) ÷ precio_antes × 100`, redondeado. Si no
cuadra, el validador no deja publicar y dice el número correcto. El ahorro en pesos lo
calcula la página sola.

Para quitar la oferta, poner los dos en `null`:

```json
"precio_antes": null,
"descuento": null
```

---

## Marcar un producto como promoción relámpago

En `src/datos/productos.json`, buscar el producto por su nombre y agregar:

```json
"promo_flash": true
```

Solo se usa para la ventana grande que aparece al abrir la página. Vale únicamente
en productos disponibles y que no requieran fórmula médica. Para apagarla, ponerlo
en `false` o quitar la línea; si ningún producto tiene la marca, la ventana no sale.

---

## Agregar un producto nuevo

Copiar un producto parecido del archivo y cambiarle los datos. Los campos obligatorios son
`slug`, `titulo`, `precio`, `categoria` e `imagenes`.

```json
{
 "slug": "nombre-del-producto-en-minusculas-con-guiones",
 "titulo": "NOMBRE DEL PRODUCTO",
 "precio": 15000,
 "precio_antes": null,
 "descuento": null,
 "categoria": "medicamentos",
 "subcategoria": null,
 "marca": null,
 "presentacion": "500 mg · 20 Tabletas",
 "rx": null,
 "stock": true,
 "destacado": false,
 "imagenes": ["nombre-de-la-foto.webp"],
 "descripcion": "",
 "origen": { "rx": "pendiente" }
}
```

El `slug` es la dirección del producto en internet: tiene que ser **único**, en minúsculas,
sin tildes y con guiones en vez de espacios.

**La foto hay que prepararla antes.** Una foto de celular pesa varios megas y haría lenta
la página en datos móviles; el sitio no se publica si está sin preparar. Se hace así:

```
node tools/preparar-fotos.mjs --producto "C:\ruta\a\la\foto.jpg" nombre-del-producto
```

Deja un archivo `nombre-del-producto.webp` en `public/img/`, cuadrado y de unos 15 KB, y
te dice cómo se escribe en el campo `imagenes`. El producto sale entero, sin recortar.

**Si llegan muchas de un proveedor**, todas de una vez:

```
node tools/preparar-fotos.mjs --producto --lote "C:\ruta\a\la\carpeta"
```

Cada archivo conserva su nombre: `crema-manos.jpg` queda como `crema-manos.webp`.

---

## Actualizar el catálogo con el Excel del dueño

El dueño edita `Catalogo-Drogueria-Xivica.xlsx` (las celdas amarillas, y también la
naranja de "¿Requiere fórmula?": la llena él mismo) y devuelve el archivo. El flujo
siempre es:

```
node tools/python.mjs tools/excel_catalogo.py revisar Catalogo-Drogueria-Xivica.xlsx
```

Si dice problemas, se le responden uno por uno **con el nombre del producto, qué
pasa y cómo se escribe bien**; nada se aplica hasta corregirlo. Cuando sale en
limpio:

```
node tools/python.mjs tools/excel_catalogo.py aplicar Catalogo-Drogueria-Xivica.xlsx
```

Eso escribe `src/datos/productos.json` y regenera la planilla. Cuatro reglas que no
se negocian: no se agregan ni borran filas por Excel, la columna de fórmula la
llena solo el dueño (nunca el asistente, ni porque lo pida en la conversación), el
descuento siempre sale de los dos precios, y las fotos no van en el Excel. Para un producto nuevo, el dueño manda los datos y las fotos
y lo creo yo; para quitar uno, me avisa y lo quito yo (el historial lo guarda
todo, así que nada se pierde para siempre).

---

## Destacar un producto en la portada

Poner `"destacado": true`. Aparecerá primero en la portada.

Los productos con `"rx": true` **no** salen destacados aunque se marquen: ver
`REGLAS-DEL-CATALOGO.md`.

---

## Marcar que un producto agotó

```json
"stock": false
```

---

## Cambiar el WhatsApp

En `src/datos/config.json`, dos campos:

```json
"whatsapp": "573013665076",
"whatsapp_visible": "301 366 5076"
```

El primero es el número con el código de país y sin espacios; es el que abre WhatsApp. El
segundo es el que se ve escrito. **Hay que cambiar los dos.**

---

## Agregar la tercera sede

En `src/datos/config.json`, dentro de `sedes`, agregar:

```json
{
  "id": "nombre-corto-sin-espacios",
  "nombre": "Nombre de la sede",
  "direccion": "Cra 00 #00-00",
  "telefono": "6011234567",
  "telefono_visible": "601 123 4567",
  "lat": 4.77,
  "lng": -74.04,
  "horario": "Lunes a sábado, 7:00 a 21:00"
}
```

`lat` y `lng` se sacan de Google Maps: clic derecho sobre el punto y copiar las
coordenadas. Aparece sola en el pie, en la página de sedes y en el mapa.

---

## Poner el horario de una sede

En `src/datos/config.json`, cambiar `"horario": "PENDIENTE"` por el horario real. Mientras
diga PENDIENTE, se muestra resaltado en amarillo en el sitio.

---

## Cambiar el mínimo para envío gratis

En `src/datos/config.json`:

```json
"envio": { "gratis_desde": 60000, ... }
```

Cambia solo en la franja de arriba, en el carrito y en la página de servicios.

---

## Cambiar los banners de la portada

En `src/datos/home.json`, dentro de `banners`. Cada uno tiene etiqueta, título, texto,
botón y a dónde lleva.

El título funciona mejor con menos de 60 caracteres; más largo se ve apretado en celular.

---

## Que el buscador encuentre algo que la gente escribe

Si alguien busca "pañales" y no encuentra nada porque los productos se llaman "WINNY", se
agrega en `src/datos/sinonimos.json`:

```json
"panales": ["winny", "pañal", "bebe"]
```

A la izquierda lo que escribe la gente, a la derecha lo que hay en los nombres de los
productos.

---

## Cambiar un color de todo el sitio

En `src/styles/global.css`, en el bloque de arriba. **Antes de cambiar un color, leer la
regla de contraste en `MARCA.md`**: el azul, el amarillo y el verde lima oficiales no
sirven como letra pequeña. Los colores vienen del Manual de Marca v2.0 y no se cambian sin
que lo pida el dueño.

---

## Si el validador dice que algo está mal

No se publica nada hasta corregirlo, y el sitio sigue como estaba. **Leer el aviso:** dice
qué producto, qué pasa y cómo se escribe bien. Los más comunes:

| El aviso dice | Se arregla así |
|---|---|
| "error de escritura en la línea N" | Ir a esa línea: casi siempre sobra o falta una coma, o falta cerrar una comilla |
| "el precio debe ser un número entero" | `62900`, sin `$`, sin puntos y sin comillas |
| "el descuento debe ser N" | Poner exactamente ese número |
| "'rx' debe ser true, false o null" | Quitar las comillas. **Y no cambiar el valor: lo define el dueño, desde el Excel** |
| "la categoría no existe. ¿Querías decir…?" | Usar la que sugiere |
| "la imagen no existe en la carpeta" | Subir la foto a `public/img/` con ese nombre exacto |

---

## Agregar o cambiar la foto de una sede, de la portada o de Nosotros

Una foto de celular pesa medio mega y mide más de 1.500 px. **Nunca se copia tal cual a
`public/img/`**: haría lenta la página en un teléfono con datos. Se prepara primero.

**1. Prepararla** (recorta, reduce, guarda en WebP y borra los datos ocultos de la foto):

```
node tools/preparar-fotos.mjs RUTA/DE/LA/FOTO.jpg fotos/nombre-de-la-foto --relacion 4:3
```

Funciona igual en Windows y en Linux/macOS: usa Node, que ya está instalado para
poder ver la vista previa del sitio. No hace falta instalar nada aparte.

| Dónde va | `--relacion` |
|---|---|
| Tarjeta de una sede (página Sedes) | `4:3` |
| Foto grande de Nosotros | `3:2` |
| Fotos del interior (galería de Nosotros) | `16:9` |
| Círculo de la portada | `--recorte x0,y0,x1,y1` (caja en píxeles, cuadrada) |

Si en el recorte se corta algo importante, `--centro 0.5,0` conserva la parte de arriba
(`0.5,0.5` es el centro; el segundo número sube o baja el recorte).

**2. Ponerla**, con su descripción. **La descripción (`foto_alt`) es obligatoria**: es lo que
lee en voz alta un lector de pantalla, y sin ella el sitio no se publica.

- **Sede** → en `src/datos/config.json`, dentro de la sede:
  ```json
  "foto": "fotos/nombre-de-la-foto",
  "foto_alt": "Fachada de la sede Tejares del Norte, con el aviso azul sobre la puerta"
  ```
- **Portada** → en `src/datos/home.json`, dentro de `banners[0]` (o cualquier banner).
- **Nosotros** → en `src/datos/nosotros.json`: `foto_principal` es la grande y `galeria` es
  la lista de fotos del interior.

**3. Revisar**: `npm run validar`. Avisa si la
foto no existe o si falta la descripción.

**Antes de usar una foto, tres preguntas:**
- **¿Sale una persona reconocible?** Hace falta su autorización por escrito (Ley 1581 de
  2012: una imagen es un dato personal). Preguntar al dueño, no suponer.
- **¿Se ve un letrero de otra marca con una promesa de salud?** (por ejemplo "les pone fin a
  los síntomas de…"). Recortar para que no domine la imagen: el manual de marca pide no hacer
  promesas de salud.
- **¿La foto es de esa sede?** Si no se sabe, preguntar. Una fachada equivocada en una sede
  confunde a quien viene a buscarla.

**Sin filtros ni retoques** (el manual de marca, cap. 34): solo recorte.
