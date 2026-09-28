# Reglas del catálogo

> Este documento explica **por qué el sitio muestra lo que muestra**. Está escrito para
> poder leérselo al dueño de la droguería, no solo para quien programa.
>
> Todo lo que aquí se describe se puede cambiar. Al final de cada regla dice dónde.

---

## 1. Qué productos salen en la portada

La portada no muestra los productos en el orden en que están guardados. Si lo hiciera,
mandaría el alfabeto: la primera versión abría la fila de medicamentos con dos
presentaciones de **acetaminofén con codeína**, que es justo lo que no conviene poner de
escaparate.

El orden se decide así, en este orden y hasta llenar la fila:

**Primero, los que la droguería marca a mano.** En `src/datos/productos.json`, cualquier
producto con `"destacado": true` pasa al frente. Es la forma de empujar lo que se quiere
vender esta semana: un producto nuevo, uno con sobrestock, uno de temporada.

**Después, los de mayor ahorro en pesos.** No el mayor porcentaje: el mayor ahorro real.
Un producto que baja de $80.000 a $50.000 (ahorro de $30.000) va antes que uno que baja de
$10.000 a $9.000, aunque los dos sean "10% de descuento".

**Por último, el resto**, en un orden variado pero **siempre el mismo**. No es azar de
verdad a propósito: si lo fuera, la portada se reordenaría sola en cada publicación y
nadie sabría por qué cambió.

*Dónde se cambia:* el campo `destacado` en `src/datos/productos.json`. La lógica está en
`src/scripts/destacados.js`.

---

## 2. Los medicamentos que requieren fórmula médica nunca salen destacados

Un producto marcado como que requiere fórmula médica **no aparece nunca** en la portada ni
en las filas de destacados, aunque sea el de mayor descuento del catálogo.

Sí sigue estando en el catálogo, en su categoría y en el buscador: quien lo busca lo
encuentra. Lo que no hace el sitio es ofrecerlo a quien no lo estaba buscando.

Es lo prudente en el sector y evita el problema de estar promocionando un medicamento de
control a alguien que llegó buscando pañales.

*Dónde se cambia:* el campo `rx` de cada producto. Ver la regla 3.

---

## 3. El campo de fórmula médica está vacío, y es a propósito

**Hoy ningún producto está marcado como que requiere fórmula médica.** No es un olvido.

Ese dato se podía deducir automáticamente del nombre del producto, y se decidió no
hacerlo: equivocarse marcando de menos un medicamento de control no es un error de datos,
es un problema legal para la droguería.

**Lo tiene que llenar el propio dueño**, desde `Catalogo-Drogueria-Xivica.xlsx` (columna
"¿Requiere fórmula?"). Hasta que eso ocurra, la regla 2 no protege nada, porque no hay
ningún producto marcado.

*Dónde se cambia:* poner `"rx": true` en los productos que la requieran, dentro de
`src/datos/productos.json`. Está anotado en `PENDIENTES.md`.

---

## 4. Un producto no aparece dos veces en la misma pantalla

Si un producto ya salió en "Destacados de la semana", no vuelve a salir más abajo en la
fila de su categoría. Ver el mismo producto repetido hace que el catálogo parezca más
pobre de lo que es.

*Dónde se cambia:* `src/pages/index.astro`.

---

## 5. De dónde sale cada dato de un producto

El catálogo se armó a partir del sitio anterior, y buena parte de la información no venía
escrita: se dedujo. Para poder revisarla, **cada producto guarda de dónde salió cada
dato**, en un campo llamado `origen`:

| Marca | Qué significa | ¿Confiable? |
|---|---|---|
| `titulo` | Se leyó literal del nombre del producto | Sí |
| `inferido` | Se dedujo por palabras clave | Revisable, puede fallar |
| `pendiente` | No se dedujo: lo llena una persona | Vacío hoy |
| `revisado` | Confirmado por el propio dueño | Sí |

Estado actual de los 407 productos:

| Dato | Cuántos lo tienen | Cómo se obtuvo |
|---|---|---|
| Presentación (mg, ml, cantidad) | 94% | Leído del título |
| Marca | 22% | Leído del título |
| Subcategoría | 52% | Inferido por palabras clave |
| Requiere fórmula médica | 0% | Pendiente de que el dueño lo llene en el Excel |

**La subcategoría se quedó en la mitad a propósito.** El resto son medicamentos genéricos
cuyo uso no se puede deducir del nombre sin arriesgar equivocarse. Por eso el filtro
principal del catálogo es por categoría, que sí cubre el 100% de los productos.

---

## 6. Los precios se guardan como números, no como texto

Un precio se guarda `62900`, no `"$62.900"`. El signo de pesos y los puntos se agregan al
mostrarlo.

Importa para quien edite el catálogo: **si se escribe un precio entre comillas o con
puntos, el sitio no se publica.** El validador lo detiene antes, a propósito, porque un
precio mal escrito rompería el filtro por precio y la suma del carrito.

*Correcto:* `"precio": 62900`
*Incorrecto:* `"precio": "$62.900"` · `"precio": "62.900"` · `"precio": 62.900`

---

## 7. Una oferta necesita dos precios

Para que un producto muestre descuento tiene que tener `precio_antes` **mayor** que
`precio`, y el campo `descuento` con el porcentaje.

**El porcentaje se escribe, pero no se inventa.** El sitio comprueba que cuadre con los
dos precios: si se pone 90% en un producto que baja de $84.915 a $62.900, no se publica,
y el aviso dice el número correcto (26). El ahorro en pesos sí lo calcula la página sola.

Tampoco se publica si `precio_antes` es menor o igual que el precio, o si hay descuento
sin precio anterior: mostrar una oferta que no existe sería publicidad engañosa.

---

## 8. Lo que falta se muestra marcado, no se inventa

Cualquier dato que la droguería no haya entregado aparece **resaltado en amarillo en el
pie del sitio**. Hoy no hay ninguno: la habilitación sanitaria de las tres sedes, el NIT y
los horarios están cargados y confirmados por el propietario.

Es incómodo a propósito. La alternativa era ocultarlos o poner algo verosímil, y las dos
terminan en un sitio publicado con datos legales falsos.

*Dónde se cambia:* `src/datos/config.json`. Todo lo que diga `PENDIENTE` está esperando un
dato real.

---

## 9. Cuántos productos caben bien en cada sitio

| Sección | Cuántos muestra | Qué pasa si se cambia |
|---|---|---|
| Destacados de la semana | 10 | Con menos de 5 la fila se ve vacía en escritorio |
| Fila por categoría | 5 | Es una fila exacta en pantalla grande |
| Relacionados en la ficha | 5 | Salen de la misma categoría del producto |
| Resultados del buscador | 6 | Más no caben sin tapar la página |

La grilla muestra **5 columnas** en computador, 3 en tableta y 2 en celular.

---

## 10. Las imágenes

Cada producto necesita **al menos una imagen**, y el archivo tiene que existir de verdad
en `public/img/`. Si se referencia una imagen que no está, el sitio no se publica.

Las fotos actuales vienen del sitio anterior, que las tomó de catálogos de proveedores.
**Antes de publicar en el dominio definitivo conviene confirmar que la droguería tiene
derecho a usarlas.** Está anotado en `PENDIENTES.md`.

Los banners de portada no llevan fotografías todavía: se dibujan con el círculo y la curva
amarilla del logo, que es lo que propone el manual de marca.

Las galerías traen fotos de otros productos en algunos casos, heredadas del sitio anterior.
Está en `PENDIENTES.md`.

---

## 11. Qué pasa cuando se edita el catálogo

```
se edita productos.json  →  se sube a GitHub  →  se revisa que esté bien
                                                        ↓
                                          ¿está bien? → se publica solo
                                          ¿está mal?  → NO se publica y
                                                        el sitio sigue como estaba
```

Esa revisión automática es la red de seguridad: como quien edita el catálogo es un
asistente conversando con el dueño, una coma mal puesta podría dejar la tienda en blanco
para todos los visitantes. El sitio publicado nunca se rompe por un error de edición.

### Qué revisa, exactamente

Probado rompiendo el catálogo a propósito de 16 formas distintas: las atrapa todas.

| Revisa | Por qué importa |
|---|---|
| Que el archivo esté bien escrito (comas, comillas, llaves) | Si no, la tienda no carga. El aviso dice la línea |
| Precio como número entero, mayor que cero y sin ceros de más | Un precio mal escrito rompe filtros y el carrito |
| Que el descuento cuadre con los dos precios | Un porcentaje inventado es publicidad engañosa |
| Que `rx`, `stock` y `destacado` sean `true` o `false` sin comillas | **`"rx": "si"` sacaría un medicamento de control a la portada** |
| Que la categoría exista | Si no, el producto desaparece de su categoría y de los filtros |
| Que haya título y al menos una foto que exista | Si no, sale una tarjeta vacía o una imagen rota |
| Que cada dirección de producto sea única y bien escrita | Dos productos con la misma dirección son una página menos |

Cada aviso dice **qué producto**, **qué pasa** y **cómo se escribe bien**.

Para revisar el catálogo antes de subirlo, desde la carpeta del proyecto:

```
npm run validar
```

Dice exactamente qué producto está mal y por qué.
