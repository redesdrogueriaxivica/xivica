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
import { spawnSync } from "node:child_process";

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
//
// El Python falso se escribe en Node y se lanza con el propio node, NO como
// script de shell: un "#!/bin/sh" no se ejecuta en Windows, asi que las
// pruebas pasaban sin probar nada — y una de ellas salia en verde por el
// motivo equivocado, porque el falso ni siquiera arrancaba.

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Un ejecutable que dice ser Python 3 y no tiene pip. Funciona en todo sistema. */
async function pythonFalso(version = "Python 3.11.6") {
  const carpeta = await mkdtemp(join(tmpdir(), "py-falso-"));
  const ruta = join(carpeta, "python-sin-pip.mjs");
  await writeFile(
    ruta,
    `const args = process.argv.slice(2);
if (args[0] === "--version") { console.log(${JSON.stringify(version)}); process.exit(0); }
console.error("No module named pip");
process.exit(1);
`
  );
  // Se invoca con el propio node: [comando, argumentosPrevios]
  return [process.execPath, [ruta]];
}

test("el Python falso responde la version y no tiene pip", async () => {
  // Si esta prueba falla, las tres siguientes no significan nada.
  const [cmd, pre] = await pythonFalso();
  const r = spawnSync(cmd, [...pre, "--version"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(`${r.stdout}`.trim(), /^Python 3\./);
  const pip = spawnSync(cmd, [...pre, "-m", "pip", "--version"], { encoding: "utf8" });
  assert.notEqual(pip.status, 0, "el falso no deberia tener pip");
});

test("descarta el Python que responde la version pero no tiene pip", async () => {
  const falso = await pythonFalso();
  assert.equal(
    buscarPython([falso], { exigirPip: true }),
    null,
    "acepto un Python sin pip: openpyxl no se podria instalar"
  );
});

test("si no hay ninguno con pip, usa el que haya en vez de rendirse", async () => {
  const falso = await pythonFalso();
  const encontrado = buscarPython([falso]);
  assert.ok(encontrado, "deberia caer al de respaldo: validar.py solo usa la estandar");
  assert.match(encontrado[2], /^Python 3\./);
});

test("prefiere el que tiene pip aunque el otro este primero", async () => {
  const falso = await pythonFalso();
  const encontrado = buscarPython([falso, ["python3", []], ["py", ["-3"]], ["python", []]]);
  assert.notEqual(encontrado[0], falso[0] + falso[1][0], "eligio el que no tiene pip");
  const pip = spawnSync(encontrado[0], [...encontrado[1], "-m", "pip", "--version"], { encoding: "utf8" });
  assert.equal(pip.status, 0, "el elegido tampoco tiene pip");
});

// --- Rutas con espacios -----------------------------------------------------
// Con `shell: true`, Windows junta los argumentos en una linea y la vuelve a
// interpretar, asi que "C:\Mis documentos\x.py" llegaba como "C:\Mis".
// Rompia `npm run validar` en cualquier carpeta con un espacio en el nombre.

test("no parte las rutas con espacios", async () => {
  const carpeta = await mkdtemp(join(tmpdir(), "con espacios-"));
  const script = join(carpeta, "un archivo.py");
  await writeFile(script, 'print("ok con espacios")\n');

  const py = buscarPython();
  assert.ok(py, "hace falta un Python para esta prueba");
  const r = spawnSync(py[0], [...py[1], script], { encoding: "utf8" });
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(`${r.stdout}`, /ok con espacios/);
});

test("el lanzador no usa shell, que es lo que partia las rutas", async () => {
  const fuente = await readFile(new URL("python.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(
    fuente,
    /shell:\s*process\.platform/,
    "volvio el shell: en Windows parte cualquier ruta con espacios"
  );
});
