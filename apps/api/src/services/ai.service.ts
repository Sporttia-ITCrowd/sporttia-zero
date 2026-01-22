import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { openai, isOpenAIConfigured, AI_CONFIG } from '../lib/openai';
import { getSystemPrompt, getOpenAITools, type SportForPrompt } from '../lib/prompts';
import { createLogger } from '../lib/logger';
import type { CollectedFacility } from '../lib/db-types';
import { logOpenAIApiError } from './analytics.service';

const logger = createLogger('ai-service');

// Types for conversation messages from database
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Detected language info
export interface DetectedLanguage {
  code: string;
  confidence: 'high' | 'medium' | 'low';
}

// Collected sports center info
export interface CollectedSportsCenterInfo {
  name?: string;
  city?: string;
  country?: string;
}

// Collected admin info
export interface CollectedAdminInfo {
  name?: string;
  email?: string;
}

// Function call result types
export interface FunctionCallResult {
  name: string;
  data: unknown;
  /** For create_sports_center, this will be populated after execution */
  result?: {
    success: boolean;
    sporttiaId?: number;
    name?: string;
    adminEmail?: string;
    error?: string;
  };
}

// Response from AI completion
export interface AICompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string | null;
  detectedLanguage?: DetectedLanguage;
  functionCalls?: FunctionCallResult[];
}

// Custom error class for AI-related errors
export class AIServiceError extends Error {
  code: string;
  isRetryable: boolean;

  constructor(code: string, message: string, isRetryable = false) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

/**
 * Options for AI response generation
 */
export interface GenerateAIResponseOptions {
  messages: ConversationMessage[];
  language?: string;
  languageDetected?: boolean;
  isFirstMessage?: boolean;
  conversationId?: string;
  availableSports?: SportForPrompt[];
}

/**
 * Generate an AI response for a conversation
 * @param options Generation options
 */
export async function generateAIResponse(
  options: GenerateAIResponseOptions
): Promise<AICompletionResult>;

/**
 * Generate an AI response for a conversation (legacy signature)
 * @deprecated Use options object instead
 */
export async function generateAIResponse(
  messages: ConversationMessage[],
  language?: string,
  conversationId?: string
): Promise<AICompletionResult>;

export async function generateAIResponse(
  optionsOrMessages: GenerateAIResponseOptions | ConversationMessage[],
  languageArg?: string,
  conversationIdArg?: string
): Promise<AICompletionResult> {
  // Handle both new and legacy call signatures
  const options: GenerateAIResponseOptions = Array.isArray(optionsOrMessages)
    ? {
        messages: optionsOrMessages,
        language: languageArg,
        conversationId: conversationIdArg,
        languageDetected: !!languageArg && languageArg !== 'es',
        isFirstMessage: false,
      }
    : optionsOrMessages;

  const {
    messages,
    language = 'es',
    languageDetected = false,
    isFirstMessage = messages.length <= 1,
    conversationId,
    availableSports,
  } = options;

  if (!isOpenAIConfigured() || !openai) {
    throw new AIServiceError(
      'AI_NOT_CONFIGURED',
      'OpenAI is not configured. Please set OPENAI_API_KEY environment variable.',
      false
    );
  }

  // Determine if we need language detection
  const needsLanguageDetection = !languageDetected && isFirstMessage;

  // Build the messages array for OpenAI
  const chatMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: getSystemPrompt({
        language: languageDetected ? language : undefined,
        isFirstMessage,
        availableSports,
      }),
    },
    ...messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  ];

  // Get tools if language detection is needed
  const tools = getOpenAITools(!needsLanguageDetection);

  const startTime = Date.now();

  try {
    logger.info(
      {
        conversationId,
        messageCount: messages.length,
        model: AI_CONFIG.model,
        needsLanguageDetection,
      },
      'Calling OpenAI API'
    );

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: chatMessages,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      tools,
      // Force the AI to call detect_language function on first message
      tool_choice: needsLanguageDetection
        ? { type: 'function', function: { name: 'detect_language' } }
        : undefined,
    });

    const duration = Date.now() - startTime;
    const choice = completion.choices[0];
    const usage = completion.usage;

    // Check for function calls
    let detectedLanguage: DetectedLanguage | undefined;
    const functionCalls: FunctionCallResult[] = [];
    let responseContent = choice?.message?.content || '';

    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResponses: ChatCompletionMessageParam[] = [];

      for (const toolCall of choice.message.tool_calls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const functionName = toolCall.function.name;

          logger.info(
            { conversationId, functionName, args },
            `Function called: ${functionName}`
          );

          // Process each function call
          let toolResponse: { success: boolean; message: string; data?: unknown } = {
            success: true,
            message: 'OK',
          };

          switch (functionName) {
            case 'detect_language':
              detectedLanguage = {
                code: args.language_code,
                confidence: args.confidence,
              };
              toolResponse.message = `Language set to ${args.language_code}`;
              break;

            case 'collect_sports_center_info':
              functionCalls.push({
                name: 'collect_sports_center_info',
                data: { name: args.name, city: args.city, country: args.country },
              });
              toolResponse.message = 'Sports center info saved';
              toolResponse.data = args;
              break;

            case 'collect_admin_info':
              functionCalls.push({
                name: 'collect_admin_info',
                data: { name: args.name, email: args.email },
              });
              toolResponse.message = 'Admin info saved';
              toolResponse.data = args;
              break;

            case 'collect_facility':
              functionCalls.push({
                name: 'collect_facility',
                data: {
                  name: args.name,
                  sportId: args.sportId,
                  sportName: args.sportName,
                  schedules: args.schedules,
                } as CollectedFacility,
              });
              toolResponse.message = `Facility "${args.name}" saved`;
              toolResponse.data = args;
              break;

            case 'update_facility':
              functionCalls.push({
                name: 'update_facility',
                data: {
                  facilityIndex: args.facilityIndex,
                  name: args.name,
                  sportId: args.sportId,
                  sportName: args.sportName,
                  schedules: args.schedules,
                },
              });
              toolResponse.message = `Facility at index ${args.facilityIndex} updated`;
              toolResponse.data = args;
              break;

            case 'confirm_configuration':
              functionCalls.push({
                name: 'confirm_configuration',
                data: { confirmed: args.confirmed },
              });
              toolResponse.message = args.confirmed
                ? 'Configuration confirmed - ready to create sports center'
                : 'Configuration not confirmed';
              break;

            case 'request_human_help':
              functionCalls.push({
                name: 'request_human_help',
                data: { reason: args.reason, details: args.details },
              });
              toolResponse.message = 'Human help requested';
              break;

            case 'create_sports_center':
              // This function will be executed by the route handler
              // We just mark it as a pending action here
              functionCalls.push({
                name: 'create_sports_center',
                data: {},
              });
              toolResponse.message = 'Sports center creation initiated - awaiting execution';
              toolResponse.data = { pending: true };
              break;

            default:
              logger.warn({ conversationId, functionName }, 'Unknown function called');
              toolResponse = { success: false, message: 'Unknown function' };
          }

          toolResponses.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResponse),
          });
        } catch (parseError) {
          logger.warn(
            { conversationId, functionName: toolCall.function.name, error: parseError },
            'Failed to parse function arguments'
          );
          toolResponses.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: false, message: 'Failed to parse arguments' }),
          });
        }
      }

      // If we got function calls but no content, make a follow-up call
      if (!responseContent) {
        logger.info(
          { conversationId, functionCount: toolResponses.length },
          'Making follow-up call after function calls'
        );

        const followUpMessages: ChatCompletionMessageParam[] = [
          ...chatMessages,
          choice.message as ChatCompletionMessageParam,
          ...toolResponses,
        ];

        const followUpCompletion = await openai.chat.completions.create({
          model: AI_CONFIG.model,
          messages: followUpMessages,
          max_tokens: AI_CONFIG.maxTokens,
          temperature: AI_CONFIG.temperature,
          tools: getOpenAITools(languageDetected || !!detectedLanguage),
          tool_choice: 'auto', // Allow AI to call data collection functions after language detection
        });

        responseContent = followUpCompletion.choices[0]?.message?.content || '';

        // Check for additional function calls in follow-up and process them
        const followUpChoice = followUpCompletion.choices[0];
        const followUpToolResponses: ChatCompletionMessageParam[] = [];

        if (followUpChoice?.message?.tool_calls && followUpChoice.message.tool_calls.length > 0) {
          for (const toolCall of followUpChoice.message.tool_calls) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const funcName = toolCall.function.name;

              logger.info(
                { conversationId, functionName: funcName, args },
                `Follow-up function called: ${funcName}`
              );

              // Add to function calls for processing by route handler
              functionCalls.push({
                name: funcName,
                data: args,
              });

              followUpToolResponses.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: true, message: 'Data saved' }),
              });
            } catch {
              // Ignore parse errors in follow-up
            }
          }

          // If follow-up had function calls but no content, make another call for text response
          if (!responseContent && followUpToolResponses.length > 0) {
            logger.info(
              { conversationId, functionCount: followUpToolResponses.length },
              'Making second follow-up call for text response'
            );

            const secondFollowUp = await openai.chat.completions.create({
              model: AI_CONFIG.model,
              messages: [
                ...followUpMessages,
                followUpChoice.message as ChatCompletionMessageParam,
                ...followUpToolResponses,
              ],
              max_tokens: AI_CONFIG.maxTokens,
              temperature: AI_CONFIG.temperature,
              tools: getOpenAITools(true), // Language already detected
              tool_choice: 'none', // Force text response now
            });

            responseContent = secondFollowUp.choices[0]?.message?.content || '';

            // Update usage
            if (secondFollowUp.usage) {
              usage!.prompt_tokens += secondFollowUp.usage.prompt_tokens;
              usage!.completion_tokens += secondFollowUp.usage.completion_tokens;
              usage!.total_tokens += secondFollowUp.usage.total_tokens;
            }
          }
        }

        // Update usage
        if (followUpCompletion.usage) {
          usage!.prompt_tokens += followUpCompletion.usage.prompt_tokens;
          usage!.completion_tokens += followUpCompletion.usage.completion_tokens;
          usage!.total_tokens += followUpCompletion.usage.total_tokens;
        }
      }
    }

    // Log token usage for cost monitoring
    logger.info(
      {
        conversationId,
        model: completion.model,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        durationMs: duration,
        finishReason: choice?.finish_reason,
        detectedLanguage: detectedLanguage?.code,
      },
      'OpenAI API response received'
    );

    if (!responseContent) {
      throw new AIServiceError(
        'EMPTY_RESPONSE',
        'OpenAI returned an empty response',
        true
      );
    }

    return {
      content: responseContent,
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      model: completion.model,
      finishReason: choice?.finish_reason ?? null,
      detectedLanguage,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Handle specific OpenAI errors
    if (error instanceof AIServiceError) {
      throw error;
    }

    // Type guard for OpenAI errors
    const openAIError = error as { status?: number; code?: string; message?: string };

    logger.error(
      {
        conversationId,
        error: openAIError.message || String(error),
        status: openAIError.status,
        code: openAIError.code,
        durationMs: duration,
      },
      'OpenAI API error'
    );

    // Log to analytics
    logOpenAIApiError(
      openAIError.message || String(error),
      {
        status: openAIError.status,
        code: openAIError.code,
        durationMs: duration,
      },
      conversationId
    );

    // Rate limiting
    if (openAIError.status === 429) {
      throw new AIServiceError(
        'RATE_LIMITED',
        'AI service is temporarily overloaded. Please try again in a moment.',
        true
      );
    }

    // Authentication error
    if (openAIError.status === 401) {
      throw new AIServiceError(
        'AUTH_ERROR',
        'AI service authentication failed. Please contact support.',
        false
      );
    }

    // Server errors
    if (openAIError.status && openAIError.status >= 500) {
      throw new AIServiceError(
        'SERVICE_UNAVAILABLE',
        'AI service is temporarily unavailable. Please try again.',
        true
      );
    }

    // Timeout errors
    if (openAIError.code === 'ETIMEDOUT' || openAIError.code === 'ECONNABORTED') {
      throw new AIServiceError(
        'TIMEOUT',
        'AI service took too long to respond. Please try again.',
        true
      );
    }

    // Generic error
    throw new AIServiceError(
      'AI_ERROR',
      'An error occurred while generating a response. Please try again.',
      true
    );
  }
}

/**
 * Check if the AI service is available
 */
export function isAIServiceAvailable(): boolean {
  return isOpenAIConfigured();
}
