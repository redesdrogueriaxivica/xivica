import { test } from "node:test";
import assert from "node:assert/strict";
import { crearPedido, armarMensaje, enlaceWhatsApp, numeroWhatsApp } from "./pedido.js";

const A = { slug: "a", titulo: "ACETAMINOFEN 500 MG", precio: 5000, imagen: "a.webp" };
const B = { slug: "b", titulo: "CREMA NIVEA", precio: 8200, imagen: "b.webp" };

test("suma bien el total", () => {
  const p = crearPedido();
  p.agregar(A, 2);
  p.agregar(B, 1);
  assert.equal(p.total(), 18200);
});

test("agregar dos veces el mismo suma cantidad, no duplica la línea", () => {
  const p = crearPedido();
  p.agregar(A, 2);
  p.agregar(A, 1);
  assert.equal(p.lineas().length, 1);
  assert.equal(p.lineas()[0].cantidad, 3);
  assert.equal(p.total(), 15000);
});

test("bajar la cantidad a cero quita el producto", () => {
  const p = crearPedido();
  p.agregar(A, 1);
  p.cambiarCantidad("a", 0);
  assert.equal(p.lineas().length, 0);
  assert.equal(p.total(), 0);
});

test("no se puede tener cantidad negativa", () => {
  const p = crearPedido();
  p.agregar(A, 1);
  p.cambiarCantidad("a", -5);
  assert.equal(p.lineas().length, 0);
});

test("cuenta las unidades, no las líneas", () => {
  const p = crearPedido();
  p.agregar(A, 3);
  p.agregar(B, 2);
  assert.equal(p.unidades(), 5);
});

test("el envío es gratis a partir del mínimo", () => {
  const p = crearPedido({ envioGratisDesde: 60000 });
  p.agregar(A, 1);
  assert.equal(p.envioGratis(), false);
  assert.equal(p.faltaParaEnvioGratis(), 55000);

  p.cambiarCantidad("a", 12); // 60.000
  assert.equal(p.envioGratis(), true);
  assert.equal(p.faltaParaEnvioGratis(), 0);
});

test("vaciar deja el pedido en cero", () => {
  const p = crearPedido();
  p.agregar(A, 3);
  p.vaciar();
  assert.equal(p.total(), 0);
  assert.equal(p.lineas().length, 0);
});

test("el mensaje de WhatsApp lleva productos, cantidades y total", () => {
  const p = crearPedido();
  p.agregar(A, 2);
  p.agregar(B, 1);
  const mensaje = armarMensaje(p, {
    nombre: "Ana Gómez", telefono: "3001234567",
    direccion: "Cra 49 #171-92 apto 302", pago: "Efectivo", nota: "Timbre dañado",
  });

  assert.match(mensaje, /ACETAMINOFEN 500 MG/);
  assert.match(mensaje, /x2/);
  assert.match(mensaje, /\$18\.200/);
  assert.match(mensaje, /Ana Gómez/);
  assert.match(mensaje, /3001234567/);
  assert.match(mensaje, /Cra 49 #171-92 apto 302/);
  assert.match(mensaje, /Efectivo/);
  assert.match(mensaje, /Timbre dañado/);
});

test("el mensaje no inventa una nota que no se escribió", () => {
  const p = crearPedido();
  p.agregar(A, 1);
  const mensaje = armarMensaje(p, {
    nombre: "Ana", telefono: "300", direccion: "Calle 1", pago: "Efectivo", nota: "",
  });
  assert.doesNotMatch(mensaje, /Nota/);
});

test("el mensaje lleva la sede y las vueltas en efectivo", () => {
  const p = crearPedido();
  p.agregar(A, 1);
  const mensaje = armarMensaje(p, {
    nombre: "Ana", telefono: "300", direccion: "Calle 1",
    sede: "Villa del Prado", pago: "Efectivo", vueltas: "$50.000", nota: "",
  });
  assert.match(mensaje, /Sede: Villa del Prado/);
  assert.match(mensaje, /Pago: Efectivo \(vueltas de \$50\.000\)/);
});

test("sin vueltas el pago en efectivo sale solo", () => {
  const p = crearPedido();
  p.agregar(A, 1);
  const mensaje = armarMensaje(p, {
    nombre: "Ana", telefono: "300", direccion: "Calle 1", pago: "Efectivo",
  });
  assert.match(mensaje, /Pago: Efectivo$/m);
});

test("un pedido vacío no se puede enviar", () => {
  const p = crearPedido();
  assert.throws(() => armarMensaje(p, { nombre: "Ana" }), /vacío/);
});

test("el numero de WhatsApp lleva el 57 del pais", () => {
  // Sin el 57, wa.me no sabe de que pais es el numero y el pedido se pierde:
  // abria la pagina de compartir en vez del chat de la sede.
  assert.equal(numeroWhatsApp("3228636654"), "573228636654");
  assert.equal(numeroWhatsApp("3013665076"), "573013665076");
  assert.equal(numeroWhatsApp("3124293060"), "573124293060");
});

test("el numero no se daña si ya trae el 57 o separadores", () => {
  assert.equal(numeroWhatsApp("573228636654"), "573228636654");
  assert.equal(numeroWhatsApp("322 863 66 54"), "573228636654");
  assert.equal(numeroWhatsApp("322-863-6654"), "573228636654");
  assert.equal(numeroWhatsApp(""), "");
});

test("el enlace del pedido lleva el 57 y el texto del mensaje", () => {
  const enlace = enlaceWhatsApp("3228636654", "Hola");
  assert.match(enlace, /^https:\/\/wa\.me\/573228636654\?text=Hola$/);
});
