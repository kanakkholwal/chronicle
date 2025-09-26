// Error types and utilities for the ProseMirror Editor App

export const ErrorType = {
  EDITOR_INITIALIZATION: 'EDITOR_INITIALIZATION',
  EDITOR_UPDATE: 'EDITOR_UPDATE',
  AI_GENERATION: 'AI_GENERATION',
  AI_TIMEOUT: 'AI_TIMEOUT',
  ANIMATION: 'ANIMATION',
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  timestamp: number;
  context?: Record<string, any>;
}

export class EditorError extends Error {
  public readonly type: ErrorType;
  public readonly timestamp: number;
  public readonly context?: Record<string, any>;

  constructor(
    type: ErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'EditorError';
    this.type = type;
    this.timestamp = Date.now();
    this.context = context;

    // Maintain proper stack trace
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}

export class AIGenerationError extends EditorError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(ErrorType.AI_GENERATION, message, originalError, context);
    this.name = 'AIGenerationError';
  }
}

export class AITimeoutError extends EditorError {
  constructor(timeoutMs: number, context?: Record<string, any>) {
    super(
      ErrorType.AI_TIMEOUT,
      `AI generation timed out after ${timeoutMs}ms`,
      undefined,
      { timeoutMs, ...context }
    );
    this.name = 'AITimeoutError';
  }
}

export class ValidationError extends EditorError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorType.VALIDATION, message, undefined, context);
    this.name = 'ValidationError';
  }
}

export class AnimationError extends EditorError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(ErrorType.ANIMATION, message, originalError, context);
    this.name = 'AnimationError';
  }
}

// Error handling utilities
export const createAppError = (
  type: ErrorType,
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => ({
  type,
  message,
  originalError,
  timestamp: Date.now(),
  context
});

export const isNetworkError = (error: Error): boolean => {
  return error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('timeout') ||
    error.message.toLowerCase().includes('fetch') ||
    error.name === 'NetworkError';
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof EditorError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
};

export const logError = (error: AppError | EditorError | Error, context?: string): void => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';

  if (error instanceof EditorError) {
    console.error(
      `${timestamp} ${contextStr} ${error.name}:`,
      error.message,
      error.context ? `Context: ${JSON.stringify(error.context)}` : ''
    );
  } else if ('type' in error && 'timestamp' in error) {
    // AppError
    console.error(
      `${timestamp} ${contextStr} AppError [${error.type}]:`,
      error.message,
      error.context ? `Context: ${JSON.stringify(error.context)}` : ''
    );
  } else {
    console.error(`${timestamp} ${contextStr} Error:`, error);
  }
};

// Content validation utilities
export const validateContent = (content: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check for extremely long content that might cause performance issues
  if (content.length > 50000) {
    errors.push('Content exceeds maximum length of 50,000 characters');
  }

  // Check for potentially problematic characters
  const problematicChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  if (problematicChars.test(content)) {
    errors.push('Content contains invalid control characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeContent = (content: string): string => {
  // Remove control characters except newlines and tabs
  return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

// Timeout utility for promises
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new AITimeoutError(timeoutMs, { originalPromise: promise.constructor.name }));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Retry utility for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw new EditorError(
          ErrorType.UNKNOWN,
          `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
          lastError,
          { attempts: maxRetries, delayMs }
        );
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
};