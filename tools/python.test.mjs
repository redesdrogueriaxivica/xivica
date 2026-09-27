/**
 * Pruebas del lanzador de Python.
 *   node --test tools/python.test.mjs
 *
 * Lo que se vigila aqui es la portabilidad: el cliente trabaja en Windows y
 * nosotros en Linux, y el nombre del comando no coincide.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buscarPython } from "./python.mjs";

test("encuentra un Python 3 en este equipo", () => {
  const encontrado = buscarPython();
  assert.ok(encontrado, "no se encontro ningun Python 3");
  const [comando, previos, version] = encontrado;
  assert.ok(typeof comando === "string" && comando.length > 0);
  assert.ok(Array.isArray(previos));
  assert.match(version, /^Python 3\./);
});

test("prueba los tres nombres: python3, python y el lanzador py de Windows", async () => {
  const fuente = await readFile(new URL("python.mjs", import.meta.url), "utf8");
  for (const candidato of ['"python3"', '"python"', '"py"']) {
    assert.ok(fuente.includes(candidato), `falta el candidato ${candidato}`);
  }
});

test("descarta lo que no responda 'Python 3' (el alias de Microsoft Store)", () => {
  // Un comando que existe y responde 0, pero no es Python: no debe aceptarse.
  const falso = process.platform === "win32" ? [["cmd", ["/c", "echo"]]] : [["echo", []]];
  assert.equal(buscarPython(falso), null);
});

test("no queda la comparacion de rutas que falla en Windows", async () => {
  const fuente = await readFile(new URL("python.mjs", import.meta.url), "utf8");
  assert.match(fuente, /pathToFileURL\(process\.argv\[1\]\)\.href/);
  assert.doesNotMatch(fuente, /=== `file:\/\/\$\{process\.argv\[1\]\}`/);
});

// --- El Python embebido de otro programa ------------------------------------
// Caso real encontrado en la primera prueba en Windows: el Python 3.11 que
// viene dentro de Inkscape quedaba primero en el PATH. Responde la version
// perfectamente, pero no trae pip, asi que openpyxl no se puede instalar y la
// planilla de Excel queda inservible. doctor.ps1 lo daba por bueno en verde.

import { mkdtemp, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Crea un ejecutable que dice ser Python 3 pero no tiene pip. */
async function pythonFalso(version = "Python 3.11.6") {
  const carpeta = await mkdtemp(join(tmpdir(), "py-falso-"));
  const ruta = join(carpeta, "python-sin-pip");
  await writeFile(
    ruta,
    `#!/bin/sh
if [ "$1" = "--version" ]; then echo "${version}"; exit 0; fi
echo "No module named pip" 1>&2; exit 1
`
  );
  await chmod(ruta, 0o755);
  return ruta;
}

test("descarta el Python que responde la version pero no tiene pip", async () => {
  const falso = await pythonFalso();
  assert.equal(
    buscarPython([[falso, []]], { exigirPip: true }),
    null,
    "acepto un Python sin pip: openpyxl no se podria instalar"
  );
});

test("si no hay ninguno con pip, usa el que haya en vez de rendirse", async () => {
  const falso = await pythonFalso();
  const encontrado = buscarPython([[falso, []]]);
  assert.ok(encontrado, "deberia caer al de respaldo: validar.py solo usa la estandar");
  assert.match(encontrado[2], /^Python 3\./);
});

test("prefiere el que tiene pip aunque el otro este primero", async () => {
  const falso = await pythonFalso();
  const encontrado = buscarPython([[falso, []], ["python3", []]]);
  assert.notEqual(encontrado[0], falso, "eligio el que no tiene pip estando primero");
});
