import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import nl from './locales/nl.json';
import pt from './locales/pt.json';
import pl from './locales/pl.json';
import it from './locales/it.json';

// Supported UI languages for browser detection
export const SUPPORTED_UI_LANGUAGES = ['en', 'es', 'fr', 'de', 'nl', 'pt', 'pl', 'it'] as const;
export type SupportedUILanguage = (typeof SUPPORTED_UI_LANGUAGES)[number];

/**
 * Detect user's browser language and return ISO-639-1 code
 * Falls back to 'en' (English) if language is not supported
 */
export function detectBrowserLanguage(): SupportedUILanguage {
  // Get browser language (e.g., 'en-US', 'es', 'pt-BR')
  const browserLang =
    navigator.language ||
    (navigator as { userLanguage?: string }).userLanguage ||
    'en';

  // Extract the primary language code (e.g., 'en' from 'en-US')
  const primaryLang = browserLang.split('-')[0].toLowerCase();

  // Check if it's a supported language
  if (SUPPORTED_UI_LANGUAGES.includes(primaryLang as SupportedUILanguage)) {
    return primaryLang as SupportedUILanguage;
  }

  // Default to English
  return 'en';
}

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  nl: { translation: nl },
  pt: { translation: pt },
  pl: { translation: pl },
  it: { translation: it },
};

i18n.use(initReactI18next).init({
  resources,
  lng: detectBrowserLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
