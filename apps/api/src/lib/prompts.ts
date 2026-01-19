/**
 * System prompts for Sporttia ZERO AI assistant
 */

export const SYSTEM_PROMPT = `You are an employee of Sporttia, a **conversational assistant expert in data collection** for the configuration of a new sports center. Your **sole objective** is to obtain the required information step-by-step. The data you need to ask the user for to create the center are:

1. **Contact Person:** And from this point forward, address the user by their name.
2. **Center Name.**
3. **Email:** Must be mandatory.
4. **Location:** Ask only for the city where the center is located. You should figure out which country the city is in based on context (conversation language, common knowledge). If there's any ambiguity (e.g., cities with the same name in different countries like "Valencia" in Spain vs Venezuela), ask the user to clarify. **IMPORTANT: DO NOT SEARCH FOR COORDINATES**.
5. **Facilities and Schedules:** Ask about the Sports of the facilities the center has. For each sport, you need to know its opening and closing times and the standard rental slot (e.g., 1 hour, hour and a half, etc.). In addition, the user may also establish which days of the week each facility opens (this will go into the json in \`weekdays\` where 0 is Sunday and 1 is Monday, but the user must use normal language such as 'it is open Monday to Friday').
6. **Rates:** Ask for the rate for each sport along with the minimum duration (e.g., for padel it's €12 for one and a half hours).

**Interaction Rules:**

- Do not ask all questions at once; ask them one by one in order.
- Each time the user provides a piece of data, give a brief summary of all the information you have collected so far. This summary must be a bulleted list of all the information you have compiled up to that point.

**CLOSURE AND CREATION PROTOCOL (CRITICAL!):**

1. When you have **all** the data, show a complete summary and ask the user: "Is all the information correct so I can generate your sports center?"
2. **If the user confirms**, you must:
   - First call the \`confirm_configuration\` function with \`confirmed: true\`
   - Then IMMEDIATELY call the \`create_sports_center\` function to create the sports center in Sporttia
3. **Do NOT output JSON directly**. The system will handle the creation via the function calls.
4. After calling \`create_sports_center\`, wait for the system response which will indicate success or failure, then inform the user of the result.`;

/**
 * Sport info for prompt context
 */
export interface SportForPrompt {
  id: number;
  name: string;
}

/**
 * Options for generating the system prompt
 */
export interface SystemPromptOptions {
  language?: string;
  isFirstMessage?: boolean;
  availableSports?: SportForPrompt[];
}

/**
 * Get the system prompt for a conversation
 * @param options Prompt generation options
 */
export function getSystemPrompt(options: SystemPromptOptions = {}): string {
  const { language, isFirstMessage = true, availableSports } = options;
  let prompt = SYSTEM_PROMPT;

  // If language is already detected, tell the AI to use it and skip detection
  if (language && language !== 'es') {
    prompt += `\n\n## Current Language Setting
This conversation's language has already been detected as ${getLanguageName(language)} (${language}).
- DO NOT call the detect_language function again
- Continue responding in ${getLanguageName(language)}`;
  } else if (language === 'es') {
    prompt += `\n\n## Current Language Setting
This conversation's language has already been detected as Spanish (es).
- DO NOT call the detect_language function again
- Continue responding in Spanish`;
  } else if (!isFirstMessage) {
    // Language not yet detected but not first message - remind to detect
    prompt += `\n\n## Language Note
The conversation language has not been detected yet. Please detect it from the user's message and call the detect_language function.`;
  }

  // Add sport validation instructions if available sports are provided
  if (availableSports && availableSports.length > 0) {
    prompt += `\n\n## Sport Validation
When collecting facility information:
- Let the user freely mention any sport they have
- Validate if the sport exists in Sporttia by checking against the available sports list
- If the sport is valid, use its ID when calling collect_facility or update_facility functions
- If the sport is NOT in the available list, inform the user that sport is not currently supported in Sporttia and ask for an alternative

Available sports for validation (internal use only, do NOT display this list to the user):
${availableSports.map((s) => `- ${s.name} (ID: ${s.id})`).join('\n')}`;
  }

  return prompt;
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    es: 'Spanish',
    en: 'English',
    pt: 'Portuguese',
    fr: 'French',
    de: 'German',
    it: 'Italian',
  };
  return languages[code] || code;
}

/**
 * OpenAI function definitions for language detection
 */
export const LANGUAGE_DETECTION_FUNCTION = {
  name: 'detect_language',
  description: 'Report the detected language of the user based on their message. Call this function on the first user message to set the conversation language.',
  parameters: {
    type: 'object',
    properties: {
      language_code: {
        type: 'string',
        description: 'ISO-639-1 language code (e.g., "es" for Spanish, "en" for English, "pt" for Portuguese)',
        enum: ['es', 'en', 'pt', 'fr', 'de', 'it'],
      },
      confidence: {
        type: 'string',
        description: 'How confident you are in the language detection',
        enum: ['high', 'medium', 'low'],
      },
    },
    required: ['language_code', 'confidence'],
  },
} as const;

/**
 * Function to collect sports center basic info
 */
export const COLLECT_SPORTS_CENTER_INFO_FUNCTION = {
  name: 'collect_sports_center_info',
  description: 'Save the sports center basic information when the user provides it. Call this when you have collected the sports center name and/or city. The system will automatically lookup the city ID from Sporttia.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the sports center',
      },
      city: {
        type: 'string',
        description: 'The city where the sports center is located (country inferred from context; system will lookup the city ID)',
      },
    },
    required: [],
  },
} as const;

/**
 * Function to collect admin user info
 */
export const COLLECT_ADMIN_INFO_FUNCTION = {
  name: 'collect_admin_info',
  description: 'Save the administrator information when the user provides it. Call this when you have collected the admin name and/or email.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Full name of the administrator',
      },
      email: {
        type: 'string',
        description: 'Email address of the administrator (must be a valid email format)',
      },
    },
    required: [],
  },
} as const;

/**
 * Function to collect facility information
 */
export const COLLECT_FACILITY_FUNCTION = {
  name: 'collect_facility',
  description: 'Save a facility with its schedule information. Call this when the user has provided complete information for a facility including name, sport, and schedule details.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the facility (e.g., "Court 1", "Main Pool", "Gym Area")',
      },
      sportId: {
        type: 'number',
        description: 'ID of the sport from the available sports list',
      },
      sportName: {
        type: 'string',
        description: 'Name of the sport for display purposes',
      },
      schedules: {
        type: 'array',
        description: 'Array of schedule configurations for this facility',
        items: {
          type: 'object',
          properties: {
            weekdays: {
              type: 'array',
              description: 'Days of the week (1=Monday, 2=Tuesday, ..., 7=Sunday)',
              items: { type: 'number', minimum: 1, maximum: 7 },
            },
            startTime: {
              type: 'string',
              description: 'Opening time in HH:mm format (e.g., "09:00")',
            },
            endTime: {
              type: 'string',
              description: 'Closing time in HH:mm format (e.g., "21:00")',
            },
            duration: {
              type: 'number',
              description: 'Slot duration in minutes (e.g., 60, 90)',
            },
            rate: {
              type: 'number',
              description: 'Price per slot in EUR',
            },
          },
          required: ['weekdays', 'startTime', 'endTime', 'duration', 'rate'],
        },
      },
    },
    required: ['name', 'sportId', 'sportName', 'schedules'],
  },
} as const;

/**
 * Function to update an existing facility
 */
export const UPDATE_FACILITY_FUNCTION = {
  name: 'update_facility',
  description: 'Update an existing facility by its index. Use this when the user wants to modify a previously entered facility. The index is 0-based (first facility = 0, second = 1, etc.).',
  parameters: {
    type: 'object',
    properties: {
      facilityIndex: {
        type: 'number',
        description: 'Index of the facility to update (0-based)',
      },
      name: {
        type: 'string',
        description: 'New name of the facility (optional, only if changing)',
      },
      sportId: {
        type: 'number',
        description: 'New sport ID (optional, only if changing)',
      },
      sportName: {
        type: 'string',
        description: 'New sport name (optional, only if changing)',
      },
      schedules: {
        type: 'array',
        description: 'New schedule configurations (optional, replaces all schedules if provided)',
        items: {
          type: 'object',
          properties: {
            weekdays: {
              type: 'array',
              description: 'Days of the week (1=Monday, 2=Tuesday, ..., 7=Sunday)',
              items: { type: 'number', minimum: 1, maximum: 7 },
            },
            startTime: {
              type: 'string',
              description: 'Opening time in HH:mm format (e.g., "09:00")',
            },
            endTime: {
              type: 'string',
              description: 'Closing time in HH:mm format (e.g., "21:00")',
            },
            duration: {
              type: 'number',
              description: 'Slot duration in minutes (e.g., 60, 90)',
            },
            rate: {
              type: 'number',
              description: 'Price per slot in EUR',
            },
          },
          required: ['weekdays', 'startTime', 'endTime', 'duration', 'rate'],
        },
      },
    },
    required: ['facilityIndex'],
  },
} as const;

/**
 * Function to confirm the configuration
 */
export const CONFIRM_CONFIGURATION_FUNCTION = {
  name: 'confirm_configuration',
  description: 'Record that the user has confirmed the sports center configuration and is ready to create it. Only call this after showing the summary AND the user explicitly confirms.',
  parameters: {
    type: 'object',
    properties: {
      confirmed: {
        type: 'boolean',
        description: 'Whether the user has confirmed the configuration',
      },
    },
    required: ['confirmed'],
  },
} as const;

/**
 * Function to request human help
 */
export const REQUEST_HUMAN_HELP_FUNCTION = {
  name: 'request_human_help',
  description: 'Escalate to human support when you cannot help the user or they explicitly request to speak with a person.',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Why human help is being requested',
        enum: ['user_request', 'cannot_understand', 'technical_issue', 'complex_question', 'frustrated_user', 'out_of_scope'],
      },
      details: {
        type: 'string',
        description: 'Additional context about why escalation is needed',
      },
    },
    required: ['reason'],
  },
} as const;

/**
 * Function to create the sports center
 */
export const CREATE_SPORTS_CENTER_FUNCTION = {
  name: 'create_sports_center',
  description: 'Create the sports center in Sporttia. Call this IMMEDIATELY after confirm_configuration(confirmed: true). This will create the sports center and admin account in the Sporttia system.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
} as const;

/**
 * All onboarding functions
 */
export const ONBOARDING_FUNCTIONS = [
  COLLECT_SPORTS_CENTER_INFO_FUNCTION,
  COLLECT_ADMIN_INFO_FUNCTION,
  COLLECT_FACILITY_FUNCTION,
  UPDATE_FACILITY_FUNCTION,
  CONFIRM_CONFIGURATION_FUNCTION,
  CREATE_SPORTS_CENTER_FUNCTION,
  REQUEST_HUMAN_HELP_FUNCTION,
] as const;

/**
 * Get tools for OpenAI based on conversation state
 */
export function getOpenAITools(languageDetected: boolean, onboardingActive: boolean = true) {
  const tools: Array<{ type: 'function'; function: typeof LANGUAGE_DETECTION_FUNCTION | typeof ONBOARDING_FUNCTIONS[number] }> = [];

  // Add language detection if not yet detected
  if (!languageDetected) {
    tools.push({
      type: 'function' as const,
      function: LANGUAGE_DETECTION_FUNCTION,
    });
  }

  // Add onboarding functions if active
  if (onboardingActive) {
    for (const func of ONBOARDING_FUNCTIONS) {
      tools.push({
        type: 'function' as const,
        function: func,
      });
    }
  }

  return tools.length > 0 ? tools : undefined;
}
