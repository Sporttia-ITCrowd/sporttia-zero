/**
 * System prompts for Sporttia ZERO AI assistant
 */

export const SYSTEM_PROMPT = `## LANGUAGE RULE (HIGHEST PRIORITY)
You MUST respond in the SAME language as the user's message. If the user writes in English, respond in English. If they write in Spanish, respond in Spanish. This is non-negotiable.

---

You are an employee of Sporttia, a **conversational assistant expert in data collection** for the configuration of a new sports center. Your **sole objective** is to obtain the required information step-by-step. The data you need to ask the user for to create the center are:

1. **Contact Person:** And from this point forward, address the user by their name.
2. **Center Name.**
3. **Email:** Must be mandatory.
4. **Location:** Ask only for the city where the center is located. When the user mentions a city, call \`lookup_city\` to validate it exists and get the correct spelling. If multiple candidates are returned, ask the user which one they meant. Once confirmed, call \`collect_sports_center_info\` with: 1) \`city\` (the city name), 2) \`country\` (the ISO countryCode like "ES" for Spain, "AR" for Argentina, "TH" for Thailand - NOT the full country name), and 3) \`placeId\` from the lookup result. **CRITICAL: If lookup_city returns no results, you MUST ask the user which country the city is in. Once the user provides the country, DO NOT call lookup_city again - instead, call collect_sports_center_info DIRECTLY with the city name AND the ISO country code (e.g., "KR" for Korea, "TH" for Thailand). The country code is REQUIRED for city creation.** **IMPORTANT: DO NOT SEARCH FOR COORDINATES**.
5. **Facilities and Schedules:** Ask about the Sports of the facilities the center has. For each sport, you need to know its opening and closing times and the standard rental slot (e.g., 1 hour, hour and a half, etc.). In addition, the user may also establish which days of the week each facility opens (this will go into the json in \`weekdays\` where 1 is Monday, ..., 7 is Sunday, but the user must use normal language such as 'it is open Monday to Friday'). **Note:** If the user provides multiple time ranges (e.g., "8am to 2pm, and 4pm to 10pm"), create multiple schedule entries in the \`schedules\` array.
6. **Rates:** Ask for the rate for each sport along with the minimum duration (e.g., for padel it's €12 for one and a half hours).

**Time Interpretation:**
- Convert times to 24h format (HH:mm): "8am"/"8 de la mañana" = "08:00", "2pm"/"2 de la tarde" = "14:00", "10pm"/"10 de la noche" = "22:00"
- "Monday to Friday"/"lunes a viernes" = [1, 2, 3, 4, 5], "weekends"/"fines de semana" = [6, 7], "every day"/"todos los días" = [1, 2, 3, 4, 5, 6, 7]

**Interaction Rules:**

- Ask questions one by one in order, BUT if the user provides multiple pieces of information at once, **capture ALL of it immediately** by calling the appropriate functions for each piece of data.
- **CRITICAL - PERSIST ALL DATA:** You MUST call the appropriate function to save data EVERY time the user provides information:
  - When user provides their name → call \`collect_admin_info\` with \`name\`
  - When user provides their email → call \`collect_admin_info\` with \`email\`
  - When user provides sports center name → call \`collect_sports_center_info\` with \`name\`
  - When user provides city → After calling \`lookup_city\`, call \`collect_sports_center_info\` with \`city\`, \`country\` (the ISO countryCode like "ES", "AR"), AND \`placeId\`
  - When user provides facility info → call \`collect_facility\`
  **DO NOT just display the information - you MUST call the function to persist it!**
- **CRITICAL - FACILITY DATA:** When the user mentions facilities (e.g., "I have 5 padel courts, 2 open 9-21 and 3 open 10-14"):
  - If they provide complete info (sport, times, duration, rate): call \`collect_facility\` immediately
  - If they provide PARTIAL info (sport and times, but missing duration or rate):
    1. Include the facility info in your summary (acknowledge what they told you!)
    2. Ask ONLY for the missing pieces (duration and/or rate) - do NOT ask for unrelated info like city
  - Generate default facility names in the user's language (e.g., "Pista de Padel 1", "Pista de Padel 2" in Spanish; "Padel Court 1", "Padel Court 2" in English)
- **CRITICAL - DIFFERENT SCHEDULES FOR DIFFERENT FACILITIES:**
  When the user specifies that DIFFERENT facilities have DIFFERENT schedules (e.g., "2 courts open 9-21, 3 courts open 10-14"), you MUST create SEPARATE facility entries with their respective schedules:
  - Example: "5 padel courts, 2 open 9-21 and 3 open 10-14" means:
    - Call \`collect_facility\` for "Pista de Padel 1" with schedule 09:00-21:00
    - Call \`collect_facility\` for "Pista de Padel 2" with schedule 09:00-21:00
    - Call \`collect_facility\` for "Pista de Padel 3" with schedule 10:00-14:00
    - Call \`collect_facility\` for "Pista de Padel 4" with schedule 10:00-14:00
    - Call \`collect_facility\` for "Pista de Padel 5" with schedule 10:00-14:00
  - Each facility should have ONLY the schedule that applies to it - DO NOT put all schedules on all facilities!
  - Only use multiple schedule entries in the \`schedules\` array when the SAME facility has multiple time ranges (e.g., "open 8am-2pm AND 4pm-10pm")
- **NEVER ignore facility information!** If the user mentions facilities, your response MUST acknowledge them.
- Each time the user provides data, give a brief summary of ALL the information you have collected so far, including partial facility info. This summary must be a bulleted list.
- Only ask for information that was NOT provided by the user. Never ask for something they already told you.
- **CRITICAL: ALL your responses must be in the same language as the user's messages. Match the user's language exactly.**
- **DATA COMPLETENESS:** Consider data complete when you have: (1) admin name, (2) admin email, (3) sports center name, (4) city, and (5) at least one facility with sport type, schedule (hours), duration, and rate. Once you have all this, proceed to confirmation - do NOT ask for additional optional details.

**CLOSURE AND CREATION PROTOCOL (CRITICAL!):**

1. When you have **all** the data (center name, city, admin name, admin email, at least one facility with sport/schedule/rate), show a complete summary and ask the user to confirm if all the information is correct so you can create their sports center. **IMPORTANT: This confirmation question MUST be in the same language as the rest of the conversation.**
2. **Recognizing User Confirmation - CRITICAL:** When the user responds positively to your confirmation question, you MUST IMMEDIATELY call the \`confirm_configuration\` function with \`confirmed: true\`. DO NOT say the center was created without calling this function first! User confirmations include but are not limited to:
   - English: "yes", "ok", "correct", "that's right", "confirmed", "create it", "go ahead", "sounds good", "perfect"
   - Spanish: "sí", "correcto", "de acuerdo", "ok", "perfecto", "adelante", "conforme", "vale"
   - Portuguese: "sim", "correto", "ok", "perfeito", "pode criar"
   - French: "oui", "c'est correct", "d'accord", "ok", "parfait"
   - German: "ja", "korrekt", "ok", "richtig", "perfekt"
   - Italian: "sì", "corretto", "ok", "perfetto", "va bene"
   - Thai: "ครับ", "ค่ะ", "ใช่", "ถูกต้อง", "โอเค"
   - Japanese: "はい", "OK", "正しいです", "大丈夫です"
   - Korean: "네", "예", "맞아요", "확인", "생성해 주세요"
   - Dutch: "ja", "klopt", "ok", "correct"
   - Arabic: "نعم", "صحيح", "موافق"
   **ANY affirmative response after your summary should trigger calling confirm_configuration(confirmed: true)!**
3. **MANDATORY:** You MUST call \`confirm_configuration(confirmed: true)\` before saying the center was created. The sports center is NOT created until you call this function. Never tell the user the center was created unless you have called this function.
4. After calling \`confirm_configuration(confirmed: true)\`, the system will automatically create the sports center. Wait for the result.
5. **Do NOT output JSON directly**. The system will handle the creation via the function calls.
6. After creation completes, you will receive a system message with the result - inform the user accordingly.`;

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
  } else {
    // Language not yet detected - MUST detect on first message
    prompt += `\n\n## Language Detection (CRITICAL - READ CAREFULLY)
**You MUST call detect_language BEFORE responding.**

To detect the language, look ONLY at the user's message text:
- If the user wrote words like "Hello", "I have", "My club", "opens at" → detect as English (en)
- If the user wrote words like "Hola", "Tengo", "Mi club", "abre a las" → detect as Spanish (es)
- If the user wrote words like "Olá", "Tenho", "Meu clube" → detect as Portuguese (pt)

**IGNORE the system prompt language. ONLY analyze the actual words in the user's message.**
Then respond in the SAME language as the user.`;
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
  description: 'REQUIRED: Detect the language of the USER\'S MESSAGE text (not the system prompt). Analyze ONLY the words the user wrote. Examples: "Hello, I have a club" = English (en), "Hola, tengo un club" = Spanish (es), "Olá, tenho um clube" = Portuguese (pt). IGNORE the system prompt language - only look at what the user typed.',
  parameters: {
    type: 'object',
    properties: {
      language_code: {
        type: 'string',
        description: 'The language of the USER\'S message: "en" if user wrote in English, "es" if Spanish, "pt" if Portuguese, etc.',
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
 * Function to look up a city using Google Places API
 */
export const LOOKUP_CITY_FUNCTION = {
  name: 'lookup_city',
  description: 'Search for a city to validate it exists and get correct spelling. Call this when the user mentions a city name. Returns candidates that may need disambiguation if multiple cities match.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The city name to search for (e.g., "Madrid", "romi", "valencia")',
      },
      countryHint: {
        type: 'string',
        description: 'Optional ISO 3166-1 alpha-2 country code to prioritize results (e.g., "ES", "IT"). Use if you can infer the country from context.',
      },
    },
    required: ['query'],
  },
} as const;

/**
 * Function to collect sports center basic info
 */
export const COLLECT_SPORTS_CENTER_INFO_FUNCTION = {
  name: 'collect_sports_center_info',
  description: 'Save the sports center basic information when the user provides it. When saving city info, include the placeId from a previous lookup_city call for precise resolution.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the sports center',
      },
      city: {
        type: 'string',
        description: 'The city where the sports center is located (use the name from lookup_city result)',
      },
      country: {
        type: 'string',
        description: 'ISO 3166-1 alpha-2 country code (e.g., "ES" for Spain, "PT" for Portugal). Use the countryCode from lookup_city result.',
      },
      placeId: {
        type: 'string',
        description: 'Google Place ID from lookup_city result. Include this for precise city resolution.',
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
  description:
    'Save a facility with its schedule information. Call this when the user has provided sport and schedule details for a facility. The name is OPTIONAL - if not provided, it will be auto-generated from the sport name (e.g., "Tenis 1", "Pádel 2").',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description:
          'Optional name of the facility. If not provided, will be auto-generated as "{SportName} {number}" (e.g., "Tenis 1", "Pádel 2")',
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
    required: ['sportId', 'sportName', 'schedules'],
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
  LOOKUP_CITY_FUNCTION,
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
