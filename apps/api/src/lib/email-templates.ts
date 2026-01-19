/**
 * Email templates for Sporttia ZERO
 * Supports Spanish (es), English (en), and Portuguese (pt)
 */

export type SupportedLanguage = 'es' | 'en' | 'pt';

export interface WelcomeEmailData {
  sportsCenterName: string;
  adminName: string;
  adminEmail: string;
  adminLogin: string;
  adminPassword: string;
  city: string;
  facilitiesCount: number;
  facilities: Array<{
    name: string;
    sportName: string;
  }>;
  sporttiaId: number;
  language: SupportedLanguage;
}

interface EmailTranslations {
  subject: string;
  greeting: string;
  intro: string;
  accountCreated: string;
  yourDetails: string;
  sportsCenterLabel: string;
  cityLabel: string;
  adminEmailLabel: string;
  facilitiesLabel: string;
  facilitiesCountLabel: string;
  credentialsTitle: string;
  usernameLabel: string;
  passwordLabel: string;
  credentialsWarning: string;
  nextStepsTitle: string;
  nextSteps: string[];
  freemiumTitle: string;
  freemiumInfo: string[];
  loginButton: string;
  supportText: string;
  supportEmail: string;
  footer: string;
}

const translations: Record<SupportedLanguage, EmailTranslations> = {
  es: {
    subject: '¡Bienvenido a Sporttia! Tu centro deportivo está listo',
    greeting: 'Hola',
    intro: '¡Enhorabuena! Tu centro deportivo ha sido creado exitosamente en Sporttia.',
    accountCreated: 'Tu cuenta está lista para empezar a recibir reservas.',
    yourDetails: 'Datos de tu centro deportivo',
    sportsCenterLabel: 'Centro deportivo',
    cityLabel: 'Ciudad',
    adminEmailLabel: 'Email de administrador',
    facilitiesLabel: 'Instalaciones',
    facilitiesCountLabel: 'instalación(es) configurada(s)',
    credentialsTitle: 'Tus credenciales de acceso',
    usernameLabel: 'Usuario',
    passwordLabel: 'Contraseña',
    credentialsWarning: 'Por seguridad, te recomendamos cambiar tu contraseña después del primer acceso.',
    nextStepsTitle: 'Próximos pasos',
    nextSteps: [
      'Accede al panel de administración con tus credenciales',
      'Cambia tu contraseña por una más segura',
      'Personaliza tu centro: añade logo, fotos y descripción',
      'Configura los métodos de pago para aceptar reservas online',
      'Comparte tu enlace de reservas con tus clientes',
    ],
    freemiumTitle: 'Tu plan gratuito incluye',
    freemiumInfo: [
      'Gestión ilimitada de instalaciones',
      'Hasta 50 reservas mensuales',
      'Panel de administración completo',
      'Soporte por email',
    ],
    loginButton: 'Acceder a Sporttia Manager',
    supportText: '¿Necesitas ayuda? Escríbenos a',
    supportEmail: 'soporte@sporttia.com',
    footer: '© Sporttia - La plataforma de gestión para centros deportivos',
  },
  en: {
    subject: 'Welcome to Sporttia! Your sports center is ready',
    greeting: 'Hello',
    intro: 'Congratulations! Your sports center has been successfully created on Sporttia.',
    accountCreated: 'Your account is ready to start receiving bookings.',
    yourDetails: 'Your sports center details',
    sportsCenterLabel: 'Sports center',
    cityLabel: 'City',
    adminEmailLabel: 'Admin email',
    facilitiesLabel: 'Facilities',
    facilitiesCountLabel: 'facility(ies) configured',
    credentialsTitle: 'Your login credentials',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    credentialsWarning: 'For security, we recommend changing your password after your first login.',
    nextStepsTitle: 'Next steps',
    nextSteps: [
      'Log in to the admin panel with your credentials',
      'Change your password to a more secure one',
      'Customize your center: add logo, photos, and description',
      'Set up payment methods to accept online bookings',
      'Share your booking link with your customers',
    ],
    freemiumTitle: 'Your free plan includes',
    freemiumInfo: [
      'Unlimited facility management',
      'Up to 50 monthly bookings',
      'Full admin dashboard',
      'Email support',
    ],
    loginButton: 'Access Sporttia Manager',
    supportText: 'Need help? Contact us at',
    supportEmail: 'support@sporttia.com',
    footer: '© Sporttia - The management platform for sports centers',
  },
  pt: {
    subject: 'Bem-vindo ao Sporttia! Seu centro esportivo está pronto',
    greeting: 'Olá',
    intro: 'Parabéns! Seu centro esportivo foi criado com sucesso no Sporttia.',
    accountCreated: 'Sua conta está pronta para começar a receber reservas.',
    yourDetails: 'Dados do seu centro esportivo',
    sportsCenterLabel: 'Centro esportivo',
    cityLabel: 'Cidade',
    adminEmailLabel: 'Email do administrador',
    facilitiesLabel: 'Instalações',
    facilitiesCountLabel: 'instalação(ões) configurada(s)',
    credentialsTitle: 'Suas credenciais de acesso',
    usernameLabel: 'Usuário',
    passwordLabel: 'Senha',
    credentialsWarning: 'Por segurança, recomendamos que você altere sua senha após o primeiro acesso.',
    nextStepsTitle: 'Próximos passos',
    nextSteps: [
      'Acesse o painel de administração com suas credenciais',
      'Altere sua senha para uma mais segura',
      'Personalize seu centro: adicione logo, fotos e descrição',
      'Configure os métodos de pagamento para aceitar reservas online',
      'Compartilhe seu link de reservas com seus clientes',
    ],
    freemiumTitle: 'Seu plano gratuito inclui',
    freemiumInfo: [
      'Gestão ilimitada de instalações',
      'Até 50 reservas mensais',
      'Painel de administração completo',
      'Suporte por email',
    ],
    loginButton: 'Acessar Sporttia Manager',
    supportText: 'Precisa de ajuda? Escreva para',
    supportEmail: 'suporte@sporttia.com',
    footer: '© Sporttia - A plataforma de gestão para centros esportivos',
  },
};

/**
 * Get translations for a language, defaulting to Spanish
 */
function getTranslations(language: string): EmailTranslations {
  const lang = language as SupportedLanguage;
  return translations[lang] || translations.es;
}

/**
 * Sporttia Manager login URL
 */
const SPORTTIA_MANAGER_URL = 'https://manager.sporttia.com';

/**
 * Generate the welcome email HTML
 */
export function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  const t = getTranslations(data.language);

  const facilitiesList = data.facilities
    .map((f) => `<li><strong>${f.name}</strong> - ${f.sportName}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    .logo-accent {
      color: #16a34a;
    }
    h1 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .intro {
      font-size: 16px;
      color: #475569;
      margin-bottom: 30px;
    }
    .details-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .details-box h2 {
      font-size: 18px;
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 10px;
    }
    .detail-label {
      font-weight: 600;
      color: #64748b;
      width: 150px;
      flex-shrink: 0;
    }
    .detail-value {
      color: #1e293b;
    }
    .facilities-list {
      margin: 10px 0;
      padding-left: 20px;
    }
    .facilities-list li {
      margin-bottom: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h3 {
      font-size: 16px;
      color: #1e293b;
      margin-bottom: 10px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 5px;
    }
    .section ul {
      margin: 0;
      padding-left: 20px;
    }
    .section li {
      margin-bottom: 8px;
      color: #475569;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .support {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      margin-top: 30px;
    }
    .support a {
      color: #2563eb;
    }
    .footer {
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .freemium-box {
      background-color: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .freemium-box h3 {
      color: #065f46;
      margin-top: 0;
      border: none;
      padding: 0;
    }
    .freemium-box li {
      color: #047857;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Sport<span class="logo-accent">tia</span></div>
    </div>

    <h1>${t.greeting}, ${data.adminName}! 🎉</h1>

    <p class="intro">
      ${t.intro}<br>
      ${t.accountCreated}
    </p>

    <div class="details-box">
      <h2>${t.yourDetails}</h2>
      <div class="detail-row">
        <span class="detail-label">${t.sportsCenterLabel}:</span>
        <span class="detail-value">${data.sportsCenterName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.cityLabel}:</span>
        <span class="detail-value">${data.city}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.adminEmailLabel}:</span>
        <span class="detail-value">${data.adminEmail}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.facilitiesLabel}:</span>
        <span class="detail-value">${data.facilitiesCount} ${t.facilitiesCountLabel}</span>
      </div>
      <ul class="facilities-list">
        ${facilitiesList}
      </ul>
    </div>

    <div class="details-box" style="background-color: #fef3c7; border-color: #fcd34d;">
      <h2 style="color: #92400e;">🔐 ${t.credentialsTitle}</h2>
      <div class="detail-row">
        <span class="detail-label">${t.usernameLabel}:</span>
        <span class="detail-value" style="font-family: monospace; font-weight: bold;">${data.adminLogin}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.passwordLabel}:</span>
        <span class="detail-value" style="font-family: monospace; font-weight: bold;">${data.adminPassword}</span>
      </div>
      <p style="font-size: 12px; color: #92400e; margin-top: 15px; margin-bottom: 0;">
        ⚠️ ${t.credentialsWarning}
      </p>
    </div>

    <div class="cta-container">
      <a href="${SPORTTIA_MANAGER_URL}" class="cta-button">${t.loginButton}</a>
    </div>

    <div class="section">
      <h3>${t.nextStepsTitle}</h3>
      <ul>
        ${t.nextSteps.map((step) => `<li>${step}</li>`).join('')}
      </ul>
    </div>

    <div class="freemium-box">
      <h3>✨ ${t.freemiumTitle}</h3>
      <ul>
        ${t.freemiumInfo.map((info) => `<li>${info}</li>`).join('')}
      </ul>
    </div>

    <div class="support">
      ${t.supportText} <a href="mailto:${t.supportEmail}">${t.supportEmail}</a>
    </div>

    <div class="footer">
      ${t.footer}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate the welcome email plain text version
 */
export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const t = getTranslations(data.language);

  const facilitiesList = data.facilities.map((f) => `  - ${f.name} (${f.sportName})`).join('\n');

  return `
${t.greeting}, ${data.adminName}!

${t.intro}
${t.accountCreated}

${t.yourDetails}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${t.sportsCenterLabel}: ${data.sportsCenterName}
${t.cityLabel}: ${data.city}
${t.adminEmailLabel}: ${data.adminEmail}
${t.facilitiesLabel}: ${data.facilitiesCount} ${t.facilitiesCountLabel}
${facilitiesList}

🔐 ${t.credentialsTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${t.usernameLabel}: ${data.adminLogin}
${t.passwordLabel}: ${data.adminPassword}

⚠️ ${t.credentialsWarning}

${t.nextStepsTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${t.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${t.loginButton}: ${SPORTTIA_MANAGER_URL}

${t.freemiumTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${t.freemiumInfo.map((info) => `• ${info}`).join('\n')}

${t.supportText} ${t.supportEmail}

${t.footer}
  `.trim();
}

/**
 * Get the email subject for welcome email
 */
export function getWelcomeEmailSubject(language: string): string {
  const t = getTranslations(language);
  return t.subject;
}
