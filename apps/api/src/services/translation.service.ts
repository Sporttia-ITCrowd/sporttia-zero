import { db } from '../lib/db';
import { openai, isOpenAIConfigured } from '../lib/openai';
import { createLogger } from '../lib/logger';
import type { EmailTranslationContent } from '../lib/db-types';

const logger = createLogger('translation-service');

// Base English translations used as template for AI translation
const ENGLISH_TRANSLATIONS: EmailTranslationContent = {
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
  credentialsWarning:
    'For security, we recommend changing your password after your first login.',
  loginButton: 'Access Sporttia Manager',
  supportText: 'Need help? Contact us at',
  footer: '© Sporttia - The management platform for sports centers',
};

// Language code to language name mapping for AI prompt
const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  pt: 'Portuguese',
  sv: 'Swedish',
  de: 'German',
  fr: 'French',
  it: 'Italian',
  nl: 'Dutch',
  ca: 'Catalan',
  pl: 'Polish',
  ru: 'Russian',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  tr: 'Turkish',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  hi: 'Hindi',
  bn: 'Bengali',
  uk: 'Ukrainian',
  cs: 'Czech',
  el: 'Greek',
  ro: 'Romanian',
  hu: 'Hungarian',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  he: 'Hebrew',
};

/**
 * Get the language name from code, or return the code if unknown
 */
function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] || code;
}

/**
 * Get translations from database
 */
async function getTranslationsFromDb(
  languageCode: string,
  templateType: string = 'welcome'
): Promise<EmailTranslationContent | null> {
  if (!db) {
    logger.warn('Database not configured');
    return null;
  }

  try {
    const result = await db
      .selectFrom('email_translations')
      .select('translations')
      .where('language_code', '=', languageCode.toLowerCase())
      .where('template_type', '=', templateType)
      .executeTakeFirst();

    return result?.translations || null;
  } catch (error) {
    logger.error({ error, languageCode }, 'Failed to get translations from database');
    return null;
  }
}

/**
 * Save translations to database
 */
async function saveTranslationsToDb(
  languageCode: string,
  translations: EmailTranslationContent,
  templateType: string = 'welcome'
): Promise<void> {
  if (!db) {
    logger.warn('Database not configured - cannot save translations');
    return;
  }

  try {
    await db
      .insertInto('email_translations')
      .values({
        language_code: languageCode.toLowerCase(),
        template_type: templateType,
        translations,
      })
      .onConflict((oc) =>
        oc.columns(['language_code', 'template_type']).doUpdateSet({
          translations,
          updated_at: new Date(),
        })
      )
      .execute();

    logger.info({ languageCode, templateType }, 'Translations saved to database');
  } catch (error) {
    logger.error({ error, languageCode }, 'Failed to save translations to database');
  }
}

/**
 * Generate translations using AI
 */
async function generateTranslationsWithAI(
  languageCode: string
): Promise<EmailTranslationContent | null> {
  if (!isOpenAIConfigured() || !openai) {
    logger.warn('OpenAI not configured - cannot generate translations');
    return null;
  }

  const languageName = getLanguageName(languageCode);

  const prompt = `Translate the following JSON object containing email template strings from English to ${languageName}.
Keep the same JSON structure and keys, only translate the values.
The translations should be natural and professional, suitable for a business email.
Return ONLY the JSON object, no explanations or markdown.

${JSON.stringify(ENGLISH_TRANSLATIONS, null, 2)}`;

  try {
    logger.info({ languageCode, languageName }, 'Generating translations with AI');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator. Translate the provided JSON maintaining the exact structure and keys. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      logger.error({ languageCode }, 'Empty response from AI');
      return null;
    }

    // Parse the JSON response
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const translations = JSON.parse(cleanedContent) as EmailTranslationContent;

    // Validate that all keys are present
    const requiredKeys = Object.keys(ENGLISH_TRANSLATIONS);
    const hasAllKeys = requiredKeys.every((key) => key in translations);

    if (!hasAllKeys) {
      logger.error({ languageCode, translations }, 'AI response missing required keys');
      return null;
    }

    logger.info(
      {
        languageCode,
        tokensUsed: completion.usage?.total_tokens,
      },
      'Translations generated successfully'
    );

    return translations;
  } catch (error) {
    logger.error({ error, languageCode }, 'Failed to generate translations with AI');
    return null;
  }
}

/**
 * Get translations for a language, generating with AI if needed
 * Returns English translations as fallback if all else fails
 */
export async function getEmailTranslations(
  languageCode: string,
  templateType: string = 'welcome'
): Promise<EmailTranslationContent> {
  const normalizedCode = languageCode.toLowerCase().substring(0, 2);

  // 1. Try to get from database first
  const dbTranslations = await getTranslationsFromDb(normalizedCode, templateType);
  if (dbTranslations) {
    logger.debug({ languageCode: normalizedCode }, 'Using translations from database');
    return dbTranslations;
  }

  // 2. If English, return the hardcoded translations
  if (normalizedCode === 'en') {
    // Save to DB for consistency
    await saveTranslationsToDb(normalizedCode, ENGLISH_TRANSLATIONS, templateType);
    return ENGLISH_TRANSLATIONS;
  }

  // 3. Try to generate with AI
  const aiTranslations = await generateTranslationsWithAI(normalizedCode);
  if (aiTranslations) {
    // Save to database for future use
    await saveTranslationsToDb(normalizedCode, aiTranslations, templateType);
    return aiTranslations;
  }

  // 4. Fallback to English
  logger.warn(
    { languageCode: normalizedCode },
    'Falling back to English translations'
  );
  return ENGLISH_TRANSLATIONS;
}

/**
 * Pre-populate database with hardcoded translations
 * Call this on app startup to ensure base languages are in DB
 */
export async function seedBaseTranslations(): Promise<void> {
  // Import the hardcoded translations from email-templates
  const { getHardcodedTranslations } = await import('../lib/email-templates');
  const hardcodedTranslations = getHardcodedTranslations();

  for (const [langCode, translations] of Object.entries(hardcodedTranslations)) {
    await saveTranslationsToDb(langCode, translations as EmailTranslationContent);
  }

  logger.info('Base translations seeded to database');
}
