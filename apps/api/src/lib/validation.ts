import { z } from 'zod';

// Create conversation request schema
export const createConversationSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required').max(255),
  language: z.string().length(2).optional().default('es'),
});

// Add message request schema
export const addMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000),
});

// UUID validation
export const uuidSchema = z.string().uuid('Invalid conversation ID format');

// Email validation
export const emailSchema = z.string().email('Invalid email format');

/**
 * Validate an email address
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const result = emailSchema.safeParse(email);
  return result.success;
}

/**
 * Normalize and validate an email address
 * @returns normalized email if valid, null otherwise
 */
export function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (isValidEmail(trimmed)) {
    return trimmed;
  }
  return null;
}

// Type exports
export type CreateConversationRequest = z.infer<typeof createConversationSchema>;
export type AddMessageRequest = z.infer<typeof addMessageSchema>;

// Schedule validation types
export interface ScheduleValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ScheduleToValidate {
  weekdays: number[];
  startTime: string;
  endTime: string;
  duration: number;
  rate: number;
}

/**
 * Parse a time string (HH:mm) into minutes since midnight
 * @returns minutes since midnight, or null if invalid
 */
export function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Validate a single schedule configuration
 */
export function validateSchedule(schedule: ScheduleToValidate): ScheduleValidationResult {
  const errors: string[] = [];

  // Validate weekdays (1-7)
  if (!schedule.weekdays || schedule.weekdays.length === 0) {
    errors.push('At least one weekday must be selected');
  } else {
    for (const day of schedule.weekdays) {
      if (day < 1 || day > 7 || !Number.isInteger(day)) {
        errors.push(`Invalid weekday: ${day}. Must be 1-7 (Monday-Sunday)`);
      }
    }
  }

  // Validate times
  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const endMinutes = parseTimeToMinutes(schedule.endTime);

  if (startMinutes === null) {
    errors.push(`Invalid start time format: ${schedule.startTime}. Use HH:mm format`);
  }

  if (endMinutes === null) {
    errors.push(`Invalid end time format: ${schedule.endTime}. Use HH:mm format`);
  }

  // Validate end > start
  if (startMinutes !== null && endMinutes !== null) {
    if (endMinutes <= startMinutes) {
      errors.push('End time must be after start time');
    } else {
      // Validate duration divides evenly
      const operatingMinutes = endMinutes - startMinutes;
      if (schedule.duration <= 0) {
        errors.push('Duration must be greater than 0');
      } else if (operatingMinutes % schedule.duration !== 0) {
        errors.push(
          `Duration (${schedule.duration} min) does not divide evenly into operating hours (${operatingMinutes} min)`
        );
      }
    }
  }

  // Validate duration is reasonable
  if (schedule.duration < 15) {
    errors.push('Duration should be at least 15 minutes');
  } else if (schedule.duration > 480) {
    errors.push('Duration should not exceed 8 hours (480 minutes)');
  }

  // Validate rate
  if (schedule.rate < 0) {
    errors.push('Rate cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all schedules for a facility
 */
export function validateFacilitySchedules(schedules: ScheduleToValidate[]): ScheduleValidationResult {
  const allErrors: string[] = [];

  if (!schedules || schedules.length === 0) {
    return { valid: false, errors: ['At least one schedule is required'] };
  }

  for (let i = 0; i < schedules.length; i++) {
    const result = validateSchedule(schedules[i]);
    if (!result.valid) {
      for (const error of result.errors) {
        allErrors.push(`Schedule ${i + 1}: ${error}`);
      }
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
