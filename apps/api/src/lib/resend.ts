import { Resend } from 'resend';
import { createLogger } from './logger';

const logger = createLogger('resend');

// Resend client singleton
let resendClient: Resend | null = null;

/**
 * Get the Resend API key from environment
 */
function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY || null;
}

/**
 * Get the default "from" email address
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || 'Sporttia ZERO <zero@sporttia.com>';
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  const apiKey = getResendApiKey();
  return !!apiKey && apiKey !== 're_your-resend-api-key';
}

/**
 * Get the Resend client instance
 */
export function getResendClient(): Resend | null {
  if (!isResendConfigured()) {
    logger.warn('Resend API key not configured');
    return null;
  }

  if (!resendClient) {
    const apiKey = getResendApiKey();
    if (apiKey) {
      resendClient = new Resend(apiKey);
      logger.info('Resend client initialized');
    }
  }

  return resendClient;
}

/**
 * Email configuration
 */
export const EMAIL_CONFIG = {
  maxRetries: 2,
  retryDelayMs: 1000,
} as const;
