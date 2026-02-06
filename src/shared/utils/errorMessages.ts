/**
 * User-friendly error messages with actionable guidance.
 * 
 * Maps technical error codes/messages to helpful user messages.
 */

export interface AppError {
  title: string;
  message: string;
  action?: string;
}

/**
 * Converts technical errors into user-friendly messages with actionable guidance
 */
export function getUserFriendlyError(error: unknown): AppError {
  // Handle string errors
  if (typeof error === 'string') {
    return parseErrorString(error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    return parseErrorString(error.message);
  }

  // Handle API error responses
  if (isApiError(error)) {
    return {
      title: 'Request Failed',
      message: error.message || 'Unable to complete your request',
      action: 'Please try again or check your internet connection',
    };
  }

  // Fallback for unknown errors
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred',
    action: 'Please try again. If the problem persists, restart the application.',
  };
}

function parseErrorString(errorMsg: string): AppError {
  const lowerMsg = errorMsg.toLowerCase();

  // Network errors
  if (lowerMsg.includes('network') || lowerMsg.includes('fetch')) {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to the server',
      action: 'Check your internet connection and try again',
    };
  }

  // Timeout errors
  if (lowerMsg.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete',
      action: 'Please try again. The server might be slow or unavailable.',
    };
  }

  // Database errors
  if (lowerMsg.includes('database') || lowerMsg.includes('sqlite')) {
    return {
      title: 'Database Error',
      message: 'Unable to access local data',
      action: 'Try restarting the application. If the problem persists, the database might be corrupted.',
    };
  }

  // Validation errors
  if (lowerMsg.includes('validation') || lowerMsg.includes('invalid')) {
    return {
      title: 'Invalid Input',
      message: 'Please check your input and try again',
      action: 'Make sure all required fields are filled correctly',
    };
  }

  // Not found errors
  if (lowerMsg.includes('not found') || lowerMsg.includes('404')) {
    return {
      title: 'Not Found',
      message: 'The requested item could not be found',
      action: 'It may have been deleted or moved. Try refreshing the page.',
    };
  }

  // Permission errors
  if (lowerMsg.includes('permission') || lowerMsg.includes('unauthorized') || lowerMsg.includes('403')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action',
      action: 'Contact your administrator if you need access',
    };
  }

  // Conflict errors
  if (lowerMsg.includes('conflict') || lowerMsg.includes('409')) {
    return {
      title: 'Conflict Detected',
      message: 'This item was modified by another process',
      action: 'Refresh the page to see the latest version',
    };
  }

  // Generic fallback
  return {
    title: 'Operation Failed',
    message: errorMsg,
    action: 'Please try again',
  };
}

function isApiError(error: unknown): error is { message: string; code?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Specific error messages for common operations
 */
export const ErrorMessages = {
  // Task operations
  TASK_CREATE_FAILED: {
    title: 'Failed to Create Task',
    message: 'Unable to save your task',
    action: 'Check that all fields are filled correctly and try again',
  },
  TASK_UPDATE_FAILED: {
    title: 'Failed to Update Task',
    message: 'Your changes could not be saved',
    action: 'Try refreshing the page and making your changes again',
  },
  TASK_DELETE_FAILED: {
    title: 'Failed to Delete Task',
    message: 'The task could not be removed',
    action: 'Make sure you have permission to delete this task',
  },
  TASK_LOAD_FAILED: {
    title: 'Failed to Load Tasks',
    message: 'Unable to retrieve your tasks',
    action: 'Check your connection and try refreshing the page',
  },

  // Reminder operations
  REMINDER_CREATE_FAILED: {
    title: 'Failed to Create Reminder',
    message: 'Unable to set the reminder',
    action: 'Make sure the reminder time is in the future',
  },
  REMINDER_DELETE_FAILED: {
    title: 'Failed to Delete Reminder',
    message: 'The reminder could not be removed',
    action: 'Try again or restart the application',
  },

  // Sync operations
  SYNC_FAILED: {
    title: 'Sync Failed',
    message: 'Unable to synchronize your data',
    action: 'Your changes are saved locally and will sync when connection is restored',
  },

  // Offline mode
  OFFLINE_MODE: {
    title: 'Working Offline',
    message: 'Changes will be synced when you\'re back online',
    action: 'Check your internet connection',
  },
} as const;
