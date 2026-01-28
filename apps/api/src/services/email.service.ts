import { getResendClient, isResendConfigured, getEmailFrom, EMAIL_CONFIG } from '../lib/resend';
import {
  generateWelcomeEmailHtmlWithTranslations,
  generateWelcomeEmailTextWithTranslations,
  type WelcomeEmailData,
} from '../lib/email-templates';
import { getEmailTranslations } from './translation.service';
import { createLogger } from '../lib/logger';
import { logEmailFailed } from './analytics.service';

const logger = createLogger('email-service');

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface WelcomeEmailParams {
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
  language: string;
}

/**
 * Normalize language code (take first 2 characters)
 */
function normalizeLanguage(lang: string): string {
  return lang.toLowerCase().substring(0, 2);
}

/**
 * Send welcome email after sports center creation
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<SendEmailResult> {
  const { adminEmail, sportsCenterName, sporttiaId } = params;

  logger.info(
    {
      to: adminEmail,
      sportsCenterName,
      sporttiaId,
      language: params.language,
    },
    'Sending welcome email'
  );

  // Check if Resend is configured
  if (!isResendConfigured()) {
    logger.warn('Resend not configured - skipping welcome email');
    return {
      success: false,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Email service not configured',
      },
    };
  }

  const resend = getResendClient();
  if (!resend) {
    logger.error('Failed to get Resend client');
    return {
      success: false,
      error: {
        code: 'CLIENT_ERROR',
        message: 'Failed to initialize email client',
      },
    };
  }

  // Prepare email data
  const language = normalizeLanguage(params.language);
  const emailData: WelcomeEmailData = {
    sportsCenterName: params.sportsCenterName,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    adminLogin: params.adminLogin,
    adminPassword: params.adminPassword,
    city: params.city,
    facilitiesCount: params.facilitiesCount,
    facilities: params.facilities,
    sporttiaId: params.sporttiaId,
    language,
  };

  // Get translations (from DB or generate with AI for new languages)
  const translations = await getEmailTranslations(language);

  const subject = translations.subject;
  const html = generateWelcomeEmailHtmlWithTranslations(emailData, translations);
  const text = generateWelcomeEmailTextWithTranslations(emailData, translations);

  // Attempt to send with retries
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= EMAIL_CONFIG.maxRetries; attempt++) {
    try {
      logger.info(
        { to: adminEmail, attempt, maxRetries: EMAIL_CONFIG.maxRetries },
        `Email send attempt ${attempt}`
      );

      const result = await resend.emails.send({
        from: getEmailFrom(),
        to: adminEmail,
        subject,
        html,
        text,
        tags: [
          { name: 'type', value: 'welcome' },
          { name: 'sports_center_id', value: String(sporttiaId) },
          { name: 'language', value: language },
        ],
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      logger.info(
        {
          to: adminEmail,
          messageId: result.data?.id,
          sportsCenterName,
          sporttiaId,
        },
        'Welcome email sent successfully'
      );

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn(
        {
          to: adminEmail,
          attempt,
          error: lastError.message,
        },
        `Email send attempt ${attempt} failed`
      );

      // Wait before retrying (except on last attempt)
      if (attempt < EMAIL_CONFIG.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, EMAIL_CONFIG.retryDelayMs));
      }
    }
  }

  // All retries failed
  logger.error(
    {
      to: adminEmail,
      sportsCenterName,
      sporttiaId,
      error: lastError?.message,
    },
    'Failed to send welcome email after all retries'
  );

  // Log to analytics for the Errors page in Manager
  logEmailFailed(lastError?.message || 'Failed to send email', {
    to: adminEmail,
    sportsCenterName,
    sporttiaId,
    retries: EMAIL_CONFIG.maxRetries,
  });

  return {
    success: false,
    error: {
      code: 'SEND_FAILED',
      message: lastError?.message || 'Failed to send email',
    },
  };
}

/**
 * Check if email service is available
 */
export function isEmailServiceAvailable(): boolean {
  return isResendConfigured();
}
