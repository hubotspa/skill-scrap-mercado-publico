#!/usr/bin/env bash
# Prepara el Chromium preinstalado del entorno cloud para el MCP de Playwright.
#
# El MCP (@playwright/mcp@latest) usa un playwright-core que busca el canal
# "chrome-for-testing" (chromium rev 1226, layout chrome-linux64/), pero el
# contenedor trae chromium-1194 con layout chrome-linux/ y la descarga del
# navegador está bloqueada por la política de red. Estos symlinks hacen que
# el binario existente aparezca donde el MCP lo espera.
set -u

BROWSERS_DIR="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
INSTALLED="$BROWSERS_DIR/chromium-1194"

[ -d "$INSTALLED" ] || exit 0  # nada que hacer fuera del entorno cloud

[ -e "$INSTALLED/chrome-linux64" ] || ln -s "$INSTALLED/chrome-linux" "$INSTALLED/chrome-linux64"

for rev in 1226; do
  [ -e "$BROWSERS_DIR/chromium-$rev" ] || ln -s "$INSTALLED" "$BROWSERS_DIR/chromium-$rev"
  [ -e "$BROWSERS_DIR/chromium_headless_shell-$rev" ] || \
    ln -s "$BROWSERS_DIR/chromium_headless_shell-1194" "$BROWSERS_DIR/chromium_headless_shell-$rev"
done

exit 0
