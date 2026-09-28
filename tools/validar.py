#!/usr/bin/env python3
"""Revisa que el catalogo este bien formado antes de publicarlo.

    python3 tools/validar.py src/datos/productos.json public/img

Existe porque el catalogo lo edita un agente conversando con el dueno de la
drogueria, y un dato mal escrito puede romper la tienda o, peor, publicar algo
falso sin que nadie lo note. La accion de GitHub corre este script en cada
cambio: si algo esta mal, el sitio no se publica y produccion sigue
funcionando con la version anterior.

Cada mensaje dice que producto esta mal, que pasa y como se escribe bien, para
que se pueda corregir sin saber programar.

Devuelve codigo de salida 1 si hay errores, para que la accion falle.
"""
import difflib
import json
import re
import sys
from pathlib import Path

OBLIGATORIOS = ("slug", "titulo", "precio", "categoria", "imagenes")
SLUG_VALIDO = re.compile(r"^[a-z0-9-]+$")

# Tope de cordura. El producto mas caro del catalogo cuesta $240.000; un precio
# por encima de esto casi siempre es un precio con ceros de mas. Si algun dia la
# drogueria vende algo mas caro, se sube este numero.
PRECIO_MAXIMO = 3_000_000

# Tope de peso de una foto de producto. Las del catalogo pesan entre 1 y 23 KB;
# 150 KB deja muchisimo margen y aun asi atrapa lo que de verdad importa: la
# foto recien sacada de WhatsApp, de varios megas, que haria lenta la pagina
# sin que nadie se entere. Se publica igual de bien y nadie mira el peso.
IMAGEN_MAXIMA_KB = 150

# Campos que solo admiten verdadero o falso. Escribirlos entre comillas
# ("true", "si", "no") no da error en ninguna parte: el sitio simplemente
# los lee mal. Con rx eso significa sacar un medicamento de control a la
# portada, que es justo lo que la regla del catalogo prohibe.
SI_O_NO = {
    "stock": "true si hay existencias, false si esta agotado",
    "destacado": "true para empujarlo en la portada, false si no",
    "promo_flash": "true para mostrarlo en la ventana emergente de promocion, false si no",
}


def es_entero(valor):
    return isinstance(valor, int) and not isinstance(valor, bool)


def descuento_esperado(precio, antes):
    return round((antes - precio) / antes * 100)


def leer_catalogo(ruta):
    """Lee el archivo. Devuelve (productos, None) o (None, mensaje legible).

    Un error de escritura (una coma de mas, una comilla sin cerrar) hace que
    Python lance un error tecnico ilegible. Aqui se traduce a la linea y a una
    explicacion que se entiende.
    """
    texto = Path(ruta).read_text(encoding="utf-8")
    try:
        datos = json.loads(texto)
    except json.JSONDecodeError as error:
        lineas = texto.splitlines()
        linea = lineas[error.lineno - 1] if 0 < error.lineno <= len(lineas) else ""
        pista = {
            "Expecting property name enclosed in double quotes":
                "sobra una coma, o falta una comilla antes del nombre del campo",
            "Expecting ',' delimiter": "falta una coma entre dos campos o dos productos",
            "Expecting value": "sobra una coma, o falta un valor despues de los dos puntos",
            "Unterminated string starting at": "hay una comilla sin cerrar",
            "Invalid control character": "hay una comilla sin cerrar: el texto sigue en la línea de abajo",
            "Extra data": "sobra algo despues del ultimo corchete ]",
        }
        explicacion = next(
            (texto_pista for clave, texto_pista in pista.items() if error.msg.startswith(clave)),
            error.msg,
        )
        return None, (
            f"El archivo tiene un error de escritura en la línea {error.lineno}, "
            f"columna {error.colno}: {explicacion}.\n\n"
            f"    {error.lineno} | {linea.strip()[:100]}\n\n"
            f"Nada del catálogo se publica hasta corregirlo."
        )
    if not isinstance(datos, list):
        return None, "El catálogo debe ser una lista de productos entre corchetes [ ]."
    return datos, None


def validar(productos, carpeta_imagenes=None, categorias=None):
    """Devuelve la lista de errores encontrados. Vacia significa que todo esta bien.

    Cada mensaje nombra el producto para poder ubicarlo entre cuatrocientos.
    `categorias` es el conjunto de categorias validas; si se omite, no se revisa.
    """
    errores = []
    vistos = set()

    for indice, producto in enumerate(productos):
        if not isinstance(producto, dict):
            errores.append(f"producto #{indice}: no es un producto, revisa las llaves {{ }}")
            continue

        quien = producto.get("slug") or producto.get("titulo") or f"producto #{indice}"

        for campo in OBLIGATORIOS:
            if campo not in producto:
                errores.append(f"{quien}: falta el campo obligatorio '{campo}'")

        # --- titulo ---
        titulo = producto.get("titulo")
        if "titulo" in producto and (not isinstance(titulo, str) or not titulo.strip()):
            errores.append(f"{quien}: el titulo esta vacio; la tarjeta saldria sin nombre")

        # --- slug ---
        slug = producto.get("slug")
        if slug is not None:
            if not isinstance(slug, str) or not SLUG_VALIDO.match(slug):
                errores.append(
                    f"{quien}: el slug debe ser minusculas, numeros y guiones "
                    f"(es la URL del producto)"
                )
            elif slug in vistos:
                errores.append(f"{quien}: slug repetido, cada producto necesita el suyo")
            else:
                vistos.add(slug)

        # --- precios ---
        precio = producto.get("precio")
        precio_ok = es_entero(precio) and precio > 0
        if not precio_ok:
            errores.append(
                f"{quien}: el precio debe ser un numero entero de pesos mayor que cero "
                f"(por ejemplo 62900, no \"$62.900\")"
            )

        if precio_ok and precio > PRECIO_MAXIMO:
            errores.append(
                f"{quien}: el precio ({precio:,}) parece tener ceros de mas; ".replace(",", ".")
                + f"el tope razonable es {PRECIO_MAXIMO:,}".replace(",", ".")
            )

        antes = producto.get("precio_antes")
        antes_ok = False
        if antes is not None:
            if not es_entero(antes):
                errores.append(f"{quien}: precio_antes debe ser un numero entero o estar vacio (null)")
            elif precio_ok and antes <= precio:
                errores.append(
                    f"{quien}: precio_antes ({antes}) no es mayor que el precio ({precio}), "
                    f"asi que no hay oferta que mostrar"
                )
            else:
                antes_ok = precio_ok

        # --- descuento: tiene que salir de los precios, no inventarse ---
        # Un porcentaje escrito a mano que no cuadra con los precios es
        # publicidad enganosa. El mensaje da el valor correcto.
        descuento = producto.get("descuento")
        if antes is None:
            if descuento is not None:
                errores.append(
                    f"{quien}: tiene descuento ({descuento}) pero no precio_antes; "
                    f"o se agrega el precio anterior o el descuento va en null"
                )
        elif antes_ok:
            esperado = descuento_esperado(precio, antes)
            if descuento != esperado:
                errores.append(
                    f"{quien}: el descuento debe ser {esperado} "
                    f"(de {antes} a {precio}), no {descuento}"
                )

        # --- campos de si o no ---
        for campo, explicacion in SI_O_NO.items():
            if campo in producto and not isinstance(producto[campo], bool):
                errores.append(
                    f"{quien}: '{campo}' debe ser true o false, sin comillas "
                    f"({explicacion}); tiene {json.dumps(producto[campo], ensure_ascii=False)}"
                )

        rx = producto.get("rx")
        if rx is not None and not isinstance(rx, bool):
            errores.append(
                f"{quien}: 'rx' (requiere formula medica) debe ser true, false o null, "
                f"sin comillas; tiene {json.dumps(rx, ensure_ascii=False)}. Mal escrito, un "
                f"medicamento de control podria salir en la portada. Este dato lo define "
                f"el regente de farmacia."
            )

        # --- promocion relampago: solo productos disponibles y sin formula ---
        if producto.get("promo_flash") is True:
            if rx is True:
                errores.append(
                    f"{quien}: 'promo_flash' no puede ser true porque el producto "
                    f"requiere formula medica; la ventana emergente no promociona "
                    f"medicamentos de control"
                )
            if producto.get("stock") is False:
                errores.append(
                    f"{quien}: 'promo_flash' no puede ser true porque el producto "
                    f"esta agotado; la ventana emergente solo muestra productos disponibles"
                )

        # --- categoria ---
        categoria = producto.get("categoria")
        if categorias is not None and categoria is not None and categoria not in categorias:
            parecida = difflib.get_close_matches(str(categoria), sorted(categorias), n=1)
            sugerencia = f" ¿Querías decir '{parecida[0]}'?" if parecida else ""
            errores.append(
                f"{quien}: la categoria '{categoria}' no existe, y el producto no saldria "
                f"en ninguna categoria ni filtro.{sugerencia}"
            )

        # --- imagenes ---
        imagenes = producto.get("imagenes")
        if not isinstance(imagenes, list) or not imagenes:
            errores.append(f"{quien}: necesita al menos una imagen")
        elif carpeta_imagenes:
            for imagen in imagenes:
                ruta = Path(carpeta_imagenes) / imagen
                if not ruta.exists():
                    errores.append(f"{quien}: la imagen '{imagen}' no existe en la carpeta")
                    continue
                # El formato y el peso: una foto sin preparar se publica igual
                # de bien, y el sitio se vuelve lento producto a producto sin
                # que nadie lo note.
                if ruta.suffix.lower() != ".webp":
                    errores.append(
                        f"{quien}: la imagen '{imagen}' no esta en formato webp. "
                        f"Se prepara con: node tools/preparar-fotos.mjs --producto "
                        f"\"{imagen}\" {ruta.stem}"
                    )
                    continue
                kb = ruta.stat().st_size / 1024
                if kb > IMAGEN_MAXIMA_KB:
                    errores.append(
                        f"{quien}: la imagen '{imagen}' pesa {kb:.0f} KB y el maximo es "
                        f"{IMAGEN_MAXIMA_KB} KB. Una foto asi hace lenta la pagina en "
                        f"celular. Se arregla con: node tools/preparar-fotos.mjs "
                        f"--producto ORIGEN {ruta.stem}"
                    )

    return errores


def _objetos_con_foto(dato, donde):
    """Recorre un JSON entero y devuelve (donde, objeto) por cada objeto con la clave 'foto'.

    Busca a cualquier profundidad, asi una foto nueva en una seccion nueva queda
    cubierta sin tocar el validador.
    """
    if isinstance(dato, dict):
        if "foto" in dato:
            yield donde, dato
        for clave, valor in dato.items():
            yield from _objetos_con_foto(valor, f"{donde} → {clave}")
    elif isinstance(dato, list):
        for indice, valor in enumerate(dato):
            yield from _objetos_con_foto(valor, f"{donde}[{indice}]")


def _existe_alguna_version(carpeta_imagenes, foto):
    """La foto 'fotos/fachada' existe si hay 'fotos/fachada-<ancho>.webp'.

    El ancho tiene que ser un numero: asi 'fachada-calle-600.webp' no se toma
    por una version de 'fachada'.
    """
    ruta = Path(carpeta_imagenes) / foto
    patron = re.compile(rf"^{re.escape(ruta.name)}-\d+\.webp$")
    return ruta.parent.is_dir() and any(patron.match(a.name) for a in ruta.parent.iterdir())


def validar_fotos(carpeta_datos, carpeta_imagenes):
    """Revisa las fotos que se eligen en los JSON del sitio (sedes, portada, nosotros).

    Una foto que no existe deja una imagen rota en la web publicada, y sin
    texto alternativo un lector de pantalla no puede describirla.
    """
    errores = []
    for archivo in sorted(Path(carpeta_datos).glob("*.json")):
        if archivo.name == "productos.json":   # sus imagenes ya las revisa validar()
            continue
        try:
            datos = json.loads(archivo.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue   # un JSON roto ya lo detiene la compilacion

        for donde, objeto in _objetos_con_foto(datos, archivo.name):
            foto = objeto["foto"]
            if not isinstance(foto, str) or not foto.strip():
                errores.append(f"{donde}: 'foto' esta vacia. Pon el nombre de la foto o quita el campo.")
                continue
            if not _existe_alguna_version(carpeta_imagenes, foto):
                errores.append(
                    f"{donde}: la foto '{foto}' no existe en public/img. Se prepara con: "
                    f"node tools/preparar-fotos.mjs ORIGEN {foto}"
                )
            alt = objeto.get("foto_alt")
            if not isinstance(alt, str) or not alt.strip():
                errores.append(
                    f"{donde}: la foto '{foto}' necesita 'foto_alt', una frase que la describa "
                    f"para quien usa lector de pantalla."
                )
    return errores


def cargar_categorias(ruta_catalogo):
    """Las categorias validas, leidas de categorias.json junto al catalogo."""
    ruta = Path(ruta_catalogo).parent / "categorias.json"
    if not ruta.exists():
        return None
    return {c["id"] for c in json.loads(ruta.read_text(encoding="utf-8"))}


def main(ruta, carpeta_imagenes=None):
    productos, error = leer_catalogo(ruta)
    if error:
        print(error)
        return 1

    errores = validar(productos, carpeta_imagenes, cargar_categorias(ruta))
    if carpeta_imagenes:
        errores += validar_fotos(Path(ruta).parent, carpeta_imagenes)

    if errores:
        print(f"{len(errores)} problema(s) en {ruta}:\n")
        for mensaje in errores[:60]:
            print(f"  - {mensaje}")
        if len(errores) > 60:
            print(f"  ... y {len(errores) - 60} mas")
        return 1

    print(f"{len(productos)} productos validos en {ruta}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    carpeta = sys.argv[2] if len(sys.argv) > 2 else None
    sys.exit(main(sys.argv[1], carpeta))
