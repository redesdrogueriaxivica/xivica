/**
 * Selector de sede junto al logo: muestra las tres sedes y, al elegir una,
 * abre su WhatsApp. Recuerda la elección para ofrecerla primero en el pedido.
 */
import { numeroWhatsApp } from "./pedido.js";

export function montarSelectorSede() {
  const boton = document.getElementById("elegirSede");
  const menu = document.getElementById("menuSedes");
  const etiqueta = document.getElementById("sedeElegida");
  if (!boton || !menu) return;

  const recordar = (id) => {
    try {
      localStorage.setItem("xivica-sede", id);
    } catch {
      /* sin memoria: igual se abre el WhatsApp de la sede */
    }
  };

  const abrir = () => {
    menu.hidden = false;
    boton.setAttribute("aria-expanded", "true");
  };
  const cerrar = () => {
    menu.hidden = true;
    boton.setAttribute("aria-expanded", "false");
  };

  // Si ya había elegido antes, el botón muestra esa sede.
  try {
    const id = localStorage.getItem("xivica-sede");
    const opcion = id && menu.querySelector(`[data-sede-id="${id}"]`);
    if (opcion && etiqueta) etiqueta.textContent = opcion.dataset.sedeNombre;
  } catch {
    /* se muestra la ciudad, como siempre */
  }

  boton.addEventListener("click", (evento) => {
    evento.stopPropagation();
    menu.hidden ? abrir() : cerrar();
  });

  menu.addEventListener("click", (evento) => {
    const opcion = evento.target.closest("[data-sede-id]");
    if (!opcion) return;
    recordar(opcion.dataset.sedeId);
    if (etiqueta) etiqueta.textContent = opcion.dataset.sedeNombre;
    cerrar();
    window.open(`https://wa.me/${numeroWhatsApp(opcion.dataset.sedeTelefono)}`, "_blank", "noopener");
  });

  document.addEventListener("click", (evento) => {
    if (!evento.target.closest(".pastilla-contenedor")) cerrar();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      cerrar();
      boton.focus();
    }
  });
}
