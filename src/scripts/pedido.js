/**
 * El pedido: que hay dentro, cuanto suma y como se convierte en un mensaje
 * de WhatsApp.
 *
 * Esta separado de la interfaz a proposito, para poder probarlo sin navegador.
 * Todo lo que toca el DOM vive en carrito.js.
 */
import { pesos } from "./formato.js";

export function crearPedido(opciones = {}) {
  const { envioGratisDesde = 60000, alCambiar = () => {} } = opciones;

  let lineas = [];

  const avisar = () => alCambiar(api);

  const api = {
    lineas: () => lineas.map((l) => ({ ...l })),

    total: () => lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0),

    unidades: () => lineas.reduce((suma, l) => suma + l.cantidad, 0),

    agregar(producto, cantidad = 1) {
      const existente = lineas.find((l) => l.slug === producto.slug);
      if (existente) {
        existente.cantidad += cantidad;
      } else {
        lineas.push({
          slug: producto.slug,
          titulo: producto.titulo,
          precio: Number(producto.precio),
          imagen: producto.imagen,
          cantidad,
        });
      }
      avisar();
      return api;
    },

    cambiarCantidad(slug, cantidad) {
      const linea = lineas.find((l) => l.slug === slug);
      if (!linea) return api;
      if (cantidad <= 0) {
        lineas = lineas.filter((l) => l.slug !== slug);
      } else {
        linea.cantidad = cantidad;
      }
      avisar();
      return api;
    },

    quitar: (slug) => api.cambiarCantidad(slug, 0),

    vaciar() {
      lineas = [];
      avisar();
      return api;
    },

    envioGratis: () => api.total() >= envioGratisDesde,

    faltaParaEnvioGratis: () => Math.max(0, envioGratisDesde - api.total()),

    // Para guardar y recuperar del navegador
    exportar: () => lineas.map((l) => ({ ...l })),
    importar(guardadas) {
      if (Array.isArray(guardadas)) {
        lineas = guardadas.filter(
          (l) => l && l.slug && Number.isFinite(Number(l.precio)) && l.cantidad > 0
        );
        avisar();
      }
      return api;
    },
  };

  return api;
}

/**
 * Arma el mensaje que se envia por WhatsApp.
 *
 * Se escribe pensando en quien lo recibe: la persona que atiende la drogueria
 * tiene que poder leerlo, entenderlo y despacharlo sin preguntar nada.
 */
export function armarMensaje(pedido, datos) {
  const lineas = pedido.lineas();
  if (lineas.length === 0) {
    throw new Error("El pedido está vacío");
  }

  const partes = ["*Nuevo pedido — Droguería Xivica*", ""];

  for (const linea of lineas) {
    partes.push(`• ${linea.titulo}`);
    partes.push(`   x${linea.cantidad} · ${pesos(linea.precio * linea.cantidad)}`);
  }

  partes.push("");
  partes.push(`*Total: ${pesos(pedido.total())}*`);
  if (pedido.envioGratis()) partes.push("Domicilio gratis");
  partes.push("");
  partes.push("*Datos de entrega*");
  if (datos.sede) partes.push(`Sede: ${datos.sede}`);
  partes.push(`Nombre: ${datos.nombre}`);
  partes.push(`Teléfono: ${datos.telefono}`);
  partes.push(`Dirección: ${datos.direccion}`);
  if (datos.barrio) partes.push(`Barrio: ${datos.barrio}`);
  if (datos.ubicacion) partes.push(`Ubicación: ${datos.ubicacion}`);
  if (datos.pago === "Efectivo" && datos.vueltas) {
    partes.push(`Pago: Efectivo (vueltas de ${datos.vueltas})`);
  } else {
    partes.push(`Pago: ${datos.pago}`);
  }
  if (datos.nota) partes.push(`Nota: ${datos.nota}`);

  return partes.join("\n");
}

/**
 * Deja el numero como lo entiende WhatsApp: solo digitos y con el pais (57).
 *
 * Sin esto el enlace llega como wa.me/3228636654 y WhatsApp no sabe de que
 * pais es: abre la pagina de compartir en vez de abrir el chat de la sede, y
 * el pedido se pierde. Con el 57 abre el chat correcto. Se decia "no esta en
 * WhatsApp" cuando el problema era el enlace, no el numero.
 *
 * Acepta el numero como venga: con espacios, con guiones o ya con el 57.
 */
export function numeroWhatsApp(numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  if (!digitos) return "";
  return digitos.startsWith("57") ? digitos : `57${digitos}`;
}

/** La direccion completa de WhatsApp con el pedido dentro. */
export function enlaceWhatsApp(numero, mensaje) {
  return `https://wa.me/${numeroWhatsApp(numero)}?text=${encodeURIComponent(mensaje)}`;
}
