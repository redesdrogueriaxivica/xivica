# Pendientes de Droguería Xivica

Actualizado el 26/09/2026, comprobando cada punto contra `src/datos/` y no de memoria. Lo
tachado ya está resuelto y queda como registro de cómo se resolvió.

## Ya resuelto

- [x] ~~Dominio y hosting definitivos~~ — `drogueriaxivica.com`, DNS en Namecheap
      (BasicDNS) apuntando a GitHub Pages, repositorio transferido a la cuenta del
      cliente (`redesdrogueriaxivica/xivica`). Publicado y con HTTPS activo el 26/09.
- [x] ~~¿Quién confirma qué productos requieren fórmula médica?~~ — decisión del
      propietario (25/09): lo marca él mismo, desde `Catalogo-Drogueria-Xivica.xlsx`
      (columna "¿Requiere fórmula?"). Los 407 productos siguen con `rx` vacío hasta que
      la revise; el filtro de portada ya está listo para respetarlo en cuanto se llene.
- [x] ~~Definir la "zona cercana" del domicilio gratis~~ — decisión del propietario
      (25/09): no se define un radio ni una lista de barrios; se evalúa a mano en cada
      pedido y se informa el costo por WhatsApp antes de despachar si aplica. Coincide
      con lo que ya dice `legal.json` → `domicilios`, así que no hizo falta tocar el texto.
- [x] ~~Revisión de un abogado~~ — los cuatro textos legales (privacidad, tratamiento de
      datos, términos, domicilios) quedaron validados (25/09).
- [x] ~~Derechos de uso de las fotos de producto~~ — resuelto, el propietario los tiene.
- [x] ~~Habilitación sanitaria~~ — una por sede: MS00010200, MS00017993 y MS00001129.
- [x] ~~Regente de farmacia~~ — **no aplica**: la droguería no vende medicamentos de control
      especial (confirmado por el propietario el 16/09). Ver el punto 1 de "Bloquean" por el
      efecto que esto tiene sobre el campo de fórmula médica.
- [x] ~~NIT~~ — cargado; su dígito de verificación cuadra.
- [x] ~~Horarios y tercera sede (Verbenal)~~ — cargados. Las coordenadas de las tres siguen
      por confirmar (ver "Confirmar").
- [x] ~~Manual de marca y logo en vector~~ — aplicado el v2.0.
- [x] ~~"Otro número de WhatsApp" de la lámina de identidad~~ — era el de Tejares del Norte, y
      **la fachada de Tejares lo confirma**: el aviso dice `322 863 66 54`. El número que traía
      la lámina hecha con IA (`…65 54`) estaba mal; el sitio usa el correcto.
- [x] ~~Fotos de Villa del Prado y de Tejares del Norte~~ — llegaron 7 y 8 fotos (21/09). Usadas
      8 en portada, Sedes y Nosotros; las demás son repetidas de la fachada. El dueño confirmó
      de qué sede es cada carpeta.

## Bloquean la publicación en el dominio definitivo

1. **¿Quién confirma qué productos requieren fórmula médica?** Hoy los 407 están sin marcar
   (`rx` vacío) y la regla que mantiene esos productos fuera de la portada no protege nada.
   `AGENTS.md` ya dice que lo llena el propio dueño desde la planilla, no un regente.
   Falta lo de fondo: **que el propietario revise la lista y marque cuáles la requieren.** Ojo: "no vendemos medicamentos de control"
   no significa "ninguno requiere fórmula": un antibiótico la requiere aunque no sea de control.
2. **Definir la "zona cercana" del domicilio gratis.** Los términos (`/legal/domicilios`) dicen
   que en la zona cercana el domicilio es gratis "sin importar el valor del pedido", pero no
   dicen cuál es esa zona. Sin eso, cualquier cliente puede reclamar. Falta: barrios o radio
   por sede.
3. **Revisión de un abogado** de los cuatro textos legales (privacidad, tratamiento de datos,
   términos, domicilios). Están redactados con la Ley 1581 de 2012 como guía, **no son
   asesoría jurídica**.
4. **Derechos de uso de las fotos de producto.** Las 669 vienen del sitio anterior, que las
   tomó de catálogos de proveedores.
5. **Dominio y hosting definitivos.** Está decidido que será un dominio nuevo, sin definir.

## Confirmar con el cliente (datos que pueden estar mal)

- **Correo: `ventas@drogueria`*c*`ivica.com`**, con C, no con X. Puede ser el dominio real o
  un error de digitación. Está en el pie y en Contacto.
- **Dos teléfonos fijos en las fotos de Tejares, y el sitio no muestra ninguno.** La fachada dice
  `DOMICILIOS 601 805 52 84` y un rótulo del interior dice `Dom: 359 21 22`. El sitio muestra
  solo celulares, porque así lo pidió el dueño. Confirmar cuál fijo sigue vigente para que el
  local físico y la web digan lo mismo, y cambiar el rótulo que ya no sirva.
- **Ubicación exacta de las tres sedes.** Las coordenadas son estimadas (las de Verbenal
  aproximadas por barrio). El botón "Cómo llegar" abre Google Maps **en esas coordenadas**:
  podría mandar al cliente a una cuadra equivocada. Pedir a cada sede la ubicación compartida
  desde WhatsApp o Google Maps.
- **Autorización de la empleada de la foto del mostrador de Tejares**, que **no se usó** porque
  sale reconocible. Una imagen es un dato personal (Ley 1581): hace falta su autorización,
  idealmente por escrito. (La persona de la foto de portada es el propio dueño, que la
  autorizó el 21/09.)
- **Los 8 productos destacados** son de ejemplo (así lo dice el commit que los marcó). El
  dueño debe elegir cuáles quiere empujar.
- **Servicios que se ven en las fotos y el sitio no menciona:** "Corresponsal bancario
  Bancolombia" (fachada de Villa del Prado) y "Afiliada a Coopidrogas" (las dos fachadas). Si
  son servicios vigentes, son un motivo más para visitar la sede. Confirmar antes de publicarlos.
- **Los rótulos de los anaqueles de Tejares** llevan un logo pequeño que dice "Droguexpress".
  Aparece en las dos fotos de interior de Tejares que se usaron (se lee al ampliar). Confirmar
  que es la red a la que están afiliados y que no hay problema en que se vea en la web.

## Falta material

- [ ] **Fotos de Verbenal** (fachada e interior). En Sedes sale como "Foto de la sede
      próximamente". Se preparan con `tools/preparar-fotos.mjs`.
- [ ] **Fotos del equipo**, con autorización. El manual pide personas reales (cap. 33).
- [ ] **Fotos para los banners 2 y 3 del carrusel** (domicilio y fórmula médica). Hoy llevan
      icono. Una foto del domiciliario en moto serviría para el primero.
- [ ] **Perfiles de redes sociales.** Los iconos de Facebook, Instagram y TikTok están, pero
      **sin enlace**: se ven como si fueran botones y no llevan a ninguna parte.
- [ ] **Códigos de medición** (Google Analytics, píxel de Meta, Metricool). Vacíos: no se
      carga nada de terceros hasta que lleguen.
- [ ] **Archivo del logotipo horizontal** (emblema + nombre). El manual lo aprueba pero solo
      entregó el emblema. El nombre está compuesto con Manrope en `Logo.astro`.

## Decisiones abiertas

- **¿Cómo se entera el cliente si una publicación falla?** Hoy no se entera: GitHub avisa por
  correo solo al dueño de la cuenta (el proveedor). Opciones: que el agente compruebe el
  resultado y se lo cuente en la conversación, o un aviso por Telegram. Sin decidir.
- **Mapa.** Usa OpenStreetMap, un proyecto sin ánimo de lucro que desaconseja el tráfico de
  sitios comerciales; en pruebas ya rechazó parte de las imágenes. Si el sitio crece, pasar a
  un proveedor con plan gratuito (MapTiler, Protomaps) o a una imagen estática. Mientras
  tanto las direcciones siguen escritas y "Cómo llegar" funciona.

## Del manual de marca (para el diseñador)

- **El manual pide "texto blanco sobre azul"**, y sobre el azul oficial `#00AAFA` no se puede
  leer (2,58:1). Se resolvió con un azul más oscuro del mismo matiz. Si el diseñador quiere
  sostener la regla, el manual debería incluir ese azul de trabajo.
- **El logo maestro y la tabla de colores difieren un poco:** el SVG trae `#03863E`, `#FDD603`
  y `#8AC840`; la tabla del manual, `#00813F`, `#FFD400` y `#84CF3B`. Conviene unificarlos.

## Mejoras de datos (no bloquean)

- [ ] **Galerías de producto con fotos de otros productos.** Vienen así del sitio anterior:
      la segunda foto del Oscillococcinum es una caja de Aciclovir. Revisar producto por
      producto, o dejar solo la primera (campo `imagenes`).
- [ ] **Nombres de producto en mayúsculas.** El manual pide evitarlas. Pasarlos a minúsculas a
      ciegas estropea marcas y siglas: hacerlo al revisar el catálogo.
- [ ] **Subcategorías del 48% restante.** Se clasificó el 52% por palabras clave; el resto son
      genéricos que hay que revisar a mano.
