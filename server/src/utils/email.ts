import { Resend } from 'resend';

type TicketEmailPayload = {
  to: string;
  userName: string;
  ticketCode: string;
  description?: string;
  issuedAt: Date;
  expiresAt?: Date | null;
};

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.SMTP_FROM ?? 'La Sexta <onboarding@resend.dev>';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendApiKey === undefined || resendApiKey.trim() === '') {
    throw new Error('No se puede enviar el correo: falta la variable RESEND_API_KEY.');
  }

  if (resendClient !== null) {
    return resendClient;
  }

  resendClient = new Resend(resendApiKey);
  return resendClient;
}

export async function sendTicketEmail({ to, userName, ticketCode, description, issuedAt, expiresAt }: TicketEmailPayload): Promise<void> {
  try {
    const resend = getResendClient();

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

    const result = await resend.emails.send({
      from: emailFrom,
    to,
    subject: 'Tu ticket de bebida gratuita - La Sexta',
    html,
  });

    if (result.error) {
      throw new Error(`Error de Resend: ${result.error.message || 'Error desconocido'}`);
    }

    console.log(`[email] Ticket enviado a ${to} - ID: ${result.data?.id || 'N/A'}`);
  } catch (error: any) {
    console.error('[email] Error al enviar ticket:', error);
    throw new Error(`Error al enviar email: ${error.message || 'Error desconocido'}`);
  }
}

export async function sendPasswordResetEmail({ to, userName, resetCode }: { to: string; userName: string; resetCode: string }): Promise<void> {
  try {
    const resend = getResendClient();

    const html = `
      <div style="background:#101015;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f3f3f3">
        <h1 style="color:#ffeb3b;">¡Hola ${userName}!</h1>
        <p>Recibiste una solicitud para restablecer tu contraseña.</p>
        <div style="margin:24px 0;padding:20px;border:1px solid rgba(255,255,255,0.1);border-radius:16px;background:#181825;text-align:center">
          <p style="font-size:14px;color:rgba(255,255,255,0.7)">Ingresá este código en la aplicación para continuar:</p>
          <p style="font-size:26px;letter-spacing:4px;font-weight:bold;color:#ffffff;margin:16px 0;">${resetCode}</p>
          <p style="margin-top:16px;color:rgba(255,255,255,0.7)">Este código expira en 15 minutos.</p>
        </div>
        <p>Si no solicitaste restablecer tu contraseña, podés ignorar este correo.</p>
        <p style="margin-top:24px;font-size:12px;color:rgba(255,255,255,0.4)">Por seguridad, no compartas este código con nadie.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: emailFrom,
      to,
      subject: 'Código de recuperación de contraseña - La Sexta',
      html,
    });

    if (result.error) {
      throw new Error(`Error de Resend: ${result.error.message || 'Error desconocido'}`);
    }

    console.log(`[email] Código de recuperación enviado a ${to} - ID: ${result.data?.id || 'N/A'}`);
  } catch (error: any) {
    console.error('[email] Error al enviar código de recuperación:', error);
    throw new Error(`Error al enviar email: ${error.message || 'Error desconocido'}`);
  }
}
