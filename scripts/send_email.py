#!/usr/bin/env python3
"""Envía un correo por SMTP leyendo las credenciales desde variables de entorno.

NUNCA pongas credenciales en este archivo ni en el repo. Defínelas como variables
de entorno del entorno de la nube (claude.ai/code -> ajustes del entorno):

    SMTP_HOST   por defecto mail.hubot.cl
    SMTP_PORT   587 (STARTTLS) o 465 (SSL)    (por defecto 465)
    SMTP_USER   usuario/cuenta SMTP           ej: hubotspa@gmail.com
    SMTP_PASS   contraseña o app password
    MAIL_FROM   remitente (por defecto = SMTP_USER)
    MAIL_TO     destinatario (por defecto cschneider@hubot.cl)

Uso:
    python scripts/send_email.py --subject "Asunto" --body-file informe.md
    python scripts/send_email.py --subject "Asunto" --body-file informe.html --html
"""
import argparse
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True)
    ap.add_argument("--body-file", required=True)
    ap.add_argument("--to", default=os.environ.get("MAIL_TO", "cschneider@hubot.cl"))
    ap.add_argument("--html", action="store_true", help="enviar el cuerpo como HTML")
    args = ap.parse_args()

    host = os.environ.get("SMTP_HOST", "mail.hubot.cl")
    port = int(os.environ.get("SMTP_PORT", "465"))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASS")
    sender = os.environ.get("MAIL_FROM", user)

    missing = [k for k in ("SMTP_USER", "SMTP_PASS") if not os.environ.get(k)]
    if missing:
        print(f"ERROR: faltan variables de entorno: {', '.join(missing)}", file=sys.stderr)
        return 2

    with open(args.body_file, "r", encoding="utf-8") as fh:
        body = fh.read()

    msg = EmailMessage()
    msg["Subject"] = args.subject
    msg["From"] = sender
    msg["To"] = args.to
    if args.html:
        msg.set_content("Tu cliente no soporta HTML. Abre el adjunto / repo.")
        msg.add_alternative(body, subtype="html")
    else:
        msg.set_content(body)

    ctx = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=ctx) as s:
            s.login(user, password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as s:
            s.starttls(context=ctx)
            s.login(user, password)
            s.send_message(msg)

    print(f"OK: correo enviado a {args.to} via {host}:{port}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
