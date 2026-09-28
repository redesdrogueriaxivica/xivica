/**
 * Pruebas de tools/preparar-fotos.mjs.
 *   node --test tools/preparar-fotos.test.mjs
 *
 * Reemplaza a la version en Python (preparar_fotos.py). Se paso a Node porque
 * es el unico lenguaje que el cliente instala seguro en Windows y en
 * Linux/macOS: sharp ya es dependencia del sitio (Foto.astro la usa al
 * compilar). Python no formaba parte del flujo del cliente en ningun otro
 * lado, y pedirle instalarlo solo para esto era un obstaculo de mas.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// sharp guarda en cache los archivos que abre. En Windows eso los deja
// tomados, y borrar la carpeta temporal da EBUSY. Apagar el cache los suelta.
// Es solo para las pruebas: en la herramienta de verdad el cache ayuda y el
// proceso termina enseguida.
sharp.cache(false);

/**
 * Borra la carpeta temporal sin que la prueba dependa de ello.
 *
 * Limpiar NO es lo que se esta probando. Si Windows todavia tiene un archivo
 * tomado, se deja y el sistema lo limpia solo: es preferible a que la prueba
 * falle —o peor, a que se quede colgada— por algo que no importa.
 *
 * Aqui estuvo un `rm` con maxRetries que convirtio un EBUSY rapido y visible
 * en un cuelgue indefinido. Un fallo lento es peor que uno rapido.
 */
async function limpiar(dir) {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Da igual: es una carpeta temporal.
  }
}

import { cajaDeRecorte, preparar } from "./preparar-fotos.mjs";

async function fotoDePrueba(carpeta, ancho, alto, { orientacion, nombre = "origen.jpg" } = {}) {
  const ruta = join(carpeta, nombre);
  let imagen = sharp({
    create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 120, b: 40 } },
  });
  if (orientacion) imagen = imagen.withMetadata({ orientation: orientacion });
  await imagen.jpeg().toFile(ruta);
  return ruta;
}

test("cuadrada a 4:3 conserva el ancho y centra", () => {
  const { x0, y0, x1, y1 } = cajaDeRecorte(1500, 1500, "4:3");
  assert.equal(x0, 0);
  assert.equal(x1, 1500);
  assert.ok(Math.abs((y1 - y0) / (x1 - x0) - 3 / 4) < 0.01);
  assert.ok(Math.abs(y0 - (1500 - y1)) <= 1); // centrada
});

test("horizontal a cuadrado conserva el alto y centra", () => {
  const { x0, y0, x1, y1 } = cajaDeRecorte(1600, 900, "1:1");
  assert.equal(y0, 0);
  assert.equal(y1, 900);
  assert.equal(x1 - x0, 900);
  assert.ok(Math.abs(x0 - (1600 - x1)) <= 1);
});

test("el centro desplaza el recorte", () => {
  // centro (0.5, 0) = pegado arriba: lo que importa esta en la parte alta
  const { y0 } = cajaDeRecorte(1500, 1500, "4:3", [0.5, 0]);
  assert.equal(y0, 0);
});

test("el recorte nunca se sale de la foto", () => {
  for (const centro of [[0, 0], [1, 1], [0.5, 1], [1, 0.5]]) {
    const { x0, y0, x1, y1 } = cajaDeRecorte(1500, 1500, "16:9", centro);
    assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 1500 && y1 <= 1500);
  }
});

test("una relación mal escrita es un error claro", () => {
  assert.throws(() => cajaDeRecorte(1500, 1500, "cuadrado"), /relación/);
  assert.throws(() => cajaDeRecorte(1500, 1500, "0:3"), /relación/);
});

test("genera tres tamaños en WebP con la relación pedida", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 2000, 1500);
    const salida = join(dir, "img");
    const archivos = await preparar(origen, "fotos/prueba", salida, { relacion: "4:3" });

    // basename, no split("/"): en Windows el separador es "\\".
    const nombres = archivos.map((a) => basename(a)).sort();
    assert.deepEqual(nombres, ["prueba-1200.webp", "prueba-600.webp", "prueba-900.webp"]);

    for (const archivo of archivos) {
      const im = sharp(archivo);
      const meta = await im.metadata();
      assert.equal(meta.format, "webp");
      assert.ok(Math.abs(meta.height / meta.width - 3 / 4) < 0.01);
    }
    const grande = await sharp(join(salida, "fotos", "prueba-1200.webp")).metadata();
    assert.equal(grande.width, 1200);
  } finally {
    await limpiar(dir);
  }
});

test("no amplía una foto pequeña", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 900, 900);
    const archivos = await preparar(origen, "fotos/chica", join(dir, "img"));
    const anchos = (await Promise.all(archivos.map((a) => sharp(a).metadata())))
      .map((m) => m.width)
      .sort((a, b) => a - b);
    assert.deepEqual(anchos, [600, 900]); // el grande es el original, no 1200 estirado
  } finally {
    await limpiar(dir);
  }
});

test("si el chico casi no se diferencia del grande, no se genera", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 650, 650);
    const archivos = await preparar(origen, "fotos/casi", join(dir, "img"));
    const meta = await sharp(archivos[0]).metadata();
    assert.equal(archivos.length, 1);
    assert.equal(meta.width, 650);
  } finally {
    await limpiar(dir);
  }
});

test("una foto demasiado pequeña se rechaza", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 500, 500);
    await assert.rejects(preparar(origen, "fotos/minima", join(dir, "img")), /pequeña/);
  } finally {
    await limpiar(dir);
  }
});

test("el recorte en píxeles manda sobre la relación", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 2000, 1500);
    const archivos = await preparar(origen, "fotos/caja", join(dir, "img"), {
      recorte: [500, 100, 1500, 1100],
      relacion: "16:9", // se ignora: el recorte manda
    });
    const anchos = await Promise.all(archivos.map((a) => sharp(a).metadata()));
    const grande = anchos.reduce((m, a) => (a.width > m.width ? a : m));
    assert.equal(grande.width, 1000);
    assert.equal(grande.height, 1000);
  } finally {
    await limpiar(dir);
  }
});

test("respeta la orientación de los celulares", async () => {
  // Orientation=6: el celular guardó la foto girada. Sin corregirla, una
  // foto vertical saldría acostada en la web.
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 2000, 1400, { orientacion: 6 });
    const archivos = await preparar(origen, "fotos/girada", join(dir, "img"));
    const anchos = await Promise.all(archivos.map((a) => sharp(a).metadata()));
    const grande = anchos.reduce((m, a) => (a.width > m.width ? a : m));
    assert.ok(grande.height > grande.width);
  } finally {
    await limpiar(dir);
  }
});

test("no deja metadatos de la foto original", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 2000, 1400, { orientacion: 6 });
    const archivos = await preparar(origen, "fotos/limpia", join(dir, "img"));
    for (const archivo of archivos) {
      const meta = await sharp(archivo).metadata();
      assert.ok(!meta.exif, `${archivo} no debería tener exif`);
    }
  } finally {
    await limpiar(dir);
  }
});

test("el origen inexistente es un error claro", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    await assert.rejects(
      preparar(join(dir, "nada.jpg"), "fotos/x", join(dir, "img")),
      /no existe/
    );
  } finally {
    await limpiar(dir);
  }
});

test("crea la carpeta de destino si no existe", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fotos-"));
  try {
    const origen = await fotoDePrueba(dir, 900, 900);
    await preparar(origen, "fotos/nueva/nombre", join(dir, "img"));
    const listado = await readdir(join(dir, "img", "fotos", "nueva"));
    assert.ok(listado.length > 0);
  } finally {
    await limpiar(dir);
  }
});

// --- Portabilidad a Windows -------------------------------------------------
// El cliente trabaja en Windows. Estas dos pruebas cubren el punto de entrada,
// que es lo que no tenia prueba y por eso el script se cerraba en silencio alli.

test("el punto de entrada se compara con pathToFileURL, no con texto", async () => {
  const fuente = await readFile(new URL("preparar-fotos.mjs", import.meta.url), "utf8");
  assert.match(fuente, /import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href/);
  assert.doesNotMatch(
    fuente,
    /import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`/,
    "En Windows argv[1] es C:\\... y import.meta.url es file:///C:/...: nunca coinciden"
  );
});

test("pathToFileURL resuelve igual la ruta de cada sistema", () => {
  // En POSIX se comprueba de verdad; la forma de Windows se documenta arriba.
  const ruta = fileURLToPath(new URL("preparar-fotos.mjs", import.meta.url));
  assert.equal(pathToFileURL(ruta).href, new URL("preparar-fotos.mjs", import.meta.url).href);
});

// --- Red de seguridad -------------------------------------------------------

test("el borrado de temporales no reintenta: en Windows se cuelga", async () => {
  const fuente = await readFile(new URL("preparar-fotos.test.mjs", import.meta.url), "utf8");
  const enPruebas = fuente.split("// --- Red de seguridad")[0];
  // Se busca la opcion escrita en codigo (`maxRetries:`), no la palabra:
  // el comentario de limpiar() la menciona a proposito para explicar por que
  // no esta.
  assert.doesNotMatch(
    enPruebas,
    /maxRetries\s*:/,
    "volvio el rm con reintentos: con un archivo tomado por sharp no falla, se cuelga"
  );
  assert.match(enPruebas, /sharp\.cache\(false\)/, "falta apagar el cache de sharp");
});

