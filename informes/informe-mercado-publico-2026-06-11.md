# Informe de Licitaciones — Mercado Público
**Fecha:** 2026-06-11  
**Total de licitaciones encontradas:** 0  
**Estado:** ERROR — Acceso bloqueado por política de red del entorno cloud

---

## Error de acceso

El scraping no pudo completarse. El entorno cloud de Claude Code (claude.ai/code) redirige todo el tráfico HTTPS saliente a través del **Egress Gateway de Anthropic**, el cual tiene una lista de hosts permitidos. El dominio `mercadopublico.cl` (y su API `api.mercadopublico.cl`) **no están en esa lista**, por lo que todas las solicitudes retornan `HTTP 403 — Host not in allowlist`.

Esto aplica a todos los métodos probados:
- Playwright (browser_navigate) → 403
- cURL desde terminal → 403
- WebFetch (herramienta nativa Claude Code) → 403

### Diagnóstico técnico

```
Certificado SSL interceptado por:
  issuer: O=Anthropic; CN=Egress Gateway SDS Issuing CA (production)

Respuesta recibida de todos los dominios chilenos:
  HTTP 403: Host not in allowlist
```

### Palabras clave que se intentó buscar

- Arduino
- ESP32
- Microbit
- Lego
- Spike
- Mindstorm
- Raspberry
- Robot
- robótica

### Cómo solucionar

Para ejecutar este skill con acceso a mercadopublico.cl se requiere una de estas opciones:

1. **Cambiar la política de red del entorno cloud** al crear una nueva sesión en claude.ai/code — seleccionar una política que permita acceso a hosts chilenos (política "unrestricted" o con `mercadopublico.cl` en el allowlist). Ver: https://code.claude.com/docs/en/claude-code-on-the-web
2. **Ejecutar localmente** con Claude Code CLI (`claude` en terminal), donde no hay restricciones de red.

---
*Informe generado automáticamente por skill-scrap-mercado-publico*
