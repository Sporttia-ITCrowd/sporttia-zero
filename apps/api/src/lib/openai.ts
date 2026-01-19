import OpenAI from 'openai';
import { createLogger } from './logger';

const logger = createLogger('openai');

// Validate required environment variable
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  logger.warn('OPENAI_API_KEY not set - AI features will not work');
}

// Create OpenAI client (singleton)
export const openai = apiKey
  ? new OpenAI({
      apiKey,
      timeout: 60000, // 60 second timeout
      maxRetries: 2,
    })
  : null;

// Check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return openai !== null;
}

// Default model configuration
export const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxTokens: 1024,
  temperature: 0.7,
} as const;
