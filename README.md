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
2. Secret `SMTP_PASS` configurado en el repo (Settings → Secrets → Actions) con la
   contraseña de la cuenta SMTP `cschneider@hubot.cl`.
3. Routine programada (ej. diaria) que invoque la skill.

> **Envío del correo:** el sandbox de Claude Code en la nube bloquea los puertos SMTP
> salientes, así que el correo **no** se manda directo desde la sesión. En su lugar, la
> skill escribe `outbox/email.json` (con `subject`, `to`, `body_file`, `html`) y lo
> commitea; el workflow `.github/workflows/send-email.yml` se dispara con ese push y
> envía el correo desde un runner de GitHub (donde sí hay salida SMTP). Para envíos
> locales, `scripts/send_email.js` sigue funcionando directo contra `mail.hubot.cl:465`.
