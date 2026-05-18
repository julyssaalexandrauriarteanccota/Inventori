/**
 * Templates de email HTML inline para auth.
 *
 * Convención:
 * - HTML inline-styled (compatible Gmail/Outlook/Apple Mail) — sin <style>
 *   externos porque muchos clientes los recortan.
 * - Plantillas devuelven `{ subject, html, text }` para que el sender pueda
 *   adjuntar también un fallback text/plain (mejora deliverability vs spam).
 * - Branding tomado de ConfigEmpresa (logo, razonSocial, colorPrimario).
 *   Si falta, se cae a valores por defecto Inventori.
 */

const DEFAULT_BRAND = {
  nombre: 'Inventori ERP',
  slogan: 'Venta, alquiler y soporte técnico de impresoras y fotocopiadoras',
  colorPrimario: '#D2691E',
  logoUrl: null as string | null,
};

export interface EmailBrand {
  nombre: string;
  slogan?: string | null;
  colorPrimario?: string | null;
  logoUrl?: string | null;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/** Brand normalizado: `nombre` y `colorPrimario` garantizados como string. */
interface ResolvedBrand {
  nombre: string;
  slogan: string | null;
  colorPrimario: string;
  logoUrl: string | null;
}

function resolveBrand(brand?: Partial<EmailBrand>): ResolvedBrand {
  return {
    nombre: brand?.nombre || DEFAULT_BRAND.nombre,
    slogan: brand?.slogan ?? DEFAULT_BRAND.slogan,
    colorPrimario: brand?.colorPrimario || DEFAULT_BRAND.colorPrimario,
    logoUrl: brand?.logoUrl ?? DEFAULT_BRAND.logoUrl,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Layout base con header (logo + nombre), cuerpo (children) y footer.
 * Todo en `<table>` porque es lo único que respetan Outlook + Gmail.
 */
function wrapInLayout(
  bodyHtml: string,
  brand: ResolvedBrand,
  preheader: string,
): string {
  const b = brand;
  const logoBlock = b.logoUrl
    ? `<img src="${escapeHtml(b.logoUrl)}" alt="${escapeHtml(b.nombre)}" width="48" height="48" style="display:block;border-radius:12px;border:0;outline:none;text-decoration:none;background:${b.colorPrimario};" />`
    : `<div style="display:inline-block;width:48px;height:48px;line-height:48px;text-align:center;font-weight:700;color:#ffffff;background:${b.colorPrimario};border-radius:12px;font-size:22px;font-family:Helvetica,Arial,sans-serif;">${escapeHtml(b.nombre[0] ?? 'I')}</div>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(b.nombre)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Helvetica,Arial,sans-serif;color:#1c1917;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f4;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td style="padding:24px 24px 16px 24px;border-bottom:1px solid #f5f5f4;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td valign="middle" style="width:56px;">${logoBlock}</td>
          <td valign="middle" style="padding-left:12px;">
            <div style="font-size:18px;font-weight:700;color:#1c1917;line-height:1.2;">${escapeHtml(b.nombre)}</div>
            ${b.slogan ? `<div style="font-size:12px;color:#78716c;margin-top:2px;">${escapeHtml(b.slogan)}</div>` : ''}
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:24px;">${bodyHtml}</td></tr>
      <tr><td style="padding:16px 24px 24px 24px;border-top:1px solid #f5f5f4;font-size:11px;color:#a8a29e;line-height:1.5;">
        Este correo se envió automáticamente desde el sistema <strong>${escapeHtml(b.nombre)}</strong>. Si no esperabas recibirlo, puedes ignorarlo de forma segura.
      </td></tr>
    </table>
    <div style="margin-top:12px;font-size:11px;color:#a8a29e;font-family:Helvetica,Arial,sans-serif;">
      © ${new Date().getFullYear()} ${escapeHtml(b.nombre)}
    </div>
  </td></tr>
</table>
</body>
</html>`;
}

function buildButton(label: string, href: string, color: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr><td bgcolor="${color}" style="border-radius:10px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;font-family:Helvetica,Arial,sans-serif;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

// ════════════════════════════════════════════════════════════════════
//  Templates concretos
// ════════════════════════════════════════════════════════════════════

// ── Verificación de email al registrarse (OTP de 6 dígitos) ──────────

export interface EmailVerificationOtpInput {
  nombre: string;
  codigo: string;
  vigenciaMinutos: number;
  brand?: Partial<EmailBrand>;
}

export function buildEmailVerificationOtpEmail(
  input: EmailVerificationOtpInput,
): EmailTemplate {
  const brand = resolveBrand(input.brand);
  const preheader = `Tu código de verificación: ${input.codigo}`;
  const codigoFormateado = `${input.codigo.slice(0, 3)}-${input.codigo.slice(3)}`;

  const body = `
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1c1917;line-height:1.3;">Confirma tu correo electrónico</h1>
<p style="margin:0 0 16px 0;font-size:14px;color:#44403c;line-height:1.55;">
  Hola <strong>${escapeHtml(input.nombre)}</strong>, gracias por registrarte en <strong>${escapeHtml(brand.nombre)}</strong>. Para verificar que este correo es tuyo, ingresa el siguiente código en la pantalla de confirmación:
</p>
<div style="margin:24px 0;padding:20px;background:#fafaf9;border:1px dashed ${brand.colorPrimario};border-radius:12px;text-align:center;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;font-weight:600;">Tu código de verificación</div>
  <div style="margin-top:8px;font-size:32px;font-weight:700;letter-spacing:0.18em;color:${brand.colorPrimario};font-family:'Menlo','Consolas',monospace;">${escapeHtml(codigoFormateado)}</div>
  <div style="margin-top:8px;font-size:11px;color:#78716c;">Vence en ${input.vigenciaMinutos} minutos</div>
</div>
<p style="margin:16px 0 8px 0;font-size:13px;color:#44403c;line-height:1.55;"><strong>Pasos:</strong></p>
<ol style="margin:0 0 16px 18px;padding:0;font-size:13px;color:#44403c;line-height:1.7;">
  <li>Vuelve a la pantalla de confirmación en ${escapeHtml(brand.nombre)}</li>
  <li>Ingresa los 6 dígitos del código</li>
  <li>Espera la aprobación de un administrador para acceder al ERP</li>
</ol>
<p style="margin:16px 0 0 0;font-size:12px;color:#78716c;line-height:1.55;">
  Si no fuiste tú quien se registró, ignora este mensaje. Sin verificación, la cuenta queda inactiva y no se puede usar.
</p>`;

  const html = wrapInLayout(body, brand, preheader);
  const text = `Hola ${input.nombre},

Tu código de verificación para confirmar el correo en ${brand.nombre} es:

  ${codigoFormateado}

Vence en ${input.vigenciaMinutos} minutos.

Pasos:
  1. Vuelve a la pantalla de confirmación
  2. Ingresa los 6 dígitos del código
  3. Espera la aprobación de un administrador

Si no fuiste tú quien se registró, ignora este mensaje.

— Equipo ${brand.nombre}`;

  return {
    subject: `${brand.nombre} · Confirma tu correo (${codigoFormateado})`,
    html,
    text,
  };
}

// ── Recuperación de contraseña por LINK ─────────────────────────────

export interface PasswordResetLinkEmailInput {
  nombre: string;
  resetUrl: string;
  vigenciaMinutos: number;
  brand?: Partial<EmailBrand>;
}

export function buildPasswordResetLinkEmail(
  input: PasswordResetLinkEmailInput,
): EmailTemplate {
  const brand = resolveBrand(input.brand);
  const preheader = `Restablece tu contraseña en ${brand.nombre}. Enlace válido por ${input.vigenciaMinutos} minutos.`;

  const body = `
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1c1917;line-height:1.3;">Restablecer tu contraseña</h1>
<p style="margin:0 0 16px 0;font-size:14px;color:#44403c;line-height:1.55;">
  Hola <strong>${escapeHtml(input.nombre)}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${escapeHtml(brand.nombre)}</strong>. Haz clic en el botón para crear una nueva:
</p>
${buildButton('Restablecer contraseña', input.resetUrl, brand.colorPrimario)}
<p style="margin:16px 0 0 0;font-size:12px;color:#78716c;line-height:1.55;">
  Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
  <a href="${escapeHtml(input.resetUrl)}" style="color:${brand.colorPrimario};word-break:break-all;">${escapeHtml(input.resetUrl)}</a>
</p>
<div style="margin:24px 0 0 0;padding:12px 16px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:8px;">
  <p style="margin:0;font-size:12px;color:#78350f;line-height:1.55;">
    <strong>Importante:</strong> el enlace expira en ${input.vigenciaMinutos} minutos y solo se puede usar una vez.
  </p>
</div>
<p style="margin:16px 0 0 0;font-size:12px;color:#78716c;line-height:1.55;">
  Si no solicitaste este cambio, ignora este mensaje. Tu contraseña seguirá siendo la misma.
</p>`;

  const html = wrapInLayout(body, brand, preheader);
  const text = `Hola ${input.nombre},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${brand.nombre}.

Restablécela aquí:
  ${input.resetUrl}

El enlace expira en ${input.vigenciaMinutos} minutos y solo se puede usar una vez.

Si no solicitaste este cambio, ignora este mensaje. Tu contraseña seguirá siendo la misma.

— Equipo ${brand.nombre}`;

  return {
    subject: `${brand.nombre} · Restablece tu contraseña`,
    html,
    text,
  };
}

export interface WelcomeRegistrationEmailInput {
  nombre: string;
  brand?: Partial<EmailBrand>;
}

export function buildWelcomeRegistrationEmail(
  input: WelcomeRegistrationEmailInput,
): EmailTemplate {
  const brand = resolveBrand(input.brand);
  const preheader =
    'Recibimos tu solicitud de acceso. Un administrador la revisará pronto.';

  const body = `
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1c1917;line-height:1.3;">Recibimos tu solicitud</h1>
<p style="margin:0 0 16px 0;font-size:14px;color:#44403c;line-height:1.55;">
  Hola <strong>${escapeHtml(input.nombre)}</strong>, ya registramos tu solicitud de acceso a <strong>${escapeHtml(brand.nombre)}</strong>.
</p>
<div style="margin:20px 0;padding:16px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#78350f;line-height:1.55;">
    <strong>Tu cuenta está pendiente de aprobación.</strong><br/>
    Un administrador revisará tu solicitud y, si todo está en orden, te enviaremos un segundo correo confirmando que ya puedes ingresar.
  </p>
</div>
<p style="margin:16px 0 0 0;font-size:12px;color:#78716c;line-height:1.55;">
  No es necesario que hagas nada más por ahora. Si en 48 horas no recibes respuesta, contáctanos.
</p>`;

  const html = wrapInLayout(body, brand, preheader);
  const text = `Hola ${input.nombre},

Recibimos tu solicitud de acceso a ${brand.nombre}.

Tu cuenta está pendiente de aprobación. Un administrador la revisará y te enviaremos un segundo correo confirmando que ya puedes ingresar.

No es necesario que hagas nada más por ahora.

— Equipo ${brand.nombre}`;

  return {
    subject: `${brand.nombre} · Recibimos tu solicitud de acceso`,
    html,
    text,
  };
}

export interface AccountActivatedEmailInput {
  nombre: string;
  loginUrl: string;
  rolLabel?: string;
  brand?: Partial<EmailBrand>;
}

export function buildAccountActivatedEmail(
  input: AccountActivatedEmailInput,
): EmailTemplate {
  const brand = resolveBrand(input.brand);
  const preheader = 'Tu cuenta ya está activa. Puedes ingresar al sistema.';

  const body = `
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1c1917;line-height:1.3;">¡Tu cuenta está lista!</h1>
<p style="margin:0 0 16px 0;font-size:14px;color:#44403c;line-height:1.55;">
  Hola <strong>${escapeHtml(input.nombre)}</strong>, un administrador acaba de activar tu cuenta en <strong>${escapeHtml(brand.nombre)}</strong>. Ya puedes ingresar al sistema.
</p>
${input.rolLabel ? `<p style="margin:0 0 16px 0;font-size:13px;color:#57534e;line-height:1.55;">Rol asignado: <strong>${escapeHtml(input.rolLabel)}</strong></p>` : ''}
${buildButton('Ingresar al sistema', input.loginUrl, brand.colorPrimario)}
<p style="margin:16px 0 0 0;font-size:12px;color:#78716c;line-height:1.55;">
  Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
  <a href="${escapeHtml(input.loginUrl)}" style="color:${brand.colorPrimario};word-break:break-all;">${escapeHtml(input.loginUrl)}</a>
</p>
<p style="margin:16px 0 0 0;font-size:12px;color:#78716c;line-height:1.55;">
  Si tu administrador te asignó una contraseña temporal, el sistema te pedirá cambiarla al primer ingreso.
</p>`;

  const html = wrapInLayout(body, brand, preheader);
  const text = `Hola ${input.nombre},

Un administrador acaba de activar tu cuenta en ${brand.nombre}. Ya puedes ingresar al sistema.

${input.rolLabel ? `Rol asignado: ${input.rolLabel}\n\n` : ''}Ingresa aquí:
  ${input.loginUrl}

Si tu administrador te asignó una contraseña temporal, el sistema te pedirá cambiarla al primer ingreso.

— Equipo ${brand.nombre}`;

  return {
    subject: `${brand.nombre} · Tu cuenta ya está activa`,
    html,
    text,
  };
}
