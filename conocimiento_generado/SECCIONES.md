# Inventario de secciones

Una entrada por cada sección editable del sitio: dónde vive, qué contiene, cuánto aguanta
y cómo se agrega un elemento.

---

## Franja superior (todas las páginas)

- **Cómo se llama para el cliente:** "la barra verde de arriba"
- **Dónde está:** `src/datos/config.json` → `envio` y `whatsapp_visible`
- **Qué muestra:** envío gratis desde, tiempo de entrega, el WhatsApp y el enlace
  "Aplica TyC" junto al domicilio gratis (`config.json` → `envio.tyc` y `tyc_enlace`)
- **Límite:** en celular se ocultan el tiempo de entrega y las sedes por falta de espacio.
  No agregar más textos aquí.

---

## Buscador (todas las páginas)

- **Cómo se llama:** "el buscador"
- **Dónde está:** el texto de ejemplo en `src/components/Header.astro`
- **Qué encuentra:** nombre, marca, categoría, tipo y presentación de los 407 productos
- **Muestra:** 6 resultados. Más no caben sin tapar la página.
- **Aguanta:** que se escriba sin tildes, en minúsculas y con una errata
- **Para que encuentre algo que no encuentra:** agregar la palabra en
  `src/datos/sinonimos.json`

---

## Barra de categorías (todas las páginas)

- **Cómo se llama:** "el menú azul"
- **Dónde está:** `src/datos/categorias.json`
- **Cuántas caben bien:** 7 a 9. Con más, en computador ya no caben y hay que desplazar.
- **Cómo se agrega una:** un objeto con `id`, `nombre`, `icono` y `orden`. El `id` tiene
  que coincidir con la `categoria` de los productos, o la página saldrá vacía.

---

## Carrusel de la portada

- **Cómo se llama:** "los banners grandes de arriba"
- **Dónde está:** `src/datos/home.json` → `banners`
- **Cuántos caben bien:** 3 a 5. Con más, nadie llega al último.
- **Largo del título:** hasta 60 caracteres. Más largo se ve apretado en celular.
- **Largo del texto:** hasta 110 caracteres.
- **Arte:** se dibuja con el círculo y la curva amarilla del logo; en la primera pieza va el
  isotipo oficial. No hay fotografías todavía: cuando lleguen, van en `imagen`.
- **La primera pieza es la marca** ("Cerca cuando la necesitas."), no una promoción: lo pide
  el manual.
- **Cómo se agrega uno:** un objeto con etiqueta, titulo, texto, boton, enlace e imagen.
- **Se mueve solo** cada 6 segundos, y se detiene al pasar el ratón.

---

## Ventana emergente de oferta (todas las páginas)

- **Cómo se llama:** "la ventanita que sale al abrir la página"
- **Dónde está:** los productos salen del catálogo, marcados con `promo_flash: true`;
  los textos fijos están en `src/datos/home.json` → `popup_oferta`; el diseño en
  `src/components/VentanaOferta.astro`
- **Cuándo aparece:** solo al abrir el sitio, una vez por hora por persona, y únicamente si al
  menos un producto disponible y sin fórmula médica tiene `promo_flash: true`. Si
  ninguno tiene la marca, no se dibuja nada.
- **Cómo se ve:** volante grande (60% de pantalla en computador): foto a la izquierda,
  descripción breve a la derecha y botones de ver detalle y agregar. Si hay varios
  productos marcados, rotan dentro de la ventana con flechas y puntos.
- **Para activarla:** poner `"promo_flash": true` en el producto elegido. El
  propietario indica cuál; no inventar ofertas.
- **Vigencia opcional:** el campo `promo_flash_vence` (fecha y hora, hora de Bogotá) hace
  que la oferta se apague sola cuando llega esa hora, sin que nadie tenga que volver a
  editar el catálogo. Si queda vacío, la oferta dura hasta que alguien la apague a mano.
  Mientras está vigente, la ventana muestra una etiqueta con "Válida hasta…". Se edita
  desde la planilla, columna "Vence la promoción".
- **Dónde aplica (opcional):** el campo `promo_flash_donde` es un texto libre que se
  muestra tal cual se escriba, en una segunda etiqueta junto a la de vigencia — por
  ejemplo "Solo en la página web", "En todas las sedes" o "Solo en la sede Villa del
  Prado". Si queda vacío, no sale ninguna etiqueta y no se aclara nada (se asume que
  aplica donde el cliente esté comprando). Se edita desde la planilla, columna
  "¿Dónde aplica la promoción?".
- **Se cierra** con la X, tocando el fondo o con Escape.

---

## Medición (todas las páginas)

- **Cómo se llama:** "los códigos de Google, el píxel y Metricool"
- **Dónde está:** `src/datos/config.json` → `medicion` (tres campos, hoy vacíos)
- **Cómo se conecta:** el propietario entrega cada código y se pega en su campo;
  el sitio lo incluye solo. Con los campos vacíos no se carga nada de terceros
- **Al conectar el primero,** hay que actualizar el texto de privacidad
  (`src/datos/legal.json` → `privacidad`, "Servicios de terceros"), porque esos
  servicios sí reciben visitas

---

## Accesos rápidos (portada)

- **Cómo se llama:** "los círculos de categorías"
- **Dónde está:** `src/datos/home.json` → `accesos`
- **Cuántos caben bien:** 6 a 10. En celular se desplazan de lado.
- **Texto:** una o dos palabras. Tres se ven apretadas.

---

## Barra de ofertas (portada y ofertas)

- **Cómo se llama:** "la barra amarilla de ofertas"
- **Dónde está:** el texto en `src/datos/home.json` → `ofertas`
- **No lleva cuenta regresiva a propósito:** el manual de marca pide no vender con
  urgencia. No volver a ponerla aunque se pida sin consultarlo.

---

## Filas de productos (portada)

- **Cómo se llama:** "los productos de la portada"
- **Dónde está:** `src/pages/index.astro`, y el criterio en `src/scripts/destacados.js`
- **Cuántos muestra:** 10 en ofertas y 5 por categoría
- **Cómo se decide cuáles:** ver `REGLAS-DEL-CATALOGO.md`, regla 1
- **Para empujar un producto:** ponerle `"destacado": true` en el catálogo

---

## Tarjeta de producto (en todas las listas)

- **Dónde está:** `src/components/TarjetaProducto.astro`
- **Muestra:** foto, descuento, marca, nombre a dos líneas, presentación, precio, ahorro y
  botón de agregar. Si el producto está marcado como destacado, lleva una etiqueta
  verde que dice "Destacado"
- **Cuidado:** existe una copia en JavaScript, `src/scripts/tarjeta.js`, para las listas que
  se pintan al filtrar. **Si se cambia una, hay que cambiar la otra.**

---

## Ficha de producto

- **Dónde está:** `src/pages/producto/[slug].astro`. Se genera una por producto.
- **Muestra:** galería, precio con ahorro, aviso de fórmula si aplica, botón de agregar,
  ventajas, descripción, ficha técnica (si tiene datos) y 5 relacionados de la misma categoría
- **Descripción:** hasta unos 400 caracteres se ve bien. Se edita en el campo `descripcion`
  del producto. **Nunca escribir indicaciones médicas ahí.**

### Ficha técnica del producto

- **Qué es:** una tabla con Registro INVIMA, Principio activo, Concentración, Forma
  farmacéutica y Presentación comercial (el nombre y la marca ya salen arriba en la
  página, así que se repiten dentro de la tabla solo cuando hay algún otro dato cargado).
- **Se llena de a poco.** Un producto sin ningún dato de la ficha simplemente no muestra
  la sección: no aparece un "falta" en cada uno de los 407 productos a la vez. En cuanto
  se carga al menos un campo, la sección aparece con lo que haya.
- **Quién la llena:** desde `Catalogo-Drogueria-Xivica.xlsx`. Registro INVIMA, Principio
  activo, Concentración y Forma farmacéutica son columnas NARANJA: **solo las llena el
  regente de farmacia**, con el dato real del empaque, nunca a ojo. Presentación comercial
  (por ejemplo "Caja x 20 tabletas") es AMARILLA: la puede llenar el dueño.
- **En el catálogo (JSON):** campos `registro_invima`, `principio_activo`,
  `concentracion`, `forma_farmaceutica`, `presentacion_comercial`. Ver
  `REGLAS-DEL-CATALOGO.md`.

---

## Catálogo con filtros

- **Dónde está:** `src/pages/catalogo.astro`
- **Filtra por:** categoría, precio, marca (42 disponibles), tipo (26) y dos casillas
- **Ordena por:** relevancia, menor precio, mayor precio, mayor descuento y nombre
- **Muestra de a 24** productos, con un botón para ver más
- **Los filtros quedan en la dirección**, así que se pueden compartir por WhatsApp

---

## Carrito

- **Cómo se llama:** "el carrito"
- **Dónde está:** `src/components/` dentro del layout, y `src/scripts/carrito.js`
- **Formulario:** sede, nombre, teléfono y dirección son obligatorios; barrio, forma de
  pago y nota son opcionales. Lo escrito no se borra al cambiar cantidades
- **Si paga en efectivo,** se pregunta de cuánto son las vueltas (obligatorio) y viaja
  en el mensaje
- **El pedido llega al WhatsApp de la sede elegida** (cada sede tiene el suyo en
  `config.json` → `sedes[]`)
- **El botón junto al logo** muestra las tres sedes y abre el WhatsApp de la elegida
- **Formas de pago:** se editan en `src/scripts/carrito.js`, buscando "Efectivo"
- **Al enviar** abre WhatsApp con el pedido escrito. No cobra nada en línea.

---

## Servicios y sedes en la portada

- **Dónde está:** los servicios salen de `src/datos/servicios.json` y las sedes de
  `src/datos/config.json`; los títulos, de `src/datos/home.json`
- **Por qué están ahí:** el manual pide que el inicio muestre qué puede resolver la
  droguería y dónde encontrarla, antes del contacto
- **Cierre:** la franja oscura final lleva a WhatsApp. Texto en `home.json` → `cierre`

---

## Pie de página

- **Dónde está:** `src/components/Footer.astro`, con los datos de `config.json`
- **Muestra:** logo, categorías, enlaces, sedes, datos legales y el aviso de fórmula médica
- **Lo que falta se ve resaltado en amarillo.** Es a propósito.

---

## Servicios

- **Dónde está:** `src/datos/servicios.json`
- **Cuántos caben bien:** 3 a 6
- **Cada uno tiene:** título, resumen de una línea, párrafo de detalle y 3 puntos
- **Puntos:** 2 a 4 por servicio. Más de 4 se lee como lista de supermercado.

---

## Sedes

- **Dónde está:** `src/datos/config.json` → `sedes`
- **Cuántas caben bien:** 2 a 6, en tarjetas que se acomodan solas
- **El mapa** se dibuja con las coordenadas de cada sede y se carga solo al llegar ahí

---

## Legales

- **Dónde está:** `src/datos/legal.json`
- **Cuatro documentos:** privacidad, tratamiento de datos, términos y domicilios
- **Cada uno** es una lista de secciones con título y texto
- **Al cambiar algo**, actualizar también la fecha en `actualizado`

---

## Fotografías (portada, sedes y Nosotros)

- **Cómo se llama para el cliente:** "las fotos de la droguería"
- **Dónde está cada una:**
  - Portada, primer banner (la persona en el círculo) → `home.json` → `banners[0].foto`
  - Tarjeta de cada sede y su miniatura en la portada → `config.json` → `sedes[].foto`
  - Nosotros: la grande → `nosotros.json` → `foto_principal`; las de adentro → `galeria`
- **Cómo se preparan:** `tools/preparar-fotos.mjs` (Node, funciona igual en Windows). Ver la receta en `COMO-EDITAR.md`.
- **Cuántas caben bien:** galería de Nosotros, 2 a 4 (con más se vuelve un álbum; hoy son 4, dos por sede). Cada leyenda dice de qué sede es. Un solo
  banner de portada con foto; los otros funcionan mejor con el icono.
- **Descripción:** cada foto lleva `foto_alt`, una frase corta y concreta. Es obligatoria.
- **Una sede sin foto** muestra un marcador azul que dice "Foto de la sede próximamente". Es a
  propósito: mantiene las tarjetas alineadas y se ve qué falta. Desaparece solo al poner la foto.
- **Peso:** cada foto se genera en tres tamaños (600, 900 y 1200 px) y el celular baja el que
  necesita. Las ocho fotos actuales suman 2,1 MB entre todas sus versiones.
- **En celular** la foto de la portada se reduce a un círculo pequeño junto al botón, para no
  tapar el texto.
