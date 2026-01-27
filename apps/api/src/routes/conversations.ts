import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import {
  conversationRepository,
  messageRepository,
} from '../repositories/conversation.repository';
import { sendSuccess, sendError, ErrorCodes } from '../lib/response';
import {
  createConversationSchema,
  addMessageSchema,
  uuidSchema,
} from '../lib/validation';
import { createLogger } from '../lib/logger';
import {
  generateAIResponse,
  isAIServiceAvailable,
  AIServiceError,
  type ConversationMessage,
} from '../services/ai.service';
import { getSports } from '../lib/sporttia-client';
import { createSportsCenterFromConversation } from '../services/sports-center-creation.service';

const router = Router();
const logger = createLogger('conversations-api');


// Helper to convert DB record to API response format (snake_case to camelCase)
function toApiConversation(conv: {
  id: string;
  session_id: string;
  language: string;
  status: string;
  sports_center_id: string | null;
  collected_data?: {
    sportsCenterName?: string;
    city?: string;
    language?: string;
    adminName?: string;
    adminEmail?: string;
    facilities?: Array<{
      name: string;
      sportId: number;
      sportName: string;
      schedules: Array<{
        weekdays: number[];
        startTime: string;
        endTime: string;
        duration: number;
        rate: number;
      }>;
    }>;
    confirmed?: boolean;
  } | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: conv.id,
    sessionId: conv.session_id,
    language: conv.language,
    status: conv.status,
    sportsCenterId: conv.sports_center_id,
    collectedData: conv.collected_data ?? null,
    createdAt: conv.created_at.toISOString(),
    updatedAt: conv.updated_at.toISOString(),
  };
}

function toApiMessage(msg: {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}) {
  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    role: msg.role,
    content: msg.content,
    metadata: msg.metadata,
    createdAt: msg.created_at.toISOString(),
  };
}

/**
 * POST /api/conversations
 * Creates a new conversation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createConversationSchema.parse(req.body);

    logger.info({ sessionId: validated.sessionId }, 'Creating new conversation');

    const conversation = await conversationRepository.create({
      session_id: validated.sessionId,
      language: validated.language || 'es',
      status: 'active',
      sports_center_id: null,
    });

    if (!conversation) {
      return sendError(
        res,
        ErrorCodes.DATABASE_ERROR,
        'Failed to create conversation',
        500
      );
    }

    logger.info({ conversationId: conversation.id }, 'Conversation created successfully');

    sendSuccess(res, toApiConversation(conversation), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, 'Validation error creating conversation');
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request data',
        400,
        { errors: error.errors }
      );
    }

    logger.error({ error }, 'Error creating conversation');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * GET /api/conversations/:id
 * Retrieves a conversation with all its messages
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = uuidSchema.parse(req.params.id);

    logger.info({ conversationId: id }, 'Fetching conversation');

    const conversation = await conversationRepository.findById(id);

    if (!conversation) {
      logger.warn({ conversationId: id }, 'Conversation not found');
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    const messages = await messageRepository.findByConversationId(id);

    const responseData = {
      ...toApiConversation(conversation),
      messages: messages.map(toApiMessage),
    };

    sendSuccess(res, responseData);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ id: req.params.id }, 'Invalid conversation ID format');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid conversation ID', 400);
    }

    logger.error({ error, conversationId: req.params.id }, 'Error fetching conversation');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * POST /api/conversations/:id/messages
 * Adds a user message to a conversation and generates AI response
 */
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = uuidSchema.parse(req.params.id);
    const validated = addMessageSchema.parse(req.body);

    logger.info({ conversationId }, 'Adding message to conversation');

    // Check if conversation exists
    const conversation = await conversationRepository.findById(conversationId);

    if (!conversation) {
      logger.warn({ conversationId }, 'Conversation not found for message');
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    if (conversation.status !== 'active') {
      logger.warn({ conversationId, status: conversation.status }, 'Cannot add message to inactive conversation');
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Cannot add messages to a non-active conversation',
        400
      );
    }

    // Create user message
    const userMessage = await messageRepository.create({
      conversation_id: conversationId,
      role: 'user',
      content: validated.content,
      metadata: null,
    });

    if (!userMessage) {
      return sendError(res, ErrorCodes.DATABASE_ERROR, 'Failed to create message', 500);
    }

    logger.info({ messageId: userMessage.id, conversationId }, 'User message added');

    // Generate AI response if OpenAI is configured
    let assistantMessage = null;

    if (isAIServiceAvailable()) {
      try {
        // Get conversation history for context
        const existingMessages = await messageRepository.findByConversationId(conversationId);

        // Determine if this is the first user message (for language detection)
        const userMessageCount = existingMessages.filter((m) => m.role === 'user').length;
        const isFirstMessage = userMessageCount === 1;

        // Check if language has already been detected (non-default or explicitly set)
        // We consider language detected if there are already assistant messages in the conversation
        const hasAssistantMessages = existingMessages.some((m) => m.role === 'assistant');
        const languageDetected = hasAssistantMessages;

        // Convert to format expected by AI service
        const conversationHistory: ConversationMessage[] = existingMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        }));

        // Fetch available sports for AI context
        let availableSports: Array<{ id: number; name: string }> = [];
        try {
          const sports = await getSports();
          availableSports = sports.map((s) => ({ id: s.id, name: s.name }));
        } catch (sportsError) {
          logger.warn({ conversationId, error: sportsError }, 'Failed to fetch sports list');
          // Continue without sports list - AI will still work
        }

        // Generate AI response with language detection options
        const aiResult = await generateAIResponse({
          messages: conversationHistory,
          language: conversation.language,
          languageDetected,
          isFirstMessage,
          conversationId,
          availableSports,
        });

        // If language was detected by AI, update the conversation record and collected data
        if (aiResult.detectedLanguage) {
          const newLanguage = aiResult.detectedLanguage.code;

          // Always store the detected language in collected_data
          await conversationRepository.updateCollectedData(conversationId, (current) => ({
            ...current,
            language: newLanguage,
          }));

          // Only update conversation.language if it's different
          if (newLanguage !== conversation.language) {
            logger.info(
              {
                conversationId,
                oldLanguage: conversation.language,
                newLanguage,
                confidence: aiResult.detectedLanguage.confidence,
              },
              'Updating conversation language'
            );
            await conversationRepository.updateLanguage(conversationId, newLanguage);
          }
        }

        // Process function calls and store collected data
        if (aiResult.functionCalls && aiResult.functionCalls.length > 0) {
          for (const funcCall of aiResult.functionCalls) {
            logger.info(
              { conversationId, functionName: funcCall.name, data: funcCall.data },
              'Processing function call result'
            );

            switch (funcCall.name) {
              case 'lookup_city': {
                // lookup_city is informational - the AI uses the results to guide the conversation
                // No database update needed here, just log it
                const data = funcCall.data as {
                  query: string;
                  countryHint?: string;
                  candidates: Array<{
                    placeId: string;
                    name: string;
                    country: string;
                    countryCode: string;
                  }>;
                };
                logger.info(
                  {
                    conversationId,
                    query: data.query,
                    candidatesCount: data.candidates?.length ?? 0,
                  },
                  'City lookup performed'
                );
                break;
              }

              case 'collect_sports_center_info': {
                const data = funcCall.data as { name?: string; city?: string; country?: string; placeId?: string };
                await conversationRepository.updateSportsCenterInfo(conversationId, data);
                break;
              }

              case 'collect_admin_info': {
                const data = funcCall.data as { name?: string; email?: string };
                await conversationRepository.updateAdminInfo(conversationId, data);
                break;
              }

              case 'collect_facility': {
                const data = funcCall.data as {
                  name: string;
                  sportId: number;
                  sportName: string;
                  schedules: Array<{
                    weekdays: number[];
                    startTime: string;
                    endTime: string;
                    duration: number;
                    rate: number;
                  }>;
                };
                await conversationRepository.addFacility(conversationId, data);
                break;
              }

              case 'update_facility': {
                const data = funcCall.data as {
                  facilityIndex: number;
                  name?: string;
                  sportId?: number;
                  sportName?: string;
                  schedules?: Array<{
                    weekdays: number[];
                    startTime: string;
                    endTime: string;
                    duration: number;
                    rate: number;
                  }>;
                };
                await conversationRepository.updateFacility(conversationId, data.facilityIndex, {
                  ...(data.name && { name: data.name }),
                  ...(data.sportId && { sportId: data.sportId }),
                  ...(data.sportName && { sportName: data.sportName }),
                  ...(data.schedules && { schedules: data.schedules }),
                });
                break;
              }

              case 'confirm_configuration': {
                const data = funcCall.data as { confirmed: boolean };

                // Auto-trigger sports center creation when confirmed
                // This ensures creation happens even if AI doesn't call create_sports_center
                if (data.confirmed) {
                  // First, validate that all required data is present
                  const readiness = await conversationRepository.getConfigurationReadiness(conversationId);

                  if (!readiness || !readiness.isReady) {
                    const missingFields = readiness?.missing || ['unknown'];
                    logger.warn(
                      { conversationId, missing: missingFields },
                      'Cannot confirm - configuration incomplete'
                    );

                    // Don't set confirmed=true if data is incomplete
                    funcCall.result = {
                      success: false,
                      error: `Cannot confirm: missing required data: ${missingFields.join(', ')}`,
                      missingFields,
                    };

                    // Record the error for tracking
                    await conversationRepository.recordError(conversationId, {
                      code: 'INCOMPLETE_DATA',
                      message: `Configuration incomplete - missing: ${missingFields.join(', ')}`,
                    });

                    // IMPORTANT: Generate a follow-up AI response to inform the user about missing data
                    // This prevents the confirmation loop where AI keeps asking for confirmation
                    const incompleteContext = `SYSTEM: The confirmation FAILED because the following required data is missing: ${missingFields.join(', ')}. DO NOT ask for confirmation again. Instead, ask the user to provide the missing information: ${missingFields.join(', ')}. Once they provide it, you can show the summary and ask for confirmation again.`;
                    conversationHistory.push({
                      role: 'system',
                      content: incompleteContext,
                    });

                    // Make a follow-up AI call to generate the appropriate response
                    logger.info({ conversationId, missingFields }, 'Generating response for incomplete configuration');
                    const incompleteResponse = await generateAIResponse({
                      messages: conversationHistory,
                      language: conversation.language,
                      languageDetected: true,
                      isFirstMessage: false,
                      conversationId,
                      availableSports,
                    });

                    // Use the incomplete response content
                    aiResult.content = incompleteResponse.content;
                    aiResult.usage.promptTokens += incompleteResponse.usage.promptTokens;
                    aiResult.usage.completionTokens += incompleteResponse.usage.completionTokens;
                    aiResult.usage.totalTokens += incompleteResponse.usage.totalTokens;

                    break;
                  }

                  // Data is complete, now set confirmed and trigger creation
                  await conversationRepository.setConfirmed(conversationId, true);
                  logger.info({ conversationId }, 'Auto-triggering sports center creation after confirmation');

                  const creationResult = await createSportsCenterFromConversation(conversationId);

                  funcCall.result = {
                    success: creationResult.success,
                    sporttiaId: creationResult.sportsCenter?.sporttiaId,
                    name: creationResult.sportsCenter?.name,
                    adminEmail: creationResult.sportsCenter?.adminEmail,
                    error: creationResult.error?.message,
                  };

                  if (creationResult.success) {
                    logger.info(
                      {
                        conversationId,
                        sporttiaId: creationResult.sportsCenter?.sporttiaId,
                        name: creationResult.sportsCenter?.name,
                      },
                      'Sports center created successfully via auto-trigger'
                    );
                  } else {
                    logger.error(
                      { conversationId, error: creationResult.error },
                      'Sports center creation failed via auto-trigger'
                    );

                    // Record the creation error for tracking
                    await conversationRepository.recordError(conversationId, {
                      code: creationResult.error?.code || 'CREATION_FAILED',
                      message: creationResult.error?.message || 'Unknown error during creation',
                    });
                  }
                } else {
                  // User declined confirmation
                  await conversationRepository.setConfirmed(conversationId, false);
                }
                break;
              }

              case 'request_human_help': {
                // Log and record escalation request
                const data = funcCall.data as { reason: string; details?: string };
                const escalationReason = data.details
                  ? `${data.reason}: ${data.details}`
                  : data.reason;

                logger.info(
                  { conversationId, reason: data.reason, details: data.details },
                  'Human help requested via AI'
                );

                // Record escalation in database
                await conversationRepository.markEscalated(conversationId, escalationReason);
                break;
              }

              case 'create_sports_center': {
                // Execute the sports center creation
                logger.info({ conversationId }, 'Executing sports center creation');

                const creationResult = await createSportsCenterFromConversation(conversationId);

                // Store the result in the function call for reference
                funcCall.result = {
                  success: creationResult.success,
                  sporttiaId: creationResult.sportsCenter?.sporttiaId,
                  name: creationResult.sportsCenter?.name,
                  adminEmail: creationResult.sportsCenter?.adminEmail,
                  error: creationResult.error?.message,
                };

                if (creationResult.success) {
                  logger.info(
                    {
                      conversationId,
                      sporttiaId: creationResult.sportsCenter?.sporttiaId,
                      name: creationResult.sportsCenter?.name,
                    },
                    'Sports center created successfully'
                  );

                  // Inject a system message with the creation result for follow-up
                  // This helps the AI generate the proper success message
                  // IMPORTANT: Do NOT include the password in the chat - it's sent via email for security
                  const successContext = `SYSTEM: Sports center "${creationResult.sportsCenter?.name}" was created successfully! Sporttia ID: ${creationResult.sportsCenter?.sporttiaId}. Admin email: ${creationResult.sportsCenter?.adminEmail}. IMPORTANT: The login credentials (username and password) have been sent to their email address (${creationResult.sportsCenter?.adminEmail}). Do NOT show the password in the chat for security reasons. Tell the user to check their email for the login credentials. Congratulate them and explain next steps: check email for credentials, access manager.sporttia.com, change password on first login, and customize their center.`;
                  conversationHistory.push({
                    role: 'system',
                    content: successContext,
                  });

                  // Make a follow-up AI call to generate the success response
                  logger.info({ conversationId }, 'Generating success response for sports center creation');
                  const successResponse = await generateAIResponse({
                    messages: conversationHistory,
                    language: conversation.language,
                    languageDetected: true,
                    isFirstMessage: false,
                    conversationId,
                    availableSports,
                  });

                  // Use the success response content
                  aiResult.content = successResponse.content;
                  aiResult.usage.promptTokens += successResponse.usage.promptTokens;
                  aiResult.usage.completionTokens += successResponse.usage.completionTokens;
                  aiResult.usage.totalTokens += successResponse.usage.totalTokens;
                } else {
                  logger.error(
                    {
                      conversationId,
                      error: creationResult.error,
                    },
                    'Sports center creation failed'
                  );

                  // Record error in the conversation for tracking/retry logic
                  await conversationRepository.recordError(conversationId, {
                    code: creationResult.error?.code || 'CREATION_FAILED',
                    message: creationResult.error?.message || 'Unknown error during creation',
                  });

                  // Inject error context for follow-up
                  const errorContext = `SYSTEM: Sports center creation failed. Error: ${creationResult.error?.message}. Retryable: ${creationResult.error?.isRetryable}. Help the user understand what happened and what to do next.`;
                  conversationHistory.push({
                    role: 'system',
                    content: errorContext,
                  });

                  // Make a follow-up AI call to generate the error response
                  logger.info({ conversationId }, 'Generating error response for sports center creation');
                  const errorResponse = await generateAIResponse({
                    messages: conversationHistory,
                    language: conversation.language,
                    languageDetected: true,
                    isFirstMessage: false,
                    conversationId,
                    availableSports,
                  });

                  // Use the error response content
                  aiResult.content = errorResponse.content;
                  aiResult.usage.promptTokens += errorResponse.usage.promptTokens;
                  aiResult.usage.completionTokens += errorResponse.usage.completionTokens;
                  aiResult.usage.totalTokens += errorResponse.usage.totalTokens;
                }
                break;
              }
            }
          }
        }

        // Save assistant message to database
        const savedAssistantMessage = await messageRepository.create({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResult.content,
          metadata: {
            model: aiResult.model,
            usage: aiResult.usage,
            finishReason: aiResult.finishReason,
            detectedLanguage: aiResult.detectedLanguage,
            functionCalls: aiResult.functionCalls,
          },
        });

        if (savedAssistantMessage) {
          assistantMessage = toApiMessage(savedAssistantMessage);
          logger.info(
            {
              messageId: savedAssistantMessage.id,
              conversationId,
              tokens: aiResult.usage.totalTokens,
              detectedLanguage: aiResult.detectedLanguage?.code,
            },
            'Assistant message saved'
          );
        }
      } catch (aiError) {
        // Log AI error but don't fail the request - user message was saved
        if (aiError instanceof AIServiceError) {
          logger.error(
            {
              conversationId,
              code: aiError.code,
              error: aiError.message,
              isRetryable: aiError.isRetryable,
            },
            'AI service error'
          );
          // Record error for tracking
          await conversationRepository.recordError(conversationId, {
            code: aiError.code,
            message: aiError.message,
          });
        } else {
          const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
          logger.error({ conversationId, error: aiError }, 'Unexpected AI error');
          // Record unexpected error
          await conversationRepository.recordError(conversationId, {
            code: 'AI_UNEXPECTED_ERROR',
            message: errorMessage,
          });
        }
        // Continue without AI response - user can retry
      }
    } else {
      logger.warn({ conversationId }, 'AI service not available - returning without AI response');
    }

    // Get the current language (may have been updated by AI detection)
    const updatedConversation = await conversationRepository.findById(conversationId);
    const currentLanguage = updatedConversation?.language || conversation.language;

    sendSuccess(res, {
      message: toApiMessage(userMessage),
      assistantMessage,
      language: currentLanguage,
    }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, 'Validation error adding message');
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request data',
        400,
        { errors: error.errors }
      );
    }

    logger.error({ error, conversationId: req.params.id }, 'Error adding message');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * GET /api/conversations/:id/collected-data
 * Returns the collected data and progress status for a conversation
 */
router.get('/:id/collected-data', async (req: Request, res: Response) => {
  try {
    const conversationId = uuidSchema.parse(req.params.id);

    logger.info({ conversationId }, 'Fetching collected data status');

    const conversation = await conversationRepository.findById(conversationId);

    if (!conversation) {
      logger.warn({ conversationId }, 'Conversation not found');
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    const collectedData = conversation.collected_data ?? {};

    // Calculate completion progress
    const progress = {
      sportsCenterInfo: !!(collectedData.sportsCenterName && collectedData.city),
      adminInfo: !!(collectedData.adminName && collectedData.adminEmail),
      facilities: (collectedData.facilities?.length ?? 0) > 0,
      confirmed: collectedData.confirmed === true,
    };

    const completedSteps = Object.values(progress).filter(Boolean).length;
    const totalSteps = 4;

    sendSuccess(res, {
      collectedData,
      progress,
      completionPercentage: Math.round((completedSteps / totalSteps) * 100),
      isComplete: completedSteps === totalSteps,
      missingFields: {
        sportsCenterName: !collectedData.sportsCenterName,
        city: !collectedData.city,
        adminName: !collectedData.adminName,
        adminEmail: !collectedData.adminEmail,
        facilities: (collectedData.facilities?.length ?? 0) === 0,
        confirmation: !collectedData.confirmed,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ id: req.params.id }, 'Invalid conversation ID format');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid conversation ID', 400);
    }

    logger.error({ error, conversationId: req.params.id }, 'Error fetching collected data');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * GET /api/conversations/:id/summary
 * Returns a formatted configuration summary for display
 */
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const conversationId = uuidSchema.parse(req.params.id);

    logger.info({ conversationId }, 'Fetching configuration summary');

    const summary = await conversationRepository.getConfigurationSummary(conversationId);

    if (!summary) {
      logger.warn({ conversationId }, 'Conversation not found');
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    sendSuccess(res, summary);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ id: req.params.id }, 'Invalid conversation ID format');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid conversation ID', 400);
    }

    logger.error({ error, conversationId: req.params.id }, 'Error fetching configuration summary');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * GET /api/conversations/:id/readiness
 * Returns the readiness status for configuration confirmation
 */
router.get('/:id/readiness', async (req: Request, res: Response) => {
  try {
    const conversationId = uuidSchema.parse(req.params.id);

    logger.info({ conversationId }, 'Checking configuration readiness');

    const readiness = await conversationRepository.getConfigurationReadiness(conversationId);

    if (!readiness) {
      logger.warn({ conversationId }, 'Conversation not found');
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    sendSuccess(res, {
      isReady: readiness.isReady,
      collected: readiness.collected,
      missing: readiness.missing,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ id: req.params.id }, 'Invalid conversation ID format');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid conversation ID', 400);
    }

    logger.error({ error, conversationId: req.params.id }, 'Error checking readiness');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * POST /api/conversations/:id/restart
 * Restarts a conversation by marking the current one as abandoned and creating a new one
 * This allows users to start fresh while keeping the same session
 */
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const conversationId = uuidSchema.parse(req.params.id);

    logger.info({ conversationId }, 'Restarting conversation');

    // Check if conversation exists
    const existingConversation = await conversationRepository.findById(conversationId);

    if (!existingConversation) {
      logger.warn({ conversationId }, 'Conversation not found for restart');
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    // Don't allow restarting completed conversations
    if (existingConversation.status === 'completed') {
      logger.warn({ conversationId, status: existingConversation.status }, 'Cannot restart completed conversation');
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Cannot restart a completed conversation. The sports center has already been created.',
        400
      );
    }

    // Restart the conversation (marks old as abandoned, creates new)
    const newConversation = await conversationRepository.restart(conversationId);

    if (!newConversation) {
      logger.error({ conversationId }, 'Failed to restart conversation');
      return sendError(res, ErrorCodes.DATABASE_ERROR, 'Failed to restart conversation', 500);
    }

    logger.info(
      {
        oldConversationId: conversationId,
        newConversationId: newConversation.id,
        sessionId: newConversation.session_id,
      },
      'Conversation restarted successfully'
    );

    sendSuccess(res, {
      previousConversationId: conversationId,
      conversation: toApiConversation(newConversation),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ id: req.params.id }, 'Invalid conversation ID format');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid conversation ID', 400);
    }

    logger.error({ error, conversationId: req.params.id }, 'Error restarting conversation');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * POST /api/conversations/:id/escalate
 * Manually escalate a conversation to human support
 */
router.post('/:id/escalate', async (req: Request, res: Response) => {
  try {
    const conversationId = uuidSchema.parse(req.params.id);
    const { reason } = req.body as { reason?: string };

    logger.info({ conversationId, reason }, 'Manual escalation requested');

    const conversation = await conversationRepository.findById(conversationId);

    if (!conversation) {
      logger.warn({ conversationId }, 'Conversation not found for escalation');
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    // Mark as escalated
    const escalationReason = reason || 'Manual escalation requested by user';
    await conversationRepository.markEscalated(conversationId, escalationReason);

    logger.info(
      { conversationId, reason: escalationReason },
      'Conversation escalated to human support'
    );

    sendSuccess(res, {
      escalated: true,
      reason: escalationReason,
      message: 'Your request has been escalated to our support team. They will contact you shortly.',
      supportEmail: 'sales@sporttia.com',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ id: req.params.id }, 'Invalid conversation ID format');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid conversation ID', 400);
    }

    logger.error({ error, conversationId: req.params.id }, 'Error escalating conversation');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * POST /api/conversations/feedback
 * Submit feedback about the assistant (with optional star rating)
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { message, conversationId, rating } = req.body as {
      message?: string;
      conversationId?: string;
      rating?: number;
    };

    // Message is optional if rating is provided
    const hasMessage = message && typeof message === 'string' && message.trim().length > 0;
    const hasRating = typeof rating === 'number' && rating >= 1 && rating <= 5;

    if (!hasMessage && !hasRating) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Feedback message or rating is required', 400);
    }

    if (hasMessage && message.length > 2000) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Feedback message is too long (max 2000 characters)', 400);
    }

    if (rating !== undefined && !hasRating) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Rating must be between 1 and 5', 400);
    }

    // Validate conversationId if provided
    let validConversationId: string | null = null;
    if (conversationId) {
      try {
        validConversationId = uuidSchema.parse(conversationId);
      } catch {
        // Invalid UUID, just ignore it
        validConversationId = null;
      }
    }

    // Import db here to avoid circular dependencies
    const { db } = await import('../lib/db');

    if (!db) {
      logger.error('Database not available for feedback submission');
      return sendError(res, ErrorCodes.DATABASE_ERROR, 'Database not available', 500);
    }

    const feedback = await db
      .insertInto('feedbacks')
      .values({
        message: hasMessage ? message.trim() : '',
        conversation_id: validConversationId,
        rating: hasRating ? rating : null,
      })
      .returning(['id', 'created_at'])
      .executeTakeFirst();

    logger.info(
      { feedbackId: feedback?.id, conversationId: validConversationId, rating: hasRating ? rating : null },
      'Feedback submitted'
    );

    sendSuccess(res, {
      success: true,
      feedbackId: feedback?.id,
    });
  } catch (error) {
    logger.error({ error }, 'Error submitting feedback');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to submit feedback', 500);
  }
});

export default router;
