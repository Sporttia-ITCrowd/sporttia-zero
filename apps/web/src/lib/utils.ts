import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a unique session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Get or create session ID from localStorage
export function getOrCreateSessionId(): string {
  const STORAGE_KEY = 'sporttia_zero_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}

// Supported languages for Sporttia ZERO
const SUPPORTED_LANGUAGES = ['es', 'en', 'pt', 'fr', 'de', 'it'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Detect user's browser language and return ISO-639-1 code
 * Falls back to 'es' (Spanish) if language is not supported
 */
export function getBrowserLanguage(): SupportedLanguage {
  // Get browser language (e.g., 'en-US', 'es', 'pt-BR')
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'es';

  // Extract the primary language code (e.g., 'en' from 'en-US')
  const primaryLang = browserLang.split('-')[0].toLowerCase();

  // Check if it's a supported language
  if (SUPPORTED_LANGUAGES.includes(primaryLang as SupportedLanguage)) {
    return primaryLang as SupportedLanguage;
  }

  // Default to Spanish
  return 'es';
}
