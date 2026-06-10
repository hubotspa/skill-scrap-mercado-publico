#!/usr/bin/env node
/**
 * Envía un correo por SMTP usando nodemailer, con la misma configuración
 * que la skill automatizada (search_and_email.js):
 *
 *   - Servidor SMTP: mail.hubot.cl
 *   - Puerto:        465 (conexión segura SSL)
 *   - Credenciales:  cuenta cschneider@hubot.cl (contraseña vía SMTP_PASS)
 *
 * La contraseña NUNCA va en el repo: se lee de la variable de entorno
 * SMTP_PASS (claude.ai/code -> ajustes del entorno). SMTP_HOST, SMTP_PORT,
 * SMTP_USER, MAIL_FROM y MAIL_TO permiten sobreescribir los valores por defecto.
 *
 * Uso:
 *   node scripts/send_email.js --subject "Asunto" --body-file informe.md
 *   node scripts/send_email.js --subject "Asunto" --body-file informe.html --html
 */
const fs = require("fs");
const nodemailer = require("nodemailer");

function parseArgs(argv) {
  const args = { html: false };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--subject": args.subject = argv[++i]; break;
      case "--body-file": args.bodyFile = argv[++i]; break;
      case "--to": args.to = argv[++i]; break;
      case "--html": args.html = true; break;
      default:
        console.error(`Argumento desconocido: ${argv[i]}`);
        process.exit(2);
    }
  }
  if (!args.subject || !args.bodyFile) {
    console.error("Uso: node scripts/send_email.js --subject <asunto> --body-file <archivo> [--to <correo>] [--html]");
    process.exit(2);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const host = process.env.SMTP_HOST || "mail.hubot.cl";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER || "cschneider@hubot.cl";
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user;
  const to = args.to || process.env.MAIL_TO || "contacto@hubot.cl";

  if (!pass) {
    console.error("ERROR: falta la variable de entorno SMTP_PASS");
    process.exit(2);
  }

  const body = fs.readFileSync(args.bodyFile, "utf-8");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 30000,
  });

  const message = {
    from,
    to,
    subject: args.subject,
    [args.html ? "html" : "text"]: body,
  };

  await transporter.sendMail(message);
  console.log(`OK: correo enviado a ${to} via ${host}:${port}`);
}

main().catch((err) => {
  console.error(`ERROR al enviar el correo: ${err.message}`);
  process.exit(1);
});
