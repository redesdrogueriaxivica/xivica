# Cómo se publica y cómo se deshace

## El flujo

```
se hace el cambio  →  se guarda  →  se sube  →  se revisa solo  →  se publica
                                                      ↓
                                            ¿algo mal? no se publica
                                       y el sitio sigue como estaba
```

**Nadie compila en su computador.** El sitio se arma solo en la nube.

## Cuánto tarda

De 2 a 4 minutos desde que se sube hasta que se ve. Si no aparece el cambio, recargar con
**Ctrl+F5** (o Cmd+Shift+R en Mac).

## Dónde está publicado

- **Demo:** https://demos.emp2web.com/xivica/
- **Definitivo:** pendiente de definir el dominio con el cliente.

## La revisión automática

Antes de publicar, se comprueba solo:

1. Que el catálogo esté bien escrito y que todas las fotos existan
2. Que no se use ningún color que no exista
3. Que las 53 pruebas pasen
4. Que el sitio compile
5. Que se generen las 407 páginas de producto

**Si algo falla, no se publica nada** y el sitio sigue mostrando la versión anterior. Un
error de edición no puede tumbar la tienda.

Para revisar antes de subir, desde la carpeta del proyecto:

```
npm run validar
npm test
```

## Ver antes de publicar

```
npm run dev
```

Abre el sitio en el computador, en `http://localhost:4321`. Cada cambio se ve al instante.

## Deshacer

| Si pasa esto | Se hace esto |
|---|---|
| No me gustó, y aún no se ha publicado | Descartar el cambio sin guardar |
| Devuélvelo como estaba | Revertir el último cambio y publicar otra vez |
| Vuelve a como estaba ayer | Buscar ese punto en el historial y revertir hasta ahí |
| Borré algo sin querer | Está en el historial, se recupera |

**Nunca se borra historial.** Siempre se revierte hacia adelante, para que el deshacer
también se pueda deshacer.

## Cuando cambie el dominio definitivo

El sitio está preparado. Hay que cambiar dos valores en el archivo de publicación
`.github/workflows/publicar.yml`:

```
PUBLIC_BASE: /          (en vez de /xivica/)
PUBLIC_SITE: https://el-dominio-nuevo.com
```

Eso lo hace emp2web, no el cliente.
