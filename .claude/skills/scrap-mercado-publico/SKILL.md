---
name: scrap-mercado-publico
description: Busca licitaciones en mercadopublico.cl por palabras clave (Arduino, ESP32, robótica, etc.), extrae los datos de cada licitación (incluida la URL real de la ficha, que viene en el onclick verFicha del resultado) y envía un informe ordenado por fecha de publicación a cschneider@hubot.cl. Usa el MCP de Playwright. Úsala cuando se pida buscar/monitorear licitaciones de robótica/electrónica educativa o generar el informe periódico de Mercado Público.
---

# Scrap Mercado Público — Informe de licitaciones

Genera un informe de licitaciones publicadas en **mercadopublico.cl** que coincidan con un conjunto de palabras clave, y lo envía por correo a **cschneider@hubot.cl**.

## Requisitos del entorno

- **MCP de Playwright** (`playwright`) activo — ya declarado en `.mcp.json` del proyecto. Da las herramientas `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_evaluate`, etc.
- **Envío de correo**: vía **GitHub Actions** (`.github/workflows/send-email.yml`), que se dispara al pushear `outbox/email.json` y envía por SMTP desde un runner de GitHub usando el secret `SMTP_PASS`. **El sandbox de la nube bloquea SMTP directo**, por eso NO se usa `scripts/send_email.py`. Ver paso 6.

## Palabras clave de búsqueda

Buscar **cada una por separado** (no todas juntas) en la barra de búsqueda:

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

> **Importante:** la barra de búsqueda y los resultados viven dentro de un **iframe** `iframe[name="form-iframe"]`. Hay que acceder a su `contentDocument` (mismo origen) para leer/escribir.

### 2. Buscar palabra por palabra
Para **cada** palabra clave de la lista:
1. Escribir la palabra en la barra de búsqueda (textbox "¿Qué desea buscar?", dentro del iframe) con `browser_type` y `submit:true` (Enter).
2. Esperar ~2 s a que carguen los resultados.
3. Extraer **todos** los resultados de una vez con `browser_evaluate` (ver paso 3). NO hace falta abrir ningún modal ni hacer clicks.

### 3. ✅ Extracción de datos + URL real (método validado, sin modales)
Cada resultado es un `div.responsive-resultado`. La **URL real de la ficha NO está encriptada**: viene en el atributo `onclick` del enlace del título, en la función `$.Busqueda.verFicha('...?idlicitacion=<ID>')`. Se extrae directo (o se construye como `http://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=<ID>`).

Usar este `browser_evaluate` (devuelve un array de objetos listos):
```js
() => {
  const iframe = document.querySelector('iframe[name="form-iframe"]') || document.querySelector('iframe');
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  const cards = [...doc.querySelectorAll('.responsive-resultado')];
  const clean = s => (s||'').replace(/\s+/g,' ').trim();
  return cards.map(card => {
    const a = card.querySelector('a[onclick*="verFicha"]');
    const m = (a ? a.getAttribute('onclick') || '' : '').match(/verFicha\('([^']+)'\)/);
    const url = m ? m[1] : null;
    const t = card.innerText;
    const grab = re => { const x = t.match(re); return x ? clean(x[1]) : null; };
    const id = grab(/ID Licitaci[^:]*:\s*([\w-]+)/);
    const title = clean((card.querySelector('h2')||{}).innerText);
    const descP = [...card.querySelectorAll('p')].find(p => !p.querySelector('strong'));
    return {
      id, title,
      institucion: grab(/Fecha de cierre[\s\S]*?(?:\(En[^\)]*\)\s*)?\n([A-ZÁÉÍÓÚÑ][^\n]+)/),
      monto: grab(/Monto(?: disponible)?\s*([\s\S]*?)\s*Fecha de publicaci/),
      fpub: grab(/Fecha de publicaci[^\n]*\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/),
      fcierre: grab(/Fecha de cierre[\s\S]*?([0-9]{2}\/[0-9]{2}\/[0-9]{4})/),
      url,
      desc: clean(descP ? descP.innerText : '')
    };
  });
}
```

> Si hay paginación y se quieren más resultados, navegar las páginas (botones `2,3,...`) y repetir el `evaluate`. Por defecto basta con la primera página por palabra clave.

### 4. Consolidar
- **Deduplicar** por **ID** (una misma licitación puede aparecer en varias palabras clave).
- **Ordenar** por **Fecha de publicación descendente** (más reciente primero; convertir `dd/mm/aaaa` para comparar).

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
URL:                http://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=1234-56-LE24
```

Incluir un encabezado con la fecha del informe y el total de licitaciones encontradas. Guardar una copia en `informes/informe-mercado-publico-AAAA-MM-DD.md`.

### 6. Enviar el correo (vía GitHub Actions — método confiable)
> ⚠️ **NO usar `scripts/send_email.py` (SMTP directo)**: el sandbox de la nube **bloquea el puerto SMTP 465**. El envío confiable es mediante un **GitHub Action** (`.github/workflows/send-email.yml`) que corre en un runner de GitHub (sí tiene salida SMTP) y usa el secret `SMTP_PASS`.

Para enviar el informe:
1. Asegurarse de que el informe HTML está commiteado y pusheado a `main` (paso 5): `informes/informe-mercado-publico-<fecha>.html`.
2. Escribir/actualizar el archivo **`outbox/email.json`** con este contenido:
   ```json
   {
     "subject": "Informe licitaciones Mercado Público — <fecha> (<N> resultados)",
     "to": "cschneider@hubot.cl",
     "body_file": "informes/informe-mercado-publico-<fecha>.html",
     "html": true
   }
   ```
3. `git add outbox/email.json && git commit && git push origin main`. El push a `outbox/email.json` **dispara automáticamente** el workflow "Enviar correo", que envía el HTML a cschneider@hubot.cl.
4. (Opcional) Verificar el resultado del envío con `gh run list --workflow=send-email.yml` si `gh` está disponible.

> El cuerpo del correo es el archivo HTML referido en `body_file` (debe estar commiteado en `main` antes del push del outbox).

## Notas
- El sitio puede tardar o mostrar errores intermitentes: reintentar la navegación hasta 3 veces antes de descartar una palabra clave.
- Si una licitación no tiene algún campo, dejarlo como `—`.
- Si no se encuentra ninguna licitación para una palabra, registrarlo en el informe ("Sin resultados para: <palabra>").
