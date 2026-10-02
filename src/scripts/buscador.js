/**
 * Desplegable del buscador de la cabecera.
 *
 * El catalogo se descarga la primera vez que alguien escribe, no al cargar la
 * pagina: quien entra a leer los horarios no tiene por que pagar la descarga
 * de un buscador que no va a usar.
 */
import { construirIndice, buscar } from "./busqueda.js";
import { pesos } from "./formato.js";
import { enlaceWhatsApp } from "./pedido.js";

const RESULTADOS = 6;
const ESPERA = 140; // ms tras la ultima tecla, para no buscar en cada letra

let indice = null;
let cargando = null;

async function obtenerIndice() {
  if (indice) return indice;
  if (!cargando) {
    const base = document.documentElement.dataset.base || "/";
    cargando = Promise.all([
      fetch(`${base}datos/catalogo.json`).then((r) => r.json()),
      fetch(`${base}datos/sinonimos.json`).then((r) => r.json()).catch(() => ({})),
    ]).then(([productos, sinonimos]) => {
      indice = construirIndice(productos, sinonimos);
      return indice;
    });
  }
  return cargando;
}

function pintarResultados(caja, productos, consulta, base) {
  if (productos.length === 0) {
    caja.innerHTML = `
      <p class="sug-vacio">
        No encontramos <strong>${escapar(consulta)}</strong>.
        <a href="${enlaceWhatsApp(caja.dataset.whatsapp, `Hola, ¿tienen ${consulta}?`)}"
          target="_blank" rel="noopener">Pregúntanos por WhatsApp</a>
      </p>`;
    return;
  }

  caja.innerHTML =
    productos
      .map(
        (producto) => `
      <a class="sug" href="${base}producto/${producto.slug}" role="option">
        <img src="${base}img/${producto.imagenes[0]}" alt="" width="44" height="44" loading="lazy">
        <span class="sug-datos">
          <span class="sug-titulo">${escapar(producto.titulo)}</span>
          ${producto.presentacion ? `<small>${escapar(producto.presentacion)}</small>` : ""}
        </span>
        <span class="sug-precio">${pesos(producto.precio)}</span>
      </a>`
      )
      .join("") +
    `<a class="sug-todos" href="${base}catalogo?q=${encodeURIComponent(consulta)}">
       Ver todos los resultados de "${escapar(consulta)}"
     </a>`;
}

const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

export function montarBuscador() {
  const campo = document.getElementById("campoBuscar");
  const caja = document.getElementById("resultadosBuscador");
  if (!campo || !caja) return;

  const base = document.documentElement.dataset.base || "/";
  // aria-expanded vive en el envoltorio con role="combobox", no en el input.
  const combo = document.getElementById("cajaBuscador");
  let temporizador = null;
  let posicion = -1;

  const cerrar = () => {
    caja.hidden = true;
    combo?.setAttribute("aria-expanded", "false");
    posicion = -1;
  };

  const moverPor = (paso) => {
    const opciones = [...caja.querySelectorAll(".sug")];
    if (opciones.length === 0) return;
    posicion = (posicion + paso + opciones.length) % opciones.length;
    opciones.forEach((o, i) => o.classList.toggle("activa", i === posicion));
    opciones[posicion].scrollIntoView({ block: "nearest" });
  };

  campo.addEventListener("input", () => {
    clearTimeout(temporizador);
    const consulta = campo.value.trim();

    if (consulta.length < 2) return cerrar();

    temporizador = setTimeout(async () => {
      const idx = await obtenerIndice();
      pintarResultados(caja, buscar(idx, consulta, { limite: RESULTADOS }), consulta, base);
      caja.hidden = false;
      combo?.setAttribute("aria-expanded", "true");
      posicion = -1;
    }, ESPERA);
  });

  campo.addEventListener("keydown", (evento) => {
    if (caja.hidden) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      moverPor(1);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      moverPor(-1);
    } else if (evento.key === "Enter" && posicion >= 0) {
      evento.preventDefault();
      caja.querySelectorAll(".sug")[posicion].click();
    } else if (evento.key === "Escape") {
      cerrar();
      campo.blur();
    }
  });

  // Cerrar al tocar fuera, pero no al tocar dentro del propio desplegable.
  document.addEventListener("click", (evento) => {
    if (!caja.contains(evento.target) && evento.target !== campo) cerrar();
  });

  // Descargar el catalogo en cuanto se enfoca el campo: para cuando la persona
  // termine de escribir la primera palabra, ya esta listo.
  campo.addEventListener("focus", obtenerIndice, { once: true });
}
