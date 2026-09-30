#!/usr/bin/env python3
"""Puente entre el catálogo (JSON) y la planilla del dueño (Excel).

    python3 tools/excel_catalogo.py generar
    python3 tools/excel_catalogo.py revisar Catalogo-Drogueria-Xivica.xlsx
    python3 tools/excel_catalogo.py aplicar Catalogo-Drogueria-Xivica.xlsx

El dueño edita la planilla y la devuelve. `revisar` la compara contra el JSON
con las mismas reglas del validador y dice, producto por producto, qué quedó
mal y cómo se escribe bien. `aplicar` solo escribe si no hay ningún error.

El descuento NO se lee de la planilla: se calcula de los dos precios con la
misma cuenta del validador, así siempre cuadra. En la planilla hay una fórmula
que lo muestra en vivo para orientar al dueño.
"""
import json
import re
import sys
from copy import copy
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from validar import validar, cargar_categorias, descuento_esperado

RAIZ = Path(__file__).resolve().parent.parent
RUTA_JSON = RAIZ / "src" / "datos" / "productos.json"
RUTA_XLSX = RAIZ / "Catalogo-Drogueria-Xivica.xlsx"

FUENTE = Font(name="Arial", size=11)
FUENTE_TITULO = Font(name="Arial", size=11, bold=True, color="FFFFFF")
FONDO_TITULO = PatternFill("solid", fgColor="17324D")
AMARILLO = PatternFill("solid", fgColor="FFF2CC")   # celdas que edita el dueño
NARANJA = PatternFill("solid", fgColor="FCE5CD")    # solo el regente
GRIS = PatternFill("solid", fgColor="EFEFEF")       # no tocar
CALCULO = PatternFill("solid", fgColor="D9EAD3")    # se calcula solo

# slug, titulo, marca, presentacion, categoria, subcategoria, precio,
# precio_antes, descuento, stock, destacado, promo_flash, rx,
# registro_invima, principio_activo, concentracion, forma_farmaceutica,
# presentacion_comercial, imagenes, descripcion
COLUMNAS = [
    ("slug", "Código (no tocar)", GRIS, 42, False),
    ("titulo", "Nombre", AMARILLO, 48, True),
    ("marca", "Marca", AMARILLO, 18, True),
    ("presentacion", "Presentación", AMARILLO, 24, True),
    ("categoria", "Categoría", AMARILLO, 22, True),
    ("subcategoria", "Subcategoría", AMARILLO, 22, True),
    ("precio", "Precio ($)", AMARILLO, 13, True),
    ("precio_antes", "Precio anterior ($, vacío si no hay oferta)", AMARILLO, 18, True),
    ("descuento", "% descuento (se calcula solo)", CALCULO, 14, False),
    ("stock", "¿Hay existencias? (SI/NO)", AMARILLO, 16, True),
    ("destacado", "¿Destacado en portada? (SI/NO)", AMARILLO, 16, True),
    ("promo_flash", "¿Promoción relámpago? (SI/NO)", AMARILLO, 18, True),
    ("promo_flash_vence", "Vence la promoción (AAAA-MM-DD HH:MM, hora Bogotá; vacío = no vence sola)", AMARILLO, 30, True),
    ("promo_flash_donde", "¿Dónde aplica la promoción? (ej: solo en la web / en todas las sedes / solo Villa del Prado)", AMARILLO, 34, True),
    ("rx", "¿Requiere fórmula? (SI/NO/vacío, SOLO el regente)", NARANJA, 22, True),
    ("registro_invima", "Registro INVIMA (SOLO el regente)", NARANJA, 26, True),
    ("principio_activo", "Principio activo (SOLO el regente)", NARANJA, 26, True),
    ("concentracion", "Concentración (SOLO el regente)", NARANJA, 20, True),
    ("forma_farmaceutica", "Forma farmacéutica (SOLO el regente)", NARANJA, 22, True),
    ("presentacion_comercial", "Presentación comercial (ej. Caja x 20 tabletas)", AMARILLO, 26, True),
    ("descripcion", "Descripción (sin indicaciones médicas)", AMARILLO, 60, True),
]

SI = {"SI", "SÍ", "TRUE", "VERDADERO", "1"}
NO = {"NO", "FALSE", "FALSO", "0"}

# La planilla usa un formato simple ("2026-10-05 20:00") porque nadie deberia
# escribir a mano el "-05:00" del huso horario. El JSON guarda el ISO completo
# (ver PROMO_VENCE_ISO en validar.py); estas dos funciones convierten entre uno
# y otro. Bogota no tiene horario de verano, asi que el desfase -05:00 es fijo.
VENCE_PLANILLA = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$")
VENCE_ISO = re.compile(r"^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):00-05:00$")


def vence_a_planilla(valor):
    if not valor:
        return ""
    coincide = VENCE_ISO.match(valor)
    if not coincide:
        return valor  # se deja tal cual para que revisar() lo señale
    fecha, hora, minuto = coincide.groups()
    return f"{fecha} {hora}:{minuto}"


def vence_de_planilla(valor, quien, errores):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None, True
    texto = str(valor).strip()
    coincide = VENCE_PLANILLA.match(texto)
    if not coincide:
        errores.append(
            f"{quien}: 'vence la promoción' debe escribirse AAAA-MM-DD HH:MM "
            f"(por ejemplo 2026-10-05 20:00, hora de Bogotá) o quedar vacío; "
            f"tiene '{valor}'"
        )
        return None, False
    fecha, hora, minuto = coincide.groups()
    return f"{fecha}T{hora}:{minuto}:00-05:00", True


def a_si_no(valor):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return ""
    if isinstance(valor, bool):
        return "SI" if valor else "NO"
    return str(valor).strip().upper()


def de_si_no(valor, campo, quien, errores):
    """Convierte SI/NO a true/false. Devuelve (valor, ok)."""
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return False, True
    texto = str(valor).strip().upper()
    if texto in SI:
        return True, True
    if texto in NO:
        return False, True
    errores.append(
        f"{quien}: '{campo}' debe ser SI o NO, sin nada más; tiene '{valor}'"
    )
    return False, False


def de_rx(valor, quien, errores):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None, True
    texto = str(valor).strip().upper()
    if texto in SI:
        return True, True
    if texto in NO:
        return False, True
    errores.append(
        f"{quien}: 'fórmula' debe ser SI, NO o vacío; tiene '{valor}'. "
        f"Este dato lo define el regente de farmacia."
    )
    return None, False


def generar():
    productos = json.loads(RUTA_JSON.read_text(encoding="utf-8"))
    categorias = sorted(cargar_categorias(RUTA_JSON) or [])

    libro = Workbook()
    hoja = libro.active
    hoja.title = "Productos"
    hoja.sheet_properties.tabColor = "00813F"
    hoja.freeze_panes = "A2"
    hoja.auto_filter.ref = f"A1:{get_column_letter(len(COLUMNAS))}{len(productos) + 1}"

    for col, (campo, titulo, fondo, ancho, editable) in enumerate(COLUMNAS, start=1):
        celda = hoja.cell(row=1, column=col, value=titulo)
        celda.font = FUENTE_TITULO
        celda.fill = FONDO_TITULO
        celda.alignment = Alignment(wrap_text=True, vertical="center")
        hoja.column_dimensions[get_column_letter(col)].width = ancho
    hoja.row_dimensions[1].height = 45

    for fila, p in enumerate(productos, start=2):
        valores = {
            "slug": p.get("slug"),
            "titulo": p.get("titulo"),
            "marca": p.get("marca"),
            "presentacion": p.get("presentacion"),
            "categoria": p.get("categoria"),
            "subcategoria": p.get("subcategoria"),
            "precio": p.get("precio"),
            "precio_antes": p.get("precio_antes"),
            "descuento": f'=IF(H{fila}="","",ROUND((H{fila}-G{fila})/H{fila}*100))',
            "stock": a_si_no(p.get("stock")),
            "destacado": a_si_no(p.get("destacado")),
            "promo_flash": a_si_no(p.get("promo_flash")),
            "promo_flash_vence": vence_a_planilla(p.get("promo_flash_vence")),
            "promo_flash_donde": p.get("promo_flash_donde"),
            "rx": a_si_no(p.get("rx")),
            "registro_invima": p.get("registro_invima"),
            "principio_activo": p.get("principio_activo"),
            "concentracion": p.get("concentracion"),
            "forma_farmaceutica": p.get("forma_farmaceutica"),
            "presentacion_comercial": p.get("presentacion_comercial"),
            "descripcion": p.get("descripcion"),
        }
        for col, (campo, _t, fondo, _a, _e) in enumerate(COLUMNAS, start=1):
            celda = hoja.cell(row=fila, column=col, value=valores[campo])
            celda.font = FUENTE
            celda.fill = fondo
            celda.alignment = Alignment(vertical="center", wrap_text=(campo == "descripcion"))

    # Listas para los desplegables
    listas = libro.create_sheet("Listas")
    listas.sheet_state = "hidden"
    for i, c in enumerate(categorias, start=1):
        listas.cell(row=i, column=1, value=c)
    listas.cell(row=1, column=2, value="SI")
    listas.cell(row=2, column=2, value="NO")
    n_cat = len(categorias)
    ultima = len(productos) + 1

    def desplegable(col_letra, rango_origen, mensaje):
        dv = DataValidation(type="list", formula1=rango_origen, allow_blank=True)
        dv.error = mensaje
        dv.errorTitle = "Revisar"
        dv.showErrorMessage = True
        hoja.add_data_validation(dv)
        dv.add(f"{col_letra}2:{col_letra}{ultima}")

    desplegable("E", f"Listas!$A$1:$A${n_cat}", "Elige una categoría de la lista.")
    for col in ("J", "K", "L", "M"):
        desplegable(col, "Listas!$B$1:$B$2", "Escribe SI o NO.")
    ent = DataValidation(type="whole", operator="greaterThan", formula1=0, allow_blank=True)
    ent.error = "El precio es un número entero mayor que cero, sin puntos ni signo $ (62900)."
    ent.showErrorMessage = True
    hoja.add_data_validation(ent)
    ent.add(f"G2:G{ultima}")
    ent2 = copy(ent)
    hoja.add_data_validation(ent2)
    ent2.add(f"H2:H{ultima}")

    instrucciones = libro.create_sheet("Instrucciones")
    instrucciones.sheet_properties.tabColor = "FFD400"
    instrucciones.column_dimensions["A"].width = 110
    lineas = [
        "CÓMO USAR ESTA PLANILLA",
        "",
        "1. Edita solo las celdas en AMARILLO. Las grises (código y % descuento) no se tocan.",
        "2. Las columnas NARANJA (¿Requiere fórmula?, Registro INVIMA, Principio activo,",
        "   Concentración, Forma farmacéutica) las llena SOLO el regente de farmacia.",
        "   Nunca se completan a ojo ni por internet: solo con el dato real del empaque.",
        "3. El precio se escribe como número entero, sin puntos ni signo $: 62900.",
        "4. El % descuento se calcula solo del precio anterior. Si no hay oferta, deja el precio anterior vacío.",
        "5. En SI/NO elige de la lista. La categoría también se elige de la lista.",
        "6. No agregues ni borres filas: para un producto nuevo o eliminado, avísame y lo hago yo.",
        "7. Guarda y envíame el archivo. Yo lo reviso producto por producto: si algo quedó mal,",
        "   te digo qué producto, qué pasa y cómo se escribe bien. Nada se publica hasta corregirlo.",
        "8. La descripción puede mejorarse (presentación, contenido, marca), pero NUNCA lleva",
        "   para qué sirve el medicamento, dosis ni contraindicaciones: eso lo redacta el regente.",
        "9. La ficha técnica (Registro INVIMA, Principio activo, Concentración, Forma",
        "   farmacéutica, Presentación comercial) se llena de a poco, producto por producto:",
        "   no hace falta completarla toda de una vez. Lo que quede vacío no sale en la",
        "   página del producto hasta que se llene.",
        "10. 'Vence la promoción' es opcional. Si se deja vacía, la promoción relámpago dura",
        "    hasta que alguien la apague a mano. Si se escribe una fecha y hora (AAAA-MM-DD",
        "    HH:MM, en hora de Bogotá), la ventana emergente deja de mostrar ese producto",
        "    sola, sin que nadie tenga que volver a tocar el catálogo. Solo tiene efecto si",
        "    '¿Promoción relámpago?' está en SI.",
        "11. '¿Dónde aplica la promoción?' también es opcional y también solo tiene efecto",
        "    con la promoción en SI. Es texto libre: por ejemplo 'Solo en la página web',",
        "    'En todas las sedes' o 'Solo en la sede Villa del Prado'. Se muestra tal cual",
        "    se escriba en la ventana emergente, así que se redacta como se quiere que se lea.",
    ]
    for i, linea in enumerate(lineas, start=1):
        celda = instrucciones.cell(row=i, column=1, value=linea)
        celda.font = Font(name="Arial", size=12, bold=(i == 1))
        celda.alignment = Alignment(wrap_text=True, vertical="top")

    libro.save(RUTA_XLSX)
    print(f"Planilla generada: {RUTA_XLSX} ({len(productos)} productos)")


def leer_filas(ruta_xlsx):
    libro = load_workbook(ruta_xlsx, data_only=False)
    hoja = libro["Productos"]
    filas = []
    for fila in hoja.iter_rows(min_row=2, values_only=True):
        if not fila[0]:
            continue
        filas.append({campo: fila[i] for i, (campo, *_resto) in enumerate(COLUMNAS)})
    return filas


def construir_productos(filas, base):
    """Mezcla lo editado con el JSON actual. Devuelve (productos, errores)."""
    errores = []
    por_slug = {p["slug"]: p for p in base}
    vistos = set()
    productos = []

    for f in filas:
        slug = str(f["slug"]).strip()
        if slug in vistos:
            errores.append(f"{slug}: la fila está repetida en la planilla")
            continue
        vistos.add(slug)
        if slug not in por_slug:
            errores.append(
                f"{slug}: no existe en el catálogo. No agregues filas: "
                f"para un producto nuevo, avísame y lo creo yo."
            )
            continue
        original = por_slug[slug]
        p = dict(original)

        for campo in (
            "titulo", "marca", "presentacion", "subcategoria", "descripcion",
            "registro_invima", "principio_activo", "concentracion",
            "forma_farmaceutica", "presentacion_comercial", "promo_flash_donde",
        ):
            v = f[campo]
            p[campo] = None if v is None or (isinstance(v, str) and not v.strip()) else str(v).strip()

        for campo in ("precio", "precio_antes"):
            v = f[campo]
            if v is None or (isinstance(v, str) and not v.strip()):
                p[campo] = None if campo == "precio_antes" else v
            elif isinstance(v, bool) or not isinstance(v, (int, float)) or int(v) != v:
                errores.append(
                    f"{slug}: '{campo}' debe ser un número entero mayor que cero "
                    f"(62900, sin puntos ni $); tiene '{v}'"
                )
            else:
                p[campo] = int(v)

        for campo in ("stock", "destacado", "promo_flash"):
            p[campo], _ok = de_si_no(f[campo], campo, slug, errores)
            if campo not in original and not p[campo]:
                # No se agrega la marca donde no existía: el archivo queda igual.
                del p[campo]

        p["rx"], _ok = de_rx(f["rx"], slug, errores)
        p["promo_flash_vence"], _ok = vence_de_planilla(f["promo_flash_vence"], slug, errores)

        cat = f["categoria"]
        p["categoria"] = None if cat is None or not str(cat).strip() else str(cat).strip()

        # El descuento siempre sale de los precios, nunca de la planilla.
        if p.get("precio_antes") and isinstance(p.get("precio"), int):
            p["descuento"] = descuento_esperado(p["precio"], p["precio_antes"])
        else:
            p["descuento"] = None

        productos.append(p)

    faltantes = [s for s in por_slug if s not in vistos]
    for s in faltantes:
        errores.append(f"{s}: falta su fila en la planilla. No borres filas.")

    orden = [p["slug"] for p in base]
    productos.sort(key=lambda p: orden.index(p["slug"]))
    return productos, errores


def revisar(ruta_xlsx):
    base = json.loads(RUTA_JSON.read_text(encoding="utf-8"))
    filas = leer_filas(ruta_xlsx)
    productos, errores = construir_productos(filas, base)
    errores += validar(productos, None, cargar_categorias(RUTA_JSON))
    if errores:
        print(f"{len(errores)} problema(s) en {ruta_xlsx}:\n")
        for mensaje in errores[:60]:
            print(f"  - {mensaje}")
        if len(errores) > 60:
            print(f"  ... y {len(errores) - 60} mas")
        print("\nNada se aplicó al catálogo.")
        return 1
    print(f"La planilla está bien: {len(productos)} productos, 0 problemas.")
    return 0


def aplicar(ruta_xlsx):
    base = json.loads(RUTA_JSON.read_text(encoding="utf-8"))
    filas = leer_filas(ruta_xlsx)
    productos, errores = construir_productos(filas, base)
    errores += validar(productos, None, cargar_categorias(RUTA_JSON))
    if errores:
        print(f"{len(errores)} problema(s), no se aplicó nada:\n")
        for mensaje in errores[:60]:
            print(f"  - {mensaje}")
        return 1
    RUTA_JSON.write_text(
        json.dumps(productos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(f"Aplicado al catálogo: {len(productos)} productos.")
    generar()
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("generar", "revisar", "aplicar"):
        sys.exit(__doc__)
    accion = sys.argv[1]
    if accion == "generar":
        sys.exit(generar() or 0)
    if len(sys.argv) < 3:
        sys.exit("Falta el archivo: revisar|aplicar Catalogo-Drogueria-Xivica.xlsx")
    ruta = Path(sys.argv[2])
    if not ruta.exists():
        sys.exit(f"No existe el archivo: {ruta}")
    sys.exit(revisar(ruta) if accion == "revisar" else aplicar(ruta))
