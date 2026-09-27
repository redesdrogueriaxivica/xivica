# Prueba de entrega en Windows — lista de tareas

Llevar este sitio al equipo del cliente (Windows) y probar que el dueño puede administrar
su catálogo hablándole al asistente. **Construimos en Linux; él trabaja en Windows, y eso
no se verifica con las pruebas que pasan aquí.**

> Las lecciones generales de Windows están en el generador
> (`conocimiento/herramientas-en-windows.md`). Esto es la lista de **esta** entrega.

---

## A · Bloqueantes — arreglar en Linux ANTES de salir

- [x] **A1 · `python3` no existe en Windows.** ✅ **Resuelto el 2026-09-27.**

      Estaba en 10 lugares de la documentación y en el `npm test`. Ahora todo pasa por
      `tools/python.mjs`, que prueba `python3`, `python` y `py -3` y comprueba que el que
      responda sea Python 3 de verdad (en Windows `python` puede ser el alias de Microsoft
      Store, que abre la tienda).

      La documentación dice un solo comando, igual en los dos sistemas: `npm run validar`.
      **Nada cambió para Linux** — sigue funcionando igual. Con 4 pruebas que lo vigilan.

- [ ] **A2 · Commit y push de lo pendiente.** Hay cambios sin guardar, y uno es el
      **arreglo del bug de Windows en `tools/preparar-fotos.mjs`**: el punto de entrada
      comparaba texto de rutas y en Windows el script se cerraba sin hacer nada y sin
      error. Si sales sin esto, te llevas la versión rota.

- [ ] **A3 · Confirmar que `npm test` pasa aquí** después de A1, para no depurar dos cosas
      a la vez allá.

- [ ] **A4 · Separar la planilla.** `Catalogo-Drogueria-Xivica.xlsx` está en el
      `.gitignore`: **no viaja en el repo.** Copiarla aparte al USB, o no se puede probar
      cómo el dueño administra precios y promociones.

---

## B · Preparar el USB

- [ ] **B1 · No copiar `node_modules/`.** Son 255 de los 280 MB y están compilados para
      Linux (`sharp-linux-x64`, `lightningcss-linux-x64`, el compilador de Astro). En
      Windows no cargan y el error no dice nada útil.

      ```bash
      rsync -a --exclude node_modules --exclude dist --exclude .astro \
            web-xivica/ /media/USB/xivica/
      ```

- [ ] **B2 · Sí llevar `.git`** (13 MB). Es lo que hace que el *"devuélvelo como estaba"*
      funcione, y es la mitad del valor del producto.
- [ ] **B3 · Llevar el `.xlsx`** de A4.
- [ ] **B4 · Llevar Node y Git descargados**, por si no hay buen internet donde el cliente.

---

## C · Montar en el equipo del cliente

- [ ] **C1 · Comprobar que existe `winget`.** Si no, `instalar.ps1` aborta. Se arregla
      actualizando Windows o con *Instalador de aplicaciones* de Microsoft Store.
- [ ] **C2 · Dejar la carpeta FUERA de OneDrive.** `C:\sitios\xivica\`. Dentro de OneDrive,
      sincroniza `node_modules` y `.git` y va de lento a corrupto.
- [ ] **C3 · Correr el instalador.**
      ```powershell
      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
      .\instalar.ps1
      ```
- [ ] **C4 · Cerrar la ventana y abrir una nueva.** El PATH no se actualiza en la que está
      abierta; sin esto `doctor.ps1` reporta como faltante lo que sí se instaló.
- [ ] **C5 · `.\doctor.ps1` en verde.**
- [ ] **C6 · `npm install`.** Aquí bajan los binarios de Windows. Si el antivirus lo hace
      eterno, excluir la carpeta del análisis en tiempo real **con permiso del cliente**.
- [ ] **C7 · Confirmar que el alias de Python de Microsoft Store no estorbe.** Si
      `python --version` abre la tienda: *Configuración → Aplicaciones → Alias de
      ejecución*.

---

## D · Verificar las herramientas

- [ ] **D1 · `npm run dev`** y abrir el sitio en el navegador.
- [ ] **D2 · `npm run build`** sin errores.
- [ ] **D3 · `npm test`** — 38 de JavaScript, 16 de fotos y las de Python.
- [ ] **D4 · El validador**, con la forma de Windows:
      `python tools/validar.py src/datos/productos.json public/img`
- [ ] **D5 · La herramienta de fotos, con una ruta con espacios y tildes.** ⚠️ **Es el
      arreglo de A2 y nunca se ha ejecutado en Windows.**
      ```powershell
      node tools/preparar-fotos.mjs "C:\Users\...\Descargas\foto de prueba.jpg" fotos/prueba
      ```
      Debe imprimir tres archivos (600, 900, 1200). **Si no imprime nada, el bug sigue.**
- [ ] **D6 · El puente de Excel**, `revisar` y luego `aplicar`.

---

## E · La prueba que de verdad importa

Con opencode abierto en la carpeta, **hablarle como le hablaría el dueño** — sin comandos,
en español normal. El asistente debe hacer todo lo de la sección D por su cuenta.

- [ ] **E1 · Cambiar un precio.** *"Súbele el precio al acetaminofén a 4.500"*
- [ ] **E2 · Poner una oferta**, y comprobar que el descuento lo calcula él.
- [ ] **E3 · Intentar una oferta mal puesta a propósito** (un porcentaje que no cuadre) y
      ver que **el validador la frena** y lo explica en palabras del dueño.
- [ ] **E4 · Marcar un producto como agotado.**
- [ ] **E5 · Marcar un destacado** y ver que cambia la portada.
- [ ] **E6 · Marcar una promoción relámpago** y ver la ventana emergente.
- [ ] **E7 · Crear un producto nuevo, con foto.** Es el flujo más largo: datos + imagen
      procesada + validación.
- [ ] **E8 · Borrar un producto.**
- [ ] **E9 · Deshacer algo.** *"No me gustó, déjalo como estaba"*. **Es la prueba más
      importante de todas**: el miedo a romper algo es lo que hace que un cliente nunca use
      la herramienta.
- [ ] **E10 · Publicar** y ver el cambio en internet (2 a 4 minutos, recargar con Ctrl+F5).
- [ ] **E11 · Confirmar que el asistente pidió aprobación antes de publicar**, siempre.

---

## F · Al volver

- [ ] **F1 · Hacer commit en Windows antes de salir**, o se pierde la evidencia de la
      prueba.
- [ ] **F2 · No sobrescribir la carpeta de Windows con una copia nueva de Linux.** Si hay
      internet: `git pull`. Si no: copiar **solo los archivos tocados**.
- [ ] **F3 · Cada falla se arregla en el generador, no solo aquí.** Si se queda en este
      repo, el próximo cliente nace con el mismo bug — que es exactamente lo que pasó con
      `preparar-fotos.mjs`.
- [ ] **F4 · Pasar lo aprendido a `generador/conocimiento/lecciones.md`.**
- [ ] **F5 · Borrar este archivo** cuando la entrega esté cerrada. Es andamiaje, no
      documentación del sitio.

---

## Recordatorio que no es de Windows

**La publicación sigue bloqueada** hasta que el regente de farmacia marque qué productos
requieren fórmula médica. Ver `PENDIENTES.md`. La prueba se puede hacer igual; **publicar
en el dominio definitivo, no.**
