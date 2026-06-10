---
name: scrap-mercado-publico
description: Busca licitaciones en mercadopublico.cl por palabras clave (Arduino, ESP32, robótica, etc.), extrae los datos de cada ficha y envía un informe ordenado por fecha de publicación a cschneider@hubot.cl. Usa el MCP de Playwright para navegar y resolver el enlace real de la ficha (que está dentro de un modal). Úsala cuando se pida buscar/monitorear licitaciones de robótica/electrónica educativa o generar el informe periódico de Mercado Público.
---

# Scrap Mercado Público — Informe de licitaciones

Genera un informe de licitaciones publicadas en **mercadopublico.cl** que coincidan con un conjunto de palabras clave, y lo envía por correo a **cschneider@hubot.cl**.

## Requisitos del entorno

- **MCP de Playwright** (`playwright`) activo — ya declarado en `.mcp.json` del proyecto. Da las herramientas `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_evaluate`, etc.
- **Envío de correo**: vía **SMTP** con el script `scripts/send_email.js` (nodemailer; por defecto `mail.hubot.cl:465` SSL con la cuenta `cschneider@hubot.cl`, igual que `search_and_email.js`). La contraseña va en la variable de entorno `SMTP_PASS`, configurada en el entorno de la nube (claude.ai/code), **no** en el repo; `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `MAIL_FROM` y `MAIL_TO` son opcionales para sobreescribir defaults. Existe también `scripts/send_email.py` como alternativa equivalente.

## Palabras clave de búsqueda

Buscar **todas de una sola vez**, escribiendo en la barra de búsqueda la lista completa separada por comas:

```
Arduino, ESP32, Microbit, Lego, Spike, Mindstorm, Raspberry, Robot, robótica
```

## Datos a extraer por cada licitación

- **ID** (código de licitación, ej. `1234-56-LE24`)
- **Título**
- **Institución**
- **Monto disponible**
- **Fecha de publicación**
- **Fecha de cierre**
- **Descripción**
- **URL** (enlace real a la ficha — ver sección crítica abajo)

## Procedimiento

### 1. Abrir el buscador
- `browser_navigate` a `https://www.mercadopublico.cl/Home/BuscadorPublico`.
  - Si esa página da error, intentar `https://www.mercadopublico.cl/home/busquedalicitacion`.
- Tomar `browser_snapshot` para localizar la barra de búsqueda ("Buscar").

### 2. Buscar todas las palabras de una vez
1. Escribir en la barra de búsqueda (`browser_type`) la lista completa de palabras clave separadas por comas (`Arduino, ESP32, Microbit, Lego, Spike, Mindstorm, Raspberry, Robot, robótica`) y enviar (Enter o botón Buscar).
2. Esperar a que carguen los resultados (`browser_snapshot`).
3. Recorrer cada resultado (incluyendo paginación si hay varias páginas) y extraer los campos visibles (Título, Institución, Monto, Fechas, Descripción, ID).

### 3. ⚠️ CRÍTICO — Obtener la URL real de la ficha (está en un modal)
En los resultados, los enlaces de la descripción **no llevan directo a la ficha**: abren un **modal**. El enlace verdadero a la ficha (formato `.../Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=<código>`) está **dentro de ese modal**. El parámetro `qs` está encriptado, así que **NO se puede construir manualmente** — hay que leerlo del DOM.

Para cada resultado:
1. Hacer `browser_click` en el enlace de la descripción que abre el modal.
2. Esperar a que el modal aparezca (`browser_snapshot`).
3. Extraer el `href` real con `browser_evaluate`, por ejemplo:
   ```js
   () => {
     const a = document.querySelector(
       'a[href*="DetailsAcquisition.aspx"], .modal a[href*="DetailsAcquisition"], a[href*="qs="]'
     );
     return a ? a.href : null;
   }
   ```
   Si hay varios, priorizar el que contenga `DetailsAcquisition.aspx?qs=`.
4. Guardar esa URL como la **URL** de la licitación.
5. Cerrar el modal antes de pasar al siguiente resultado.

> Si el `href` viene relativo, anteponer `https://www.mercadopublico.cl`.

### 4. Consolidar
- **Deduplicar** por **ID** (por si una misma licitación aparece repetida en los resultados).
- **Ordenar** por **Fecha de publicación descendente** (más reciente primero).

### 5. Generar el informe
Formato por licitación:

```
ID:                 1234-56-LE24
Título:             ...
Institución:        ...
Monto disponible:   ...
Fecha publicación:  ...
Fecha de cierre:    ...
Descripción:        ...
URL:                https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=...
```

Incluir un encabezado con la fecha del informe y el total de licitaciones encontradas. Guardar una copia en `informes/informe-mercado-publico-AAAA-MM-DD.md`.

### 6. Enviar el correo (SMTP)
- **Para:** `cschneider@hubot.cl`
- **Asunto:** `Informe licitaciones Mercado Público — <fecha> (<N> resultados)`
- Generar el cuerpo como HTML en `informes/informe-mercado-publico-<fecha>.html` y enviarlo con el script de **nodemailer** (misma configuración que `search_and_email.js`: servidor `mail.hubot.cl`, puerto `465` SSL, cuenta `cschneider@hubot.cl`):
  ```bash
  npm install   # solo la primera vez, instala nodemailer
  node scripts/send_email.js \
    --subject "Informe licitaciones Mercado Público — <fecha> (<N> resultados)" \
    --body-file informes/informe-mercado-publico-<fecha>.html --html
  ```
  Alternativa equivalente en Python (mismos argumentos): `python scripts/send_email.py`.
- La contraseña se lee de la variable de entorno `SMTP_PASS`; `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `MAIL_FROM` y `MAIL_TO` permiten sobreescribir los valores por defecto. Si el envío falla (faltan variables o la red del entorno bloquea SMTP saliente), dejar el informe commiteado en el repo y anotar el error al final del informe.

## Notas
- El sitio puede tardar o mostrar errores intermitentes: reintentar la navegación/búsqueda hasta 3 veces antes de abortar.
- Si una licitación no tiene algún campo, dejarlo como `—`.
- Si la búsqueda combinada no arroja ningún resultado, registrarlo en el informe ("Sin resultados para la búsqueda combinada") — y considerar que el buscador pudo interpretar las comas como AND; en ese caso anotarlo para revisar la estrategia.
