/**
 * Logging utility with configurable log levels for better debugging experience.
 * 
 * Usage:
 *   import { logger } from '@shared/utils/logger';
 *   
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('API request failed', error);
 *   logger.debug('State updated', state);
 * 
 * Log levels are controlled by environment:
 * - Development: All logs shown (debug, info, warn, error)
 * - Production: Only warn and error logs shown
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
  enableErrorTracking: boolean;
}

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private config: LoggerConfig;
  private errorHistory: Array<{ timestamp: Date; message: string; error: unknown; context?: ErrorContext }> = [];

  constructor() {
    this.config = {
      // Show all logs in development, only warnings/errors in production
      level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN,
      enableTimestamps: true,
      enableColors: true,
      enableErrorTracking: true,
    };
  }

  /**
   * Configure the logger (useful for testing or custom environments)
   */
  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Detailed information for debugging (e.g., state changes, function calls)
   */
  debug(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, 'color: #6B7280', ...args);
    }
  }

  /**
   * General informational messages (e.g., "User logged in", "Task created")
   */
  info(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.INFO) {
      this.log('INFO', message, 'color: #3B82F6', ...args);
    }
  }

  /**
   * Warning messages for recoverable issues (e.g., deprecated API usage, missing optional data)
   */
  warn(message: string, ...args: unknown[]) {
    if (this.config.level <= LogLevel.WARN) {
      this.log('WARN', message, 'color: #F59E0B', ...args);
    }
  }

  /**
   * Error messages for failures (e.g., API errors, validation failures)
   */
  error(message: string, error?: unknown, context?: ErrorContext) {
    if (this.config.level <= LogLevel.ERROR) {
      this.log('ERROR', message, 'color: #EF4444', error);
      
      // Track error in history for debugging
      if (this.config.enableErrorTracking) {
        this.errorHistory.push({
          timestamp: new Date(),
          message,
          error,
          context,
        });
        
        // Keep only last 50 errors to prevent memory leak
        if (this.errorHistory.length > 50) {
          this.errorHistory.shift();
        }
      }
    }
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * Log a group of related messages (collapsible in DevTools)
   */
  group(label: string, collapsed = false) {
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
  }

  groupEnd() {
    console.groupEnd();
  }

  /**
   * Time an operation (useful for performance debugging)
   */
  time(label: string) {
    console.time(label);
  }

  timeEnd(label: string) {
    console.timeEnd(label);
  }

  private log(level: string, message: string, color: string, ...args: unknown[]) {
    const timestamp = this.config.enableTimestamps
      ? new Date().toISOString().substring(11, 23)
      : '';

    const prefix = this.config.enableTimestamps ? `[${timestamp}]` : '';
    const levelTag = `[${level}]`;

    if (this.config.enableColors && import.meta.env.DEV) {
      console.log(
        `%c${prefix} ${levelTag} %c${message}`,
        'color: #9CA3AF; font-weight: normal',
        color,
        ...args
      );
    } else {
      console.log(`${prefix} ${levelTag} ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common patterns
export const log = {
  api: {
    request: (method: string, endpoint: string, data?: unknown) => {
      logger.debug(`🌐 API ${method} ${endpoint}`, data);
    },
    response: (endpoint: string, data: unknown) => {
      logger.debug(`✅ API Response ${endpoint}`, data);
    },
    error: (endpoint: string, error: unknown) => {
      logger.error(`❌ API Error ${endpoint}`, error);
    },
  },
  store: {
    action: (action: string, payload?: unknown) => {
      logger.debug(`🔄 Store Action: ${action}`, payload);
    },
    state: (label: string, state: unknown) => {
      logger.debug(`📊 Store State: ${label}`, state);
    },
  },
  ui: {
    mount: (component: string) => {
      logger.debug(`🎨 Component Mounted: ${component}`);
    },
    unmount: (component: string) => {
      logger.debug(`🗑️  Component Unmounted: ${component}`);
    },
  },
};
