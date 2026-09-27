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
 * Cuidado con Windows: `python` puede existir y NO ser Python, sino el alias
 * de Microsoft Store que abre la tienda. Por eso no basta con que el comando
 * exista: se le pide la version y se comprueba que responda "Python 3".
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CANDIDATOS = [
  ["python3", []],
  ["python", []],
  ["py", ["-3"]], // el lanzador oficial de Windows
];

/** Devuelve [comando, argumentos] del primer Python 3 de verdad que encuentre. */
export function buscarPython(candidatos = CANDIDATOS) {
  for (const [comando, previos] of candidatos) {
    const prueba = spawnSync(comando, [...previos, "--version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (prueba.error || prueba.status !== 0) continue;
    const version = `${prueba.stdout || ""}${prueba.stderr || ""}`.trim();
    // El alias de Microsoft Store responde vacio o abre la tienda: no pasa de aqui.
    if (/^Python 3\./.test(version)) return [comando, previos, version];
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
  const resultado = spawnSync(comando, [...previos, ...argv], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return resultado.status ?? 1;
}

// Se compara con pathToFileURL, no con texto: en Windows argv[1] es
// "C:\\sitios\\..." y import.meta.url es "file:///C:/sitios/...", asi que
// comparar cadenas nunca coincide y el comando se cerraria sin hacer nada.
// El guard de argv[1] es para cuando este archivo se importa como modulo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
