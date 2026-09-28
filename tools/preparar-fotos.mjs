#!/usr/bin/env node
/**
 * Prepara una foto para la web: la recorta, la reduce y la guarda en WebP.
 *
 *   node tools/preparar-fotos.mjs ORIGEN NOMBRE [--relacion 4:3] [--centro 0.5,0.3]
 *                                              [--recorte x0,y0,x1,y1]
 *
 * Para las fotos de PRODUCTO del catalogo, que son cuadradas y de un solo
 * tamano:
 *
 *   node tools/preparar-fotos.mjs --producto ORIGEN NOMBRE
 *   node tools/preparar-fotos.mjs --producto --lote CARPETA
 *
 *   ORIGEN   la foto tal como llega (JPG, PNG, la que mande el cliente por WhatsApp)
 *   NOMBRE   dónde queda dentro de public/img, sin extensión. Por ejemplo
 *            fotos/fachada-tejares-del-norte
 *
 * HERRAMIENTA LOCAL: se corre en el computador de quien edita, nunca en el
 * servidor. Usa Node y sharp, que ya hacen falta para compilar el sitio
 * (Foto.astro los usa): así el cliente no instala nada aparte, en Windows o
 * en Linux/macOS. Reemplaza a la version anterior en Python, que exigia
 * instalar Python y Pillow por separado — un obstaculo que no tenia ningun
 * otro paso del flujo del cliente.
 *
 * Por qué existe: una foto de celular pesa medio mega y mide 1500 px o más.
 * Subirla tal cual haría lenta la página, sobre todo con datos móviles. Aquí
 * se recorta a la forma que necesita el sitio, se genera una versión chica y
 * una grande (el navegador elige la que le sirve) y se borran los metadatos.
 *
 *   --relacion  forma final: 4:3 (tarjetas), 3:2 (fotos anchas), 16:9, 1:1 (círculos)
 *   --centro    qué parte de la foto conservar al recortar, de 0 a 1 en x,y.
 *               0.5,0.5 es el centro; 0.5,0 es pegado arriba. Por defecto, el centro.
 *   --recorte   caja exacta en píxeles de la foto original. Manda sobre --relacion.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, basename, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// El sitio muestra tarjetas de ~330 px y fotos anchas de ~760 px, y un celular
// de alta densidad necesita ~1,75 veces eso. El escalón de 900 evita que el
// celular tenga que bajar la versión de 1200 cuando le basta con menos.
const ANCHOS = [600, 900, 1200];
const ANCHO_MINIMO = 600;
const CALIDAD = 80;

// Las fotos de producto son cuadradas y de un solo tamano: en la grilla se ven
// a ~330 px y en la ficha a ~600. Con 600 alcanza para las dos.
const ANCHO_PRODUCTO = 600;

// Carpeta de imágenes del sitio, relativa a la raíz del proyecto.
const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const CARPETA_IMG = join(RAIZ, "public", "img");

function leerRelacion(texto) {
  const partes = String(texto ?? "").split(":").map(Number);
  const [ancho, alto] = partes;
  if (partes.length !== 2 || !Number.isFinite(ancho) || !Number.isFinite(alto) || ancho <= 0 || alto <= 0) {
    throw new Error(`La relación '${texto}' no es válida. Se escribe así: 4:3`);
  }
  return ancho / alto;
}

/**
 * La caja {x0, y0, x1, y1} más grande que cabe en la foto con esa relación.
 * Conserva todo el ancho o todo el alto, lo que se pueda, y elige qué parte
 * dejar con `centro`. Nunca se sale de la foto.
 */
export function cajaDeRecorte(ancho, alto, relacion, centro = [0.5, 0.5]) {
  const objetivo = leerRelacion(relacion);

  let anchoCaja, altoCaja;
  if (ancho / alto > objetivo) {
    altoCaja = alto;
    anchoCaja = Math.round(alto * objetivo);
  } else {
    anchoCaja = ancho;
    altoCaja = Math.round(ancho / objetivo);
  }

  const cx = Math.min(Math.max(centro[0], 0), 1);
  const cy = Math.min(Math.max(centro[1], 0), 1);
  const x0 = Math.round((ancho - anchoCaja) * cx);
  const y0 = Math.round((alto - altoCaja) * cy);
  return { x0, y0, x1: x0 + anchoCaja, y1: y0 + altoCaja };
}

/** Los tamaños a generar, sin estirar nunca la foto. */
function anchosDeSalida(anchoRecorte) {
  if (anchoRecorte < ANCHO_MINIMO) {
    throw new Error(
      `La foto es muy pequeña (${anchoRecorte} px de ancho tras recortar): se vería ` +
        `borrosa. Hace falta al menos ${ANCHO_MINIMO} px.`
    );
  }
  // Un tamaño chico solo vale la pena si es claramente más chico que el
  // grande; si se parecen, sería el mismo archivo dos veces.
  const chicos = ANCHOS.filter((w) => w < anchoRecorte * 0.8);
  return [...new Set([...chicos, Math.min(Math.max(...ANCHOS), anchoRecorte)])].sort((a, b) => a - b);
}

/** Recorta y reduce una foto. Devuelve la lista de rutas creadas. */
export async function preparar(origen, nombre, destino = CARPETA_IMG, opciones = {}) {
  const { relacion, centro = [0.5, 0.5], recorte } = opciones;

  if (!existsSync(origen)) {
    throw new Error(`La foto '${origen}' no existe.`);
  }

  // .rotate() sin argumentos lee la orientación EXIF del celular y gira la
  // imagen para que quede derecha; sharp no lo hace solo. El resto de la
  // cadena no vuelve a leer el EXIF, así que la salida nace sin metadatos:
  // no hay que borrarlos aparte.
  let imagen = sharp(origen).rotate();
  const metadatos = await imagen.metadata();
  let ancho = metadatos.width;
  let alto = metadatos.height;
  // Si venía girada 90°/270°, sharp ya intercambió ancho y alto al rotar,
  // pero metadata() sigue reportando los originales: hay que corregirlo.
  if ([5, 6, 7, 8].includes(metadatos.orientation)) [ancho, alto] = [alto, ancho];

  let caja;
  if (recorte) {
    const [x0, y0, x1, y1] = recorte;
    caja = { x0, y0, x1, y1 };
  } else if (relacion) {
    caja = cajaDeRecorte(ancho, alto, relacion, centro);
  } else {
    caja = { x0: 0, y0: 0, x1: ancho, y2: alto, y1: alto };
  }
  imagen = imagen.extract({
    left: caja.x0,
    top: caja.y0,
    width: caja.x1 - caja.x0,
    height: caja.y1 - caja.y0,
  });
  const anchoRecorte = caja.x1 - caja.x0;
  const altoRecorte = caja.y1 - caja.y0;

  const carpetaSalida = join(destino, dirname(nombre));
  await mkdir(carpetaSalida, { recursive: true });
  const base = basename(nombre);

  const archivos = [];
  for (const anchoSalida of anchosDeSalida(anchoRecorte)) {
    const altoSalida = Math.round((altoRecorte * anchoSalida) / anchoRecorte);
    const archivo = join(carpetaSalida, `${base}-${anchoSalida}.webp`);
    const buffer = await imagen.clone().toBuffer(); // .toBuffer() no muta `imagen`, así se reusa el recorte
    await sharp(buffer)
      .resize({ width: anchoSalida, height: altoSalida, fit: "fill" })
      .webp({ quality: CALIDAD, effort: 6 })
      .toFile(archivo);
    archivos.push(archivo);
  }
  return archivos;
}

/**
 * Una foto de PRODUCTO: cuadrada, un solo archivo, con el nombre exacto que
 * lleva el catalogo.
 *
 * Los productos no usan srcset como las fotos del sitio: son imagenes chicas
 * en una grilla, y el catalogo las nombra con un solo archivo
 * ("acetaminofen.webp"). Generar tres tamanos aqui rompería ese modelo.
 */
export async function prepararProducto(origen, nombre, destino = CARPETA_IMG) {
  if (!existsSync(origen)) throw new Error(`La foto '${origen}' no existe.`);

  const base = basename(nombre).replace(/\.webp$/i, "");
  await mkdir(destino, { recursive: true });
  const archivo = join(destino, `${base}.webp`);

  await sharp(origen)
    .rotate()  // endereza lo que venga girado del celular
    .resize({
      width: ANCHO_PRODUCTO,
      height: ANCHO_PRODUCTO,
      fit: "contain",           // cabe entera: un producto no se recorta
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: CALIDAD, effort: 6 })
    .toFile(archivo);

  return archivo;
}

/** Todas las fotos de una carpeta, de una sola vez. */
export async function prepararLote(carpeta, destino = CARPETA_IMG) {
  const entradas = await readdir(carpeta, { withFileTypes: true });
  const fotos = entradas
    .filter((e) => e.isFile() && /\.(jpe?g|png|webp|gif|tiff?|avif)$/i.test(e.name))
    .map((e) => e.name);

  const hechos = [];
  for (const foto of fotos) {
    const nombre = foto.replace(/\.[^.]+$/, "");
    hechos.push(await prepararProducto(join(carpeta, foto), nombre, destino));
  }
  return hechos;
}

async function main(argv) {
  // Modo producto: cuadrado, un solo archivo. Separado del modo normal porque
  // las fotos del sitio y las del catalogo tienen modelos distintos.
  if (argv[0] === "--producto") {
    const resto = argv.slice(1);
    try {
      if (resto[0] === "--lote") {
        const carpeta = resto[1];
        if (!carpeta) { console.log("Uso: --producto --lote CARPETA"); return 1; }
        const hechos = await prepararLote(carpeta);
        if (hechos.length === 0) { console.log("No encontre fotos en esa carpeta."); return 1; }
        for (const archivo of hechos) {
          const kb = Math.round((await sharp(archivo).toBuffer()).length / 1024);
          console.log(`  ${relative(CARPETA_IMG, archivo)}  ${kb} KB`);
        }
        console.log(`\n${hechos.length} foto(s) listas. En el catalogo van en "imagenes".`);
        return 0;
      }
      const [origen, nombre] = resto;
      if (!origen || !nombre) {
        console.log("Uso: node tools/preparar-fotos.mjs --producto ORIGEN NOMBRE");
        console.log("     node tools/preparar-fotos.mjs --producto --lote CARPETA");
        return 1;
      }
      const archivo = await prepararProducto(origen, nombre.replace(/\\/g, "/"));
      const meta = await sharp(archivo).metadata();
      const kb = Math.round((await sharp(archivo).toBuffer()).length / 1024);
      console.log(`  ${relative(CARPETA_IMG, archivo)}  ${meta.width}x${meta.height}  ${kb} KB`);
      console.log(`\nEn el catalogo va como  "imagenes": ["${basename(archivo)}"]`);
      return 0;
    } catch (error) {
      console.log(`No se pudo preparar la foto: ${error.message}`);
      return 1;
    }
  }

  const [origen, ...resto0] = argv;
  let [nombre, ...resto] = resto0;
  if (!origen || !nombre) {
    console.log(
      "Uso: node tools/preparar-fotos.mjs ORIGEN NOMBRE [--relacion 4:3] " +
        "[--centro 0.5,0.5] [--recorte x0,y0,x1,y1]"
    );
    return 1;
  }

  const args = Object.fromEntries(
    resto.reduce((pares, valor, i, arr) => {
      if (valor.startsWith("--")) pares.push([valor.slice(2), arr[i + 1]]);
      return pares;
    }, [])
  );
  // En Windows es natural escribir la ruta con "\\". El nombre que va al JSON
  // del sitio siempre lleva "/", asi que se normaliza aqui.
  nombre = nombre.replace(/\\/g, "/");
  const centro = args.centro ? args.centro.split(",").map(Number) : [0.5, 0.5];
  const recorte = args.recorte ? args.recorte.split(",").map(Number) : undefined;

  try {
    const archivos = await preparar(origen, nombre, CARPETA_IMG, {
      relacion: args.relacion,
      centro,
      recorte,
    });
    for (const archivo of archivos) {
      const meta = await sharp(archivo).metadata();
      const kb = Math.round((await sharp(archivo).toBuffer()).length / 1024);
      console.log(`  ${relative(CARPETA_IMG, archivo)}  ${meta.width}x${meta.height}  ${kb} KB`);
    }
    console.log(`\nEn el sitio se usa como  "foto": "${nombre}"`);
    return 0;
  } catch (error) {
    console.log(`No se pudo preparar la foto: ${error.message}`);
    return 1;
  }
}

// Comparar con pathToFileURL, NO con `file://${process.argv[1]}`.
// En Windows argv[1] es "C:\\sitios\\..." y import.meta.url es
// "file:///C:/sitios/...": la comparacion de texto nunca coincide y el script
// se cierra sin hacer nada y sin decir por que. Probado en preparar-fotos.test.mjs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((codigo) => process.exit(codigo));
}
