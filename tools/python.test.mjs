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
