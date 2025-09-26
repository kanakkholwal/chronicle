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
