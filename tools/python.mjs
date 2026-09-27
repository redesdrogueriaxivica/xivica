#!/usr/bin/env node
/**
 * Lanza una herramienta de Python, en Windows o en Linux, sin que nadie tenga
 * que saber en cual esta.
 *
 *   node tools/python.mjs tools/validar.py src/datos/productos.json public/img
 *
 * Por que existe: el comando no se llama igual en los dos sistemas. En
 * Linux/macOS es `python3` y `python` no existe; en Windows es `python` (o el
 * lanzador `py`) y `python3` no existe. Escribir uno u otro en la
 * documentacion rompe el sistema contrario, y hacer que el asistente adivine
 * es una decision que algun dia sale mal.
 *
 * Node si se llama igual en todas partes, y ya esta instalado porque el sitio
 * lo necesita para la vista previa. Asi que el que decide es este archivo, una
 * sola vez y en un solo lugar.
 *
 * Dos trampas reales de Windows, las dos encontradas en equipos de verdad:
 *
 *  - `python` puede existir y NO ser Python, sino el alias de Microsoft Store
 *    que abre la tienda sin ejecutar nada.
 *  - Puede responder "Python 3.11" perfectamente y ser un Python EMBEBIDO
 *    dentro de otro programa (Inkscape, GIMP, Krita) que quedo primero en el
 *    PATH. Ese no trae pip, asi que `openpyxl` no se puede instalar y la
 *    planilla de Excel no se puede leer.
 *
 * Por eso se prefiere el que ademas responda `-m pip --version`. Si ninguno
 * tiene pip se usa el que haya, porque revisar el catalogo solo necesita la
 * biblioteca estandar; quien necesite mas lo sabra por su propio error.
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CANDIDATOS = [
  ["python3", []],
  ["python", []],
  ["py", ["-3"]], // el lanzador oficial de Windows
];

const salida = (r) => `${r.stdout || ""}${r.stderr || ""}`.trim();

function responde(comando, previos, args) {
  const r = spawnSync(comando, [...previos, ...args], { encoding: "utf8" });
  if (r.error || r.status !== 0) return null;
  return salida(r);
}

/**
 * Devuelve [comando, argumentos, version] del mejor Python 3 que encuentre.
 *
 * Dos pasadas: primero los que tienen pip, que son los unicos capaces de
 * instalar lo que hace falta; si ninguno lo tiene, se acepta cualquier
 * Python 3.
 */
export function buscarPython(candidatos = CANDIDATOS, { exigirPip } = {}) {
  const pasadas = exigirPip === undefined ? [true, false] : [exigirPip];
  for (const conPip of pasadas) {
    for (const [comando, previos] of candidatos) {
      const version = responde(comando, previos, ["--version"]);
      // El alias de Microsoft Store responde vacio o abre la tienda.
      if (!version || !/^Python 3\./.test(version)) continue;
      if (conPip) {
        const pip = responde(comando, previos, ["-m", "pip", "--version"]);
        if (!pip || !/^pip /.test(pip)) continue;
      }
      return [comando, previos, version];
    }
  }
  return null;
}

function main(argv) {
  if (argv.length === 0) {
    console.log("Uso: node tools/python.mjs <archivo.py> [argumentos...]");
    return 1;
  }

  const encontrado = buscarPython();
  if (!encontrado) {
    console.log("No encontre Python en este equipo.");
    console.log("");
    console.log("Se necesita solo para revisar el catalogo y para la planilla de Excel;");
    console.log("el resto del sitio funciona sin el.");
    console.log("");
    console.log("  Windows:       .\\instalar.ps1   (lo instala solo)");
    console.log("  Linux o macOS: bash instalar.sh");
    console.log("");
    console.log("Si ya lo instalaste, cierra esta ventana y abre una nueva.");
    return 1;
  }

  const [comando, previos] = encontrado;
  // SIN shell, a proposito. Con `shell: true` Windows junta los argumentos en
  // una sola linea y la vuelve a interpretar, asi que parte en dos cualquier
  // ruta con espacios: "C:\\Mis documentos\\x.py" llega como "C:\\Mis".
  // `py`, `python` y `python3` son ejecutables de verdad y no necesitan shell.
  const resultado = spawnSync(comando, [...previos, ...argv], { stdio: "inherit" });
  return resultado.status ?? 1;
}

// Se compara con pathToFileURL, no con texto: en Windows argv[1] es
// "C:\\sitios\\..." y import.meta.url es "file:///C:/sitios/...", asi que
// comparar cadenas nunca coincide y el comando se cerraria sin hacer nada.
// El guard de argv[1] es para cuando este archivo se importa como modulo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
