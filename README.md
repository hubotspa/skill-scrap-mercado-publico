# Skill — Scrap Mercado Público

Skill de Claude Code que busca licitaciones en [mercadopublico.cl](https://www.mercadopublico.cl)
por palabras clave (Arduino, ESP32, robótica, etc.), extrae los datos de cada ficha
y envía un informe ordenado por fecha de publicación a **contacto@hubot.cl**.

## Contenido

- `.mcp.json` — declara el servidor MCP de **Playwright** (control de navegador) para que funcione
  también en las **Routines** (ejecución en la nube, aunque el PC esté apagado).
- `.claude/skills/scrap-mercado-publico/SKILL.md` — la skill con el procedimiento de scraping,
  incluyendo cómo resolver el enlace real de la ficha (que vive dentro de un modal).
- `informes/` — copias locales de cada informe generado.

## Uso local

En este directorio, pedir a Claude Code: *"ejecuta la skill scrap-mercado-publico"*.

## Uso en la nube (Routine)

1. Repo conectado a Claude Code en la web (claude.ai/code).
2. Conector de **Gmail** habilitado en claude.ai para el envío del correo.
3. Routine programada (ej. diaria) que invoque la skill.
