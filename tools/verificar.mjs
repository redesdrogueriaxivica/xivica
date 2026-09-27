#!/usr/bin/env node
/**
 * Revisa que todo el sitio este sano, de una sola vez.
 *
 *   npm run verificar
 *
 * Existe para que el dia de la instalacion no haya que acordarse de cuatro
 * comandos distintos ni de como se llama Python en este sistema. Corre igual
 * en Windows que en Linux, porque lo unico que hace falta es Node.
 *
 * Lo que NO hace: publicar, guardar cambios ni tocar nada. Solo mira.
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const VERDE = "\x1b[32m", ROJO = "\x1b[31m", GRIS = "\x1b[90m", FIN = "\x1b[0m";

const REVISIONES = [
  {
    nombre: "Las pruebas del sitio",
    comando: ["node", ["--test", "src/scripts/*.test.js", "tools/*.test.mjs"]],
    porque: "Comprueban el buscador, el carrito y las fotos.",
  },
  {
    nombre: "El catalogo",
    comando: ["node", ["tools/python.mjs", "tools/validar.py",
                       "src/datos/productos.json", "public/img"]],
    porque: "Precios, ofertas, categorias y que cada foto exista de verdad.",
  },
  {
    nombre: "Los colores",
    comando: ["node", ["tools/python.mjs", "tools/revisar-css.py"]],
    porque: "Un color mal escrito no da error: simplemente deja de verse.",
  },
];

function correr({ nombre, comando: [cmd, args], porque }) {
  process.stdout.write(`  ${nombre}... `);
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const salida = `${r.stdout || ""}${r.stderr || ""}`.trim();
  if (!r.error && r.status === 0) {
    console.log(`${VERDE}bien${FIN}`);
    return { ok: true };
  }
  console.log(`${ROJO}falla${FIN}`);
  console.log(`${GRIS}    ${porque}${FIN}`);
  return { ok: false, nombre, salida };
}

function main() {
  console.log("\n  Revision del sitio\n");
  const fallos = REVISIONES.map(correr).filter((r) => !r.ok);

  if (fallos.length === 0) {
    console.log(`\n  ${VERDE}Todo en orden.${FIN} El sitio se puede publicar.\n`);
    return 0;
  }

  for (const f of fallos) {
    console.log(`\n${GRIS}${"-".repeat(60)}${FIN}`);
    console.log(`  ${ROJO}${f.nombre}${FIN}\n`);
    console.log(f.salida || "(sin mensaje)");
  }
  console.log(
    `\n  ${ROJO}${fallos.length} revision(es) con problemas.${FIN}\n` +
      "  El sitio publicado sigue como estaba: no se rompio nada.\n" +
      "  Corrige lo de arriba y vuelve a ejecutar: npm run verificar\n"
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
