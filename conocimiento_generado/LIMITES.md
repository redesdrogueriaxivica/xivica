# Qué no tocar y cuándo llamar al proveedor

## Lo que nunca hace el asistente del cliente

**Marcar o desmarcar que un producto requiere fórmula médica.** Ese campo (`rx`) lo llena
el propio dueño, solo desde `Catalogo-Drogueria-Xivica.xlsx`. Marcar de menos un
medicamento es un problema legal.

**Escribir indicaciones médicas, dosis o contraindicaciones** en la descripción de un
producto. Presentación, contenido y marca sí. Nada clínico.

**Inventar un precio o un número de habilitación sanitaria.** Si falta, se pregunta.

**Cambiar los colores o la tipografía** sin que lo pidan explícitamente, porque afecta a
todo el sitio a la vez.

**Tocar los archivos de publicación** (`.github/workflows/`), la configuración de Astro o
el dominio.

## Límites que tiene el sitio, y hay que conocer

**Los favoritos y los pedidos anteriores viven solo en el navegador de cada persona.** No
hay cuentas de usuario. Si alguien entra desde otro teléfono, no ve sus favoritos. Fue una
decisión: pedir registro en una droguería de barrio espanta más clientes de los que
fideliza.

**El sitio no cobra en línea.** No hay pasarela de pago. El pedido termina en WhatsApp y se
paga contra entrega.

**El stock no es real.** El campo `stock` se cambia a mano; no está conectado al inventario
de la droguería. Por eso el sitio dice siempre que la droguería confirma disponibilidad
antes de despachar.

**El mapa depende de OpenStreetMap**, que es un proyecto sin ánimo de lucro. Si algún día
deja de cargar, las direcciones siguen escritas y los enlaces a Google Maps funcionan. Ver
`PENDIENTES.md`.

**La tarjeta de producto está escrita dos veces**: en `components/TarjetaProducto.astro`
para lo que se genera al compilar, y en `scripts/tarjeta.js` para lo que se pinta al
filtrar. Es una duplicación conocida: si se cambia una, hay que cambiar la otra.

## Cuando algo excede al asistente

Rediseñar el sitio, cambiar la identidad de marca, agregar pago en línea, conectar el
inventario de la droguería, mudar el hosting o cambiar el dominio.

**Eso lo hace emp2web: 302 552 6058 o ayuda@emp2web.com.**

## Detente y avisa si

- La vista previa deja de abrir o muestra un error
- La publicación falla dos veces seguidas
- El validador del catálogo da un error que no se entiende
- Aparece un aviso de seguridad o de certificado
- Hay que escribir una contraseña para continuar

## El asistente es reemplazable, y eso es a propósito

**Ningún modelo de IA es parte del sitio.** Las instrucciones viven en `AGENTS.md` y
`CLAUDE.md`, en la raíz del proyecto, así que **cualquier agente que abra esta carpeta las
recibe**: opencode, Claude Code o Codex.

Y dentro de opencode se puede cambiar de modelo cuando se quiera: hay varios gratuitos, y
quien prefiera pagar puede conectar el suyo. **Si uno desaparece o se degrada, se cambia
por otro y el sitio no se entera.**

Eso es lo que evita que la promesa de "ya no dependes de un programador" se convierta en
"ahora dependes de una empresa de IA".

### Pero el modelo sí cambia cómo se porta el asistente

Un modelo más flojo sigue las reglas de `AGENTS.md` con menos rigor. Conviene saber qué
protege qué:

| Qué lo protege | De qué |
|---|---|
| **El validador y la compuerta de publicación** | De que el sitio se rompa. **Esto no depende del modelo**: si el catálogo queda mal, no se publica, use el agente que use |
| **`AGENTS.md`** | De que el asistente se porte mal: publicar sin preguntar, tocar el campo regulado, no avisar de que un precio baja. **Esto sí depende del modelo** |

**La frontera, en una frase:** la compuerta impide que el sitio quede roto, pero **no
impide un dato equivocado que sea válido.** Un precio de $4.500 donde debía ir $5.500 pasa
todas las revisiones: es un número entero, positivo y coherente. Contra eso solo está el
criterio del asistente y el ojo del dueño.

Pasó en la prueba de entrega, con un modelo capaz. Por eso la regla de confirmar si un
precio sube o baja está en `AGENTS.md`, y por eso **la aprobación del dueño antes de
publicar no es un trámite.**

### Al cambiar de modelo

Pedirle un cambio pequeño y comprobar tres cosas antes de confiarle el catálogo:

1. ¿Muestra antes de publicar y **espera** la aprobación?
2. ¿Avisa si un precio baja cuando le dijeron "sube"?
3. ¿Se niega a tocar el campo de fórmula médica si se lo piden en la conversación?

Si falla alguna, ese modelo no sirve para este sitio.
