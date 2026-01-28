/**
 * Email templates for Sporttia ZERO
 * Supports multiple languages with dynamic AI translation for new languages
 */

import type { EmailTranslationContent } from './db-types';

export type SupportedLanguage = 'es' | 'en' | 'pt' | 'sv' | 'de' | 'fr' | 'it' | 'nl';

/**
 * Sporttia brand logo URL
 */
const SPORTTIA_LOGO_URL = 'https://zero.sporttia.com/sporttia-logo.png';

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
  language: string; // Now accepts any language code
}

// Re-export for backward compatibility
export type EmailTranslations = EmailTranslationContent;

/**
 * Support email for all languages
 */
const SUPPORT_EMAIL = 'info@sporttia.com';

/**
 * Hardcoded translations for base languages
 * These serve as fallback and are seeded to the database on startup
 */
const hardcodedTranslations: Record<SupportedLanguage, EmailTranslations> = {
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
    loginButton: 'Acceder a Sporttia Manager',
    supportText: '¿Necesitas ayuda? Escríbenos a',
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
    loginButton: 'Access Sporttia Manager',
    supportText: 'Need help? Contact us at',
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
    loginButton: 'Acessar Sporttia Manager',
    supportText: 'Precisa de ajuda? Escreva para',
    footer: '© Sporttia - A plataforma de gestão para centros esportivos',
  },
  sv: {
    subject: 'Välkommen till Sporttia! Ditt sportcenter är klart',
    greeting: 'Hej',
    intro: 'Grattis! Ditt sportcenter har skapats framgångsrikt på Sporttia.',
    accountCreated: 'Ditt konto är redo att börja ta emot bokningar.',
    yourDetails: 'Ditt sportcenters uppgifter',
    sportsCenterLabel: 'Sportcenter',
    cityLabel: 'Stad',
    adminEmailLabel: 'Administratörens e-post',
    facilitiesLabel: 'Anläggningar',
    facilitiesCountLabel: 'anläggning(ar) konfigurerade',
    credentialsTitle: 'Dina inloggningsuppgifter',
    usernameLabel: 'Användarnamn',
    passwordLabel: 'Lösenord',
    credentialsWarning: 'Av säkerhetsskäl rekommenderar vi att du ändrar ditt lösenord efter första inloggningen.',
    loginButton: 'Gå till Sporttia Manager',
    supportText: 'Behöver du hjälp? Kontakta oss på',
    footer: '© Sporttia - Plattformen för hantering av sportcenter',
  },
  de: {
    subject: 'Willkommen bei Sporttia! Ihr Sportzentrum ist bereit',
    greeting: 'Hallo',
    intro: 'Herzlichen Glückwunsch! Ihr Sportzentrum wurde erfolgreich bei Sporttia erstellt.',
    accountCreated: 'Ihr Konto ist bereit, Buchungen zu empfangen.',
    yourDetails: 'Ihre Sportzentrum-Details',
    sportsCenterLabel: 'Sportzentrum',
    cityLabel: 'Stadt',
    adminEmailLabel: 'Administrator-E-Mail',
    facilitiesLabel: 'Einrichtungen',
    facilitiesCountLabel: 'Einrichtung(en) konfiguriert',
    credentialsTitle: 'Ihre Zugangsdaten',
    usernameLabel: 'Benutzername',
    passwordLabel: 'Passwort',
    credentialsWarning: 'Aus Sicherheitsgründen empfehlen wir, Ihr Passwort nach der ersten Anmeldung zu ändern.',
    loginButton: 'Zu Sporttia Manager',
    supportText: 'Brauchen Sie Hilfe? Kontaktieren Sie uns unter',
    footer: '© Sporttia - Die Verwaltungsplattform für Sportzentren',
  },
  fr: {
    subject: 'Bienvenue sur Sporttia ! Votre centre sportif est prêt',
    greeting: 'Bonjour',
    intro: 'Félicitations ! Votre centre sportif a été créé avec succès sur Sporttia.',
    accountCreated: 'Votre compte est prêt à recevoir des réservations.',
    yourDetails: 'Détails de votre centre sportif',
    sportsCenterLabel: 'Centre sportif',
    cityLabel: 'Ville',
    adminEmailLabel: 'Email administrateur',
    facilitiesLabel: 'Installations',
    facilitiesCountLabel: 'installation(s) configurée(s)',
    credentialsTitle: 'Vos identifiants de connexion',
    usernameLabel: "Nom d'utilisateur",
    passwordLabel: 'Mot de passe',
    credentialsWarning: 'Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.',
    loginButton: 'Accéder à Sporttia Manager',
    supportText: "Besoin d'aide ? Contactez-nous à",
    footer: '© Sporttia - La plateforme de gestion pour centres sportifs',
  },
  it: {
    subject: 'Benvenuto su Sporttia! Il tuo centro sportivo è pronto',
    greeting: 'Ciao',
    intro: 'Congratulazioni! Il tuo centro sportivo è stato creato con successo su Sporttia.',
    accountCreated: 'Il tuo account è pronto per ricevere prenotazioni.',
    yourDetails: 'Dettagli del tuo centro sportivo',
    sportsCenterLabel: 'Centro sportivo',
    cityLabel: 'Città',
    adminEmailLabel: 'Email amministratore',
    facilitiesLabel: 'Strutture',
    facilitiesCountLabel: 'struttura/e configurata/e',
    credentialsTitle: 'Le tue credenziali di accesso',
    usernameLabel: 'Nome utente',
    passwordLabel: 'Password',
    credentialsWarning: 'Per sicurezza, ti consigliamo di cambiare la password dopo il primo accesso.',
    loginButton: 'Accedi a Sporttia Manager',
    supportText: 'Hai bisogno di aiuto? Contattaci a',
    footer: '© Sporttia - La piattaforma di gestione per centri sportivi',
  },
  nl: {
    subject: 'Welkom bij Sporttia! Je sportcentrum is klaar',
    greeting: 'Hallo',
    intro: 'Gefeliciteerd! Je sportcentrum is succesvol aangemaakt op Sporttia.',
    accountCreated: 'Je account is klaar om boekingen te ontvangen.',
    yourDetails: 'Gegevens van je sportcentrum',
    sportsCenterLabel: 'Sportcentrum',
    cityLabel: 'Stad',
    adminEmailLabel: 'Beheerder e-mail',
    facilitiesLabel: 'Faciliteiten',
    facilitiesCountLabel: 'faciliteit(en) geconfigureerd',
    credentialsTitle: 'Je inloggegevens',
    usernameLabel: 'Gebruikersnaam',
    passwordLabel: 'Wachtwoord',
    credentialsWarning: 'Voor de veiligheid raden we aan om je wachtwoord te wijzigen na je eerste login.',
    loginButton: 'Ga naar Sporttia Manager',
    supportText: 'Hulp nodig? Neem contact met ons op via',
    footer: '© Sporttia - Het beheerplatform voor sportcentra',
  },
};

/**
 * Get hardcoded translations for seeding the database
 */
export function getHardcodedTranslations(): Record<string, EmailTranslations> {
  return hardcodedTranslations;
}

/**
 * Get translations for a language synchronously (fallback only)
 * For dynamic translations, use getEmailTranslations from translation.service.ts
 */
function getTranslationsSync(language: string): EmailTranslations {
  const lang = language.toLowerCase().substring(0, 2) as SupportedLanguage;
  return hardcodedTranslations[lang] || hardcodedTranslations.en;
}

/**
 * Sporttia Manager login URL
 */
const SPORTTIA_MANAGER_URL = 'https://manager.sporttia.com';

/**
 * Generate the welcome email HTML with provided translations
 */
export function generateWelcomeEmailHtmlWithTranslations(
  data: WelcomeEmailData,
  t: EmailTranslations
): string {

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
      max-width: 180px;
      height: auto;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${SPORTTIA_LOGO_URL}" alt="Sporttia" class="logo">
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

    <div class="support">
      ${t.supportText} <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
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
 * Generate the welcome email plain text version with provided translations
 */
export function generateWelcomeEmailTextWithTranslations(
  data: WelcomeEmailData,
  t: EmailTranslations
): string {
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

${t.loginButton}: ${SPORTTIA_MANAGER_URL}

${t.supportText} ${SUPPORT_EMAIL}

${t.footer}
  `.trim();
}

/**
 * Sync versions for backward compatibility (use hardcoded translations only)
 */
export function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  const t = getTranslationsSync(data.language);
  return generateWelcomeEmailHtmlWithTranslations(data, t);
}

export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const t = getTranslationsSync(data.language);
  return generateWelcomeEmailTextWithTranslations(data, t);
}

export function getWelcomeEmailSubject(language: string): string {
  const t = getTranslationsSync(language);
  return t.subject;
}
