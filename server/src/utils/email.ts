import nodemailer from 'nodemailer';

type TicketEmailPayload = {
  to: string;
  userName: string;
  ticketCode: string;
  description?: string;
  issuedAt: Date;
  expiresAt?: Date | null;
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT !== undefined ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const smtpFrom = process.env.SMTP_FROM ?? 'La Sexta <no-reply@lasexta.com>';

let transporter: nodemailer.Transporter | null = null;

function ensureTransporter(): nodemailer.Transporter {
  if (
    smtpHost === undefined ||
    smtpUser === undefined ||
    smtpPassword === undefined ||
    smtpPort === undefined ||
    Number.isNaN(smtpPort)
  ) {
    throw new Error(
      'No se puede enviar el correo: faltan variables SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD).'
    );
  }

  if (transporter !== null) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

export async function sendTicketEmail({ to, userName, ticketCode, description, issuedAt, expiresAt }: TicketEmailPayload): Promise<void> {
  const transport = ensureTransporter();

  const formattedIssued = issuedAt.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedExpires =
    expiresAt != null
      ? expiresAt.toLocaleDateString('es-AR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Sin vencimiento';

  const html = `
    <div style="background:#101015;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f3f3f3">
      <h1 style="color:#ffeb3b;">¡Hola ${userName}!</h1>
      <p>Recibiste un nuevo ticket de cortesía para usar en el complejo.</p>
      <div style="margin:24px 0;padding:20px;border:1px solid rgba(255,255,255,0.1);border-radius:16px;background:#181825;text-align:center">
        <p style="font-size:14px;color:rgba(255,255,255,0.7)">Presentá este código al momento de canjear tu bebida:</p>
        <p style="font-size:26px;letter-spacing:4px;font-weight:bold;color:#ffffff;margin:16px 0;">${ticketCode}</p>
        <p style="margin:4px 0;color:rgba(255,255,255,0.6)">Emitido: <strong>${formattedIssued}</strong></p>
        <p style="margin:4px 0;color:rgba(255,255,255,0.6)">Vence: <strong>${formattedExpires}</strong></p>
        <p style="margin-top:16px;color:rgba(255,255,255,0.7)">${description ?? 'Ticket válido por una bebida gratuita.'}</p>
      </div>
      <p>¡Te esperamos en la próxima fecha!</p>
      <p style="margin-top:24px;font-size:12px;color:rgba(255,255,255,0.4)">Si no solicitaste este ticket, avisá al equipo administrador.</p>
    </div>
  `;

  await transport.sendMail({
    from: smtpFrom,
    to,
    subject: 'Tu ticket de bebida gratuita - La Sexta',
    html,
  });
}






