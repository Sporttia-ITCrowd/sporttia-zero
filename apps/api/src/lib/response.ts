import type { Response } from 'express';

// Standard API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Success response helper
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

// Error response helper
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  res.status(statusCode).json(response);
}

// Common error codes
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;
