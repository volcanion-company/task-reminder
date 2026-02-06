/**
 * API Error Handling Utilities
 * 
 * Provides standardized error messages and handling for API calls
 */

import { logger } from '@shared/utils/logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Format error message from Tauri invoke calls
 * Tauri errors come as strings, we need to make them user-friendly
 */
export function formatApiError(error: unknown, operation: string): ApiError {
  // If it's already our ApiError, return it
  if (error instanceof ApiError) {
    return error;
  }

  // Handle string errors from Tauri
  if (typeof error === 'string') {
    return new ApiError(
      getUserFriendlyMessage(error, operation),
      'TAURI_ERROR',
      undefined,
      error
    );
  }

  // Handle Error objects
  if (error instanceof Error) {
    return new ApiError(
      getUserFriendlyMessage(error.message, operation),
      'ERROR',
      undefined,
      error
    );
  }

  // Unknown error type
  return new ApiError(
    `Failed to ${operation}. Please try again.`,
    'UNKNOWN_ERROR',
    undefined,
    error
  );
}

/**
 * Convert technical error messages to user-friendly ones
 */
function getUserFriendlyMessage(errorMessage: string, operation: string): string {
  const lowerMsg = errorMessage.toLowerCase();

  // Database errors
  if (lowerMsg.includes('database') || lowerMsg.includes('sqlite')) {
    return 'Database error occurred. Please try again or contact support.';
  }

  // Validation errors
  if (lowerMsg.includes('validation') || lowerMsg.includes('invalid')) {
    return errorMessage; // Keep validation errors as-is
  }

  // Not found errors
  if (lowerMsg.includes('not found')) {
    return `The requested item was not found.`;
  }

  // Permission/lock errors
  if (lowerMsg.includes('lock') || lowerMsg.includes('permission')) {
    return 'Unable to access the resource. Please try again.';
  }

  // Network/connection errors
  if (lowerMsg.includes('network') || lowerMsg.includes('connection')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Default: return original message with context
  return `Failed to ${operation}: ${errorMessage}`;
}

/**
 * Wrapper for API calls with consistent error handling
 */
export async function handleApiCall<T>(
  operation: string,
  apiCall: () => Promise<T>,
  context?: { component?: string; userId?: string }
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    const apiError = formatApiError(error, operation);
    
    // Log error with context
    logger.error(`API Error: ${operation}`, apiError, {
      component: context?.component,
      userId: context?.userId,
      metadata: { originalError: error },
    });

    throw apiError;
  }
}

/**
 * Retry an API call with exponential backoff
 */
export async function retryApiCall<T>(
  operation: string,
  apiCall: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Retry ${attempt + 1}/${maxRetries} for ${operation} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const apiError = formatApiError(lastError, operation);
  logger.error(`API Error after ${maxRetries} retries: ${operation}`, apiError);
  throw apiError;
}
