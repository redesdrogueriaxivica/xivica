"""Pruebas del validador del catalogo.
   python3 -m unittest discover tools -v"""
import unittest

import json
import tempfile
from pathlib import Path

from validar import validar, leer_catalogo, validar_fotos

BUENO = {
    "slug": "abc", "titulo": "ABC", "precio": 1000, "precio_antes": None,
    "descuento": None, "categoria": "medicamentos", "imagenes": ["a.webp"],
    "descripcion": "x", "stock": True, "rx": None, "destacado": False,
}
CATEGORIAS = {"medicamentos", "cuidado-personal"}


class ValidarTest(unittest.TestCase):
    def test_producto_correcto_no_da_errores(self):
        self.assertEqual(validar([BUENO]), [])

    def test_ficha_tecnica_ausente_no_da_error(self):
        self.assertEqual(validar([BUENO]), [])

    def test_ficha_tecnica_con_texto_pasa(self):
        p = {**BUENO, "registro_invima": "INVIMA 2020M-0012345", "concentracion": "500 mg"}
        self.assertEqual(validar([p]), [])

    def test_ficha_tecnica_vacia_como_texto_es_error(self):
        p = {**BUENO, "principio_activo": "   "}
        errores = validar([p])
        self.assertEqual(len(errores), 1)
        self.assertIn("principio_activo", errores[0])

    def test_ficha_tecnica_con_numero_es_error(self):
        p = {**BUENO, "concentracion": 500}
        errores = validar([p])
        self.assertEqual(len(errores), 1)
        self.assertIn("concentracion", errores[0])

    def test_vigencia_de_promo_flash_bien_escrita_pasa(self):
        p = {**BUENO, "promo_flash": True, "promo_flash_vence": "2026-10-05T20:00:00-05:00"}
        self.assertEqual(validar([p]), [])

    def test_vigencia_de_promo_flash_ausente_pasa(self):
        p = {**BUENO, "promo_flash": True}
        self.assertEqual(validar([p]), [])

    def test_vigencia_de_promo_flash_mal_escrita_es_error(self):
        p = {**BUENO, "promo_flash": True, "promo_flash_vence": "05/10/2026 8pm"}
        errores = validar([p])
        self.assertEqual(len(errores), 1)
        self.assertIn("promo_flash_vence", errores[0])

    def test_vigencia_sin_promo_flash_activa_es_error(self):
        p = {**BUENO, "promo_flash": False, "promo_flash_vence": "2026-10-05T20:00:00-05:00"}
        errores = validar([p])
        self.assertEqual(len(errores), 1)
        self.assertIn("promo_flash_vence", errores[0])

    def test_donde_aplica_la_promo_flash_con_texto_pasa(self):
        p = {**BUENO, "promo_flash": True, "promo_flash_donde": "Solo en la página web"}
        self.assertEqual(validar([p]), [])

    def test_donde_aplica_la_promo_flash_sin_promo_activa_es_error(self):
        p = {**BUENO, "promo_flash": False, "promo_flash_donde": "En todas las sedes"}
        errores = validar([p])
        self.assertEqual(len(errores), 1)
        self.assertIn("promo_flash_donde", errores[0])

    def test_donde_aplica_la_promo_flash_vacio_como_texto_es_error(self):
        p = {**BUENO, "promo_flash": True, "promo_flash_donde": "   "}
        errores = validar([p])
        self.assertEqual(len(errores), 1)
        self.assertIn("promo_flash_donde", errores[0])

    def test_precio_como_texto_es_error(self):
        malo = dict(BUENO, precio="$1.000")
        self.assertTrue(any("precio" in e for e in validar([malo])))

    def test_precio_cero_o_negativo_es_error(self):
        self.assertTrue(any("precio" in e for e in validar([dict(BUENO, precio=0)])))
        self.assertTrue(any("precio" in e for e in validar([dict(BUENO, precio=-5)])))

    def test_slug_repetido_es_error(self):
        errores = validar([BUENO, dict(BUENO)])
        self.assertTrue(any("repetido" in e for e in errores))

    def test_slug_con_mayusculas_o_espacios_es_error(self):
        self.assertTrue(any("slug" in e for e in validar([dict(BUENO, slug="Con Espacio")])))

    def test_sin_imagenes_es_error(self):
        self.assertTrue(any("imagen" in e for e in validar([dict(BUENO, imagenes=[])])))

    def test_campo_obligatorio_ausente_es_error(self):
        sin_titulo = {k: v for k, v in BUENO.items() if k != "titulo"}
        self.assertTrue(any("titulo" in e for e in validar([sin_titulo])))

    def test_descuento_incoherente_es_error(self):
        # precio mayor que el precio anterior no es una oferta
        malo = dict(BUENO, precio=2000, precio_antes=1000, descuento=50)
        self.assertTrue(any("precio_antes" in e for e in validar([malo])))

    def test_el_error_dice_de_que_producto_se_trata(self):
        errores = validar([dict(BUENO, slug="paracetamol-500", precio=0)])
        self.assertTrue(any("paracetamol-500" in e for e in errores))

    def test_imagen_inexistente_es_error_si_se_pide_revisar(self):
        errores = validar([BUENO], carpeta_imagenes="/carpeta/que/no/existe")
        self.assertTrue(any("no existe" in e for e in errores))


class CamposQueAntesSeEscapabanTest(unittest.TestCase):
    """Cada uno de estos errores se publicaba sin aviso antes de 2026-09-14."""

    def test_rx_como_texto_es_error(self):
        # El mas grave: "si" no es true, y un medicamento de control saldria
        # en la portada saltandose la regla legal.
        errores = validar([dict(BUENO, rx="si")])
        self.assertTrue(any("rx" in e for e in errores))

    def test_rx_acepta_true_false_y_vacio(self):
        for valor in (True, False, None):
            self.assertEqual(validar([dict(BUENO, rx=valor)]), [], valor)

    def test_stock_como_texto_es_error(self):
        self.assertTrue(any("stock" in e for e in validar([dict(BUENO, stock="no")])))

    def test_destacado_como_texto_es_error(self):
        self.assertTrue(any("destacado" in e for e in validar([dict(BUENO, destacado="true")])))

    def test_promo_flash_como_texto_es_error(self):
        self.assertTrue(any("promo_flash" in e for e in validar([dict(BUENO, promo_flash="si")])))

    def test_promo_flash_acepta_true_false_y_ausente(self):
        for valor in (True, False, None):
            producto = dict(BUENO)
            if valor is None:
                producto.pop("promo_flash", None)
            else:
                producto["promo_flash"] = valor
            self.assertEqual(validar([producto]), [], valor)

    def test_promo_flash_con_formula_o_sin_existencias_es_error(self):
        self.assertTrue(any("promo_flash" in e for e in validar([dict(BUENO, promo_flash=True, rx=True)])))
        self.assertTrue(any("promo_flash" in e for e in validar([dict(BUENO, promo_flash=True, stock=False)])))

    def test_titulo_vacio_es_error(self):
        self.assertTrue(any("titulo" in e for e in validar([dict(BUENO, titulo="  ")])))

    def test_categoria_inexistente_es_error_y_sugiere(self):
        errores = validar([dict(BUENO, categoria="medicamento")], categorias=CATEGORIAS)
        self.assertTrue(any("medicamento" in e and "medicamentos" in e for e in errores), errores)

    def test_categoria_existente_pasa(self):
        self.assertEqual(validar([BUENO], categorias=CATEGORIAS), [])

    def test_descuento_que_no_cuadra_con_los_precios_es_error(self):
        malo = dict(BUENO, precio=62900, precio_antes=84915, descuento=90)
        errores = validar([malo])
        # El mensaje dice el valor correcto, para corregirlo sin calcular.
        self.assertTrue(any("descuento" in e and "26" in e for e in errores), errores)

    def test_descuento_correcto_pasa(self):
        self.assertEqual(validar([dict(BUENO, precio=62900, precio_antes=84915, descuento=26)]), [])

    def test_descuento_sin_precio_anterior_es_error(self):
        self.assertTrue(any("descuento" in e for e in validar([dict(BUENO, descuento=20)])))

    def test_precio_anterior_sin_descuento_es_error(self):
        malo = dict(BUENO, precio=62900, precio_antes=84915, descuento=None)
        self.assertTrue(any("descuento" in e for e in validar([malo])))


class PrecioSospechosoTest(unittest.TestCase):
    def test_precio_con_ceros_de_mas_es_error(self):
        # 62900 escrito como 629000000: sin oferta, ninguna otra regla lo ve.
        errores = validar([dict(BUENO, precio=629000000)])
        self.assertTrue(any("ceros" in e for e in errores), errores)

    def test_el_producto_mas_caro_del_catalogo_pasa(self):
        self.assertEqual(validar([dict(BUENO, precio=240000)]), [])


class FotosDelSitioTest(unittest.TestCase):
    """Las fotos que se eligen en config.json, home.json y nosotros.json.
    Una foto mal escrita dejaria una imagen rota en la web publicada."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        raiz = Path(self._tmp.name)
        self.datos = raiz / "datos"
        self.img = raiz / "img"
        (self.img / "fotos").mkdir(parents=True)
        self.datos.mkdir()

    def tearDown(self):
        self._tmp.cleanup()

    def _foto(self, nombre, ancho=600):
        (self.img / "fotos" / f"{nombre}-{ancho}.webp").write_bytes(b"x")

    def _datos(self, archivo, contenido):
        (self.datos / archivo).write_text(json.dumps(contenido), encoding="utf-8")

    def test_foto_que_existe_con_texto_alternativo_pasa(self):
        self._foto("fachada")
        self._datos("config.json", {"sedes": [{"foto": "fotos/fachada", "foto_alt": "Fachada"}]})
        self.assertEqual(validar_fotos(self.datos, self.img), [])

    def test_foto_que_no_existe_es_error_y_dice_como_prepararla(self):
        self._datos("config.json", {"sedes": [{"foto": "fotos/nada", "foto_alt": "x"}]})
        errores = validar_fotos(self.datos, self.img)
        self.assertEqual(len(errores), 1)
        self.assertIn("fotos/nada", errores[0])
        self.assertIn("preparar-fotos.mjs", errores[0])

    def test_dice_en_que_archivo_y_lugar_esta_el_error(self):
        self._datos("home.json", {"banners": [{"foto": "fotos/nada", "foto_alt": "x"}]})
        self.assertIn("home.json", validar_fotos(self.datos, self.img)[0])

    def test_foto_sin_texto_alternativo_es_error(self):
        # Sin foto_alt, un lector de pantalla no puede describirla.
        self._foto("fachada")
        self._datos("config.json", {"sedes": [{"foto": "fotos/fachada"}]})
        self.assertTrue(any("foto_alt" in e for e in validar_fotos(self.datos, self.img)))

    def test_texto_alternativo_vacio_es_error(self):
        self._foto("fachada")
        self._datos("config.json", {"sedes": [{"foto": "fotos/fachada", "foto_alt": "  "}]})
        self.assertTrue(any("foto_alt" in e for e in validar_fotos(self.datos, self.img)))

    def test_encuentra_fotos_anidadas_a_cualquier_profundidad(self):
        self._datos("nosotros.json", {"galeria": {"fila": [{"foto": "fotos/oculta", "foto_alt": "x"}]}})
        self.assertEqual(len(validar_fotos(self.datos, self.img)), 1)

    def test_foto_vacia_es_error(self):
        self._datos("config.json", {"sedes": [{"foto": "", "foto_alt": "x"}]})
        self.assertEqual(len(validar_fotos(self.datos, self.img)), 1)

    def test_sede_sin_foto_es_valido(self):
        # No todas las sedes tienen foto todavia; es un estado normal.
        self._datos("config.json", {"sedes": [{"nombre": "Verbenal"}]})
        self.assertEqual(validar_fotos(self.datos, self.img), [])

    def test_cualquier_tamano_cuenta_como_existente(self):
        self._foto("redonda", ancho=620)   # una foto pequena solo tiene un tamano
        self._datos("home.json", {"banners": [{"foto": "fotos/redonda", "foto_alt": "x"}]})
        self.assertEqual(validar_fotos(self.datos, self.img), [])

    def test_no_confunde_dos_fotos_con_nombre_parecido(self):
        # "fachada-calle-600.webp" no es una version de "fachada"
        self._foto("fachada-calle")
        self._datos("config.json", {"sedes": [{"foto": "fotos/fachada", "foto_alt": "x"}]})
        self.assertEqual(len(validar_fotos(self.datos, self.img)), 1)


class SintaxisTest(unittest.TestCase):
    def _leer(self, texto):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
            f.write(texto)
        return leer_catalogo(Path(f.name))

    def test_json_roto_da_linea_y_explicacion_legible(self):
        productos, error = self._leer('[\n {"slug": "a",,\n  "titulo": "A"}\n]')
        self.assertIsNone(productos)
        self.assertIn("línea 2", error)
        self.assertNotIn("Traceback", error)

    def test_comilla_sin_cerrar_se_explica_en_espanol(self):
        productos, error = self._leer('[\n {"slug": "a",\n  "titulo": "A\n}]')
        self.assertIn("comilla", error)

    def test_json_correcto_se_lee(self):
        productos, error = self._leer(json.dumps([BUENO]))
        self.assertIsNone(error)
        self.assertEqual(len(productos), 1)


if __name__ == "__main__":
    unittest.main()
