import { createMachine, assign, fromPromise } from 'xstate';
import { 
  AIGenerationError, 
  ValidationError,
  withTimeout,
  validateContent,
  sanitizeContent,
  logError,
  getErrorMessage,
  isNetworkError
} from '@/lib/errors';

// Context interface for the editor machine
export interface EditorContext {
  content: string;
  generatedText: string;
  streamingText: string;
  error?: string;
  lastGenerationTime?: number;
  generationCount: number;
  retryCount: number;
  isRetrying: boolean;
}

// Events that the machine can receive
export type EditorEvent =
  | { type: 'CONTINUE_WRITING' }
  | { type: 'STREAM_TOKEN'; token: string }
  | { type: 'STREAM_COMPLETE' }
  | { type: 'GENERATION_ERROR'; error: string }
  | { type: 'UPDATE_CONTENT'; content: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RETRY' }
  | { type: 'RESET' };

// Streaming AI generation service that yields tokens gradually
export const mockAIStreamingService = async function* (
  existingContent: string = ''
): AsyncGenerator<string, void, unknown> {
  // Validate input content first
  const validation = validateContent(existingContent);
  if (!validation.isValid) {
    throw new ValidationError(
      `Invalid content: ${validation.errors.join(', ')}`,
      { content: existingContent.substring(0, 100) + '...' }
    );
  }

  const sanitizedContent = sanitizeContent(existingContent);
  
  // Check for empty content
  if (sanitizedContent.trim().length === 0) {
    throw new ValidationError('Cannot generate content for empty input');
  }

  // Simulate various failure scenarios for testing
  const random = Math.random();
  
  if (random < 0.05) {
    // Network errors (5% chance)
    const networkErrors = [
      'Network connection timeout',
      'Failed to fetch from AI service',
      'Connection refused by server'
    ];
    const error = new Error(networkErrors[Math.floor(Math.random() * networkErrors.length)]);
    error.name = 'NetworkError';
    throw error;
  }
  
  if (random < 0.08) {
    // Service errors (3% additional chance)
    const serviceErrors = [
      'AI service temporarily unavailable',
      'Content generation failed - please try again',
      'AI model is currently overloaded',
      'Rate limit exceeded'
    ];
    throw new AIGenerationError(
      serviceErrors[Math.floor(Math.random() * serviceErrors.length)],
      undefined,
      { contentLength: sanitizedContent.length }
    );
  }

  // Context-aware sample AI-generated text options
  const continuationTexts = [
    " The morning sun cast long shadows across the empty street, creating patterns that danced with each passing cloud. Sarah pulled her coat tighter as she walked, her footsteps echoing in the quiet neighborhood.",
    " As the clock struck midnight, the old library seemed to come alive with whispers from forgotten books. Each shelf held secrets that had been waiting decades to be discovered by the right reader.",
    " The coffee shop buzzed with the familiar sounds of morning - the hiss of the espresso machine, the gentle murmur of conversations, and the rustle of newspapers being turned by eager readers.",
    " Mountains stretched endlessly before them, their peaks shrouded in mist that seemed to hold ancient mysteries. The hiking trail wound through valleys where wildflowers painted the landscape in vibrant colors.",
    " In the digital age, human connections had become both easier and more complex. A simple message could travel across the world in seconds, yet meaningful conversations seemed harder to find.",
    " The old wooden door creaked as it opened, revealing a room that hadn't been disturbed for years. Dust particles floated in the afternoon light streaming through cracked windows.",
    " She closed her eyes and listened to the ocean waves crashing against the shore. Each wave brought with it memories of summers past and dreams of adventures yet to come.",
    " The city never slept, its neon lights painting the night in electric blues and vibrant pinks. From the rooftop, the world below looked like a circuit board come to life.",
    " Thunder rumbled in the distance as dark clouds gathered overhead. The first drops of rain began to fall, each one carrying the promise of renewal and change.",
    " In the quiet of the forest, every sound seemed amplified - the rustle of leaves, the snap of twigs underfoot, and somewhere in the distance, the call of a lone bird."
  ];

  // Select appropriate continuation based on content length and context
  let selectedText;
  if (sanitizedContent.length < 50) {
    // For short content, provide more descriptive openings
    const openingTexts = continuationTexts.filter(text => 
      text.includes('morning') || text.includes('door') || text.includes('city')
    );
    selectedText = openingTexts[Math.floor(Math.random() * openingTexts.length)] || continuationTexts[0];
  } else {
    // For longer content, provide varied continuations
    selectedText = continuationTexts[Math.floor(Math.random() * continuationTexts.length)];
  }

  // Split text into tokens for streaming
  const tokens = selectedText.split(/(\s+)/).filter(token => token.length > 0);
  
  // Stream tokens with realistic delays
  for (const token of tokens) {
    // Simulate realistic typing speed (50-150ms per token)
    const delay = Math.random() * 100 + 50;
    await new Promise(resolve => setTimeout(resolve, delay));
    yield token;
  }
};

// Enhanced AI generation service with comprehensive error handling and timeout support
export const mockAIGenerationService = async (
  existingContent: string = '',
  timeoutMs: number = 10000
): Promise<string> => {
  // Validate input content first
  const validation = validateContent(existingContent);
  if (!validation.isValid) {
    throw new ValidationError(
      `Invalid content: ${validation.errors.join(', ')}`,
      { content: existingContent.substring(0, 100) + '...' }
    );
  }

  // Sanitize content to prevent issues
  const sanitizedContent = sanitizeContent(existingContent);
  
  // Create the generation promise with enhanced error handling
  const generationPromise = new Promise<string>((resolve, reject) => {
    // Simulate realistic AI processing delay (1-3 seconds)
    const delay = Math.random() * 2000 + 1000;
    
    setTimeout(() => {
      try {
        // Simulate various failure scenarios for testing
        const random = Math.random();
        
        if (random < 0.05) {
          // Network errors (5% chance)
          const networkErrors = [
            'Network connection timeout',
            'Failed to fetch from AI service',
            'Connection refused by server'
          ];
          const error = new Error(networkErrors[Math.floor(Math.random() * networkErrors.length)]);
          error.name = 'NetworkError';
          throw error;
        }
        
        if (random < 0.08) {
          // Service errors (3% additional chance)
          const serviceErrors = [
            'AI service temporarily unavailable',
            'Content generation failed - please try again',
            'AI model is currently overloaded',
            'Rate limit exceeded'
          ];
          throw new AIGenerationError(
            serviceErrors[Math.floor(Math.random() * serviceErrors.length)],
            undefined,
            { contentLength: sanitizedContent.length }
          );
        }
        
        // Check for empty content
        if (sanitizedContent.trim().length === 0) {
          throw new ValidationError('Cannot generate content for empty input');
        }
        
        // Context-aware sample AI-generated text options
        const continuationTexts = [
          " The morning sun cast long shadows across the empty street, creating patterns that danced with each passing cloud. Sarah pulled her coat tighter as she walked, her footsteps echoing in the quiet neighborhood.",
          " As the clock struck midnight, the old library seemed to come alive with whispers from forgotten books. Each shelf held secrets that had been waiting decades to be discovered by the right reader.",
          " The coffee shop buzzed with the familiar sounds of morning - the hiss of the espresso machine, the gentle murmur of conversations, and the rustle of newspapers being turned by eager readers.",
          " Mountains stretched endlessly before them, their peaks shrouded in mist that seemed to hold ancient mysteries. The hiking trail wound through valleys where wildflowers painted the landscape in vibrant colors.",
          " In the digital age, human connections had become both easier and more complex. A simple message could travel across the world in seconds, yet meaningful conversations seemed harder to find.",
          " The old wooden door creaked as it opened, revealing a room that hadn't been disturbed for years. Dust particles floated in the afternoon light streaming through cracked windows.",
          " She closed her eyes and listened to the ocean waves crashing against the shore. Each wave brought with it memories of summers past and dreams of adventures yet to come.",
          " The city never slept, its neon lights painting the night in electric blues and vibrant pinks. From the rooftop, the world below looked like a circuit board come to life.",
          " Thunder rumbled in the distance as dark clouds gathered overhead. The first drops of rain began to fall, each one carrying the promise of renewal and change.",
          " In the quiet of the forest, every sound seemed amplified - the rustle of leaves, the snap of twigs underfoot, and somewhere in the distance, the call of a lone bird."
        ];
        
        // Select appropriate continuation based on content length and context
        let selectedText;
        if (sanitizedContent.length < 50) {
          // For short content, provide more descriptive openings
          const openingTexts = continuationTexts.filter(text => 
            text.includes('morning') || text.includes('door') || text.includes('city')
          );
          selectedText = openingTexts[Math.floor(Math.random() * openingTexts.length)] || continuationTexts[0];
        } else {
          // For longer content, provide varied continuations
          selectedText = continuationTexts[Math.floor(Math.random() * continuationTexts.length)];
        }
        
        // Validate generated text before returning
        if (!selectedText || selectedText.trim().length === 0) {
          throw new AIGenerationError('Generated text is empty or invalid');
        }
        
        resolve(selectedText);
      } catch (error) {
        if (error instanceof ValidationError || error instanceof AIGenerationError) {
          reject(error);
        } else if (isNetworkError(error as Error)) {
          reject(new AIGenerationError(
            `Network error: ${(error as Error).message}`,
            error as Error,
            { isNetworkError: true }
          ));
        } else {
          reject(new AIGenerationError(
            `Unexpected error during generation: ${getErrorMessage(error)}`,
            error instanceof Error ? error : undefined
          ));
        }
      }
    }, delay);
  });

  // Apply timeout wrapper
  return withTimeout(generationPromise, timeoutMs, `AI generation timed out after ${timeoutMs}ms`);
};

// Editor state machine
export const editorMachine = createMachine({
  id: 'editor',
  initial: 'idle',
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  context: {
    content: '',
    generatedText: '',
    streamingText: '',
    error: undefined,
    lastGenerationTime: undefined,
    generationCount: 0,
    retryCount: 0,
    isRetrying: false,
  },
  states: {
    idle: {
      on: {
        CONTINUE_WRITING: {
          target: 'loading',
          guard: ({ context }) => {
            // Validate content before proceeding
            const validation = validateContent(context.content);
            if (!validation.isValid) {
              logError(new ValidationError(validation.errors.join(', ')), 'CONTINUE_WRITING guard');
              return false;
            }
            return context.content.trim().length > 0;
          },
          actions: assign({
            error: undefined, // Clear any previous errors
            lastGenerationTime: Date.now(),
            retryCount: 0, // Reset retry count for new generation
            isRetrying: false,
          }),
        },
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ event }) => {
              // Sanitize and validate content updates
              const sanitized = sanitizeContent(event.content);
              const validation = validateContent(sanitized);
              
              if (!validation.isValid) {
                logError(new ValidationError(validation.errors.join(', ')), 'UPDATE_CONTENT');
                // Return original content if validation fails
                return event.content;
              }
              
              return sanitized;
            },
          }),
        },
        CLEAR_ERROR: {
          actions: assign({
            error: undefined,
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({
            content: '',
            generatedText: '',
            streamingText: '',
            error: undefined,
            lastGenerationTime: undefined,
            generationCount: 0,
          }),
        },
      },
    },
    loading: {
      entry: assign({
        streamingText: '', // Clear streaming text when starting
        generatedText: '', // Clear previous generated text
      }),
      invoke: {
        id: 'streamText',
        src: fromPromise(async ({ input }: { input: { content: string } }) => {
          const generator = mockAIStreamingService(input.content);
          const tokens: string[] = [];
          
          try {
            for await (const token of generator) {
              tokens.push(token);
              // Send token to machine (this would need to be handled differently in real implementation)
              // For now, we'll collect all tokens and return them
            }
            return tokens.join('');
          } catch (error) {
            throw error;
          }
        }),
        input: ({ context }) => ({ content: context.content }),
        onDone: {
          target: 'success',
          actions: assign({
            generatedText: ({ event }) => event.output,
            streamingText: '',
            error: undefined,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => {
              const errorMessage = (event.error as Error)?.message || 'AI generation failed';
              console.error('AI Generation Error:', errorMessage);
              return errorMessage;
            },
            generatedText: '',
            streamingText: '',
          }),
        },
      },
      on: {
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ event }) => event.content,
          }),
        },
        CLEAR_ERROR: {
          actions: assign({
            error: undefined,
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({
            content: '',
            generatedText: '',
            streamingText: '',
            error: undefined,
            lastGenerationTime: undefined,
            generationCount: 0,
          }),
        },
      },
    },
    success: {
      entry: assign({
        // Safely append generated text to existing content with validation
        content: ({ context }) => {
          const { content, generatedText } = context;
          
          // Validate that we have generated text to append
          if (!generatedText || generatedText.trim().length === 0) {
            console.warn('No generated text to append');
            return content;
          }
          
          // Ensure proper spacing between existing content and new text
          const trimmedContent = content.trim();
          const trimmedGenerated = generatedText.trim();
          
          if (trimmedContent.length === 0) {
            return trimmedGenerated;
          }
          
          // Add appropriate spacing based on content structure
          const needsSpace = !trimmedContent.endsWith('.') && 
                           !trimmedContent.endsWith('!') && 
                           !trimmedContent.endsWith('?') &&
                           !trimmedGenerated.startsWith(' ');
          
          return trimmedContent + (needsSpace ? ' ' : '') + trimmedGenerated;
        },
        generatedText: '', // Clear generated text after appending
        error: undefined, // Ensure error state is cleared
        generationCount: ({ context }) => context.generationCount + 1,
      }),
      after: {
        // Automatically return to idle after content is updated
        150: 'idle',
      },
      on: {
        CONTINUE_WRITING: {
          target: 'loading',
          actions: assign({
            error: undefined,
            lastGenerationTime: Date.now(),
          }),
        },
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ event }) => event.content,
          }),
        },
        CLEAR_ERROR: {
          actions: assign({
            error: undefined,
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({
            content: '',
            generatedText: '',
            streamingText: '',
            error: undefined,
            lastGenerationTime: undefined,
            generationCount: 0,
          }),
        },
      },
    },
    error: {
      entry: ({ context }) => {
        // Log error for debugging while preserving user content
        console.error('Editor machine entered error state:', context.error);
      },
      on: {
        CONTINUE_WRITING: {
          target: 'loading',
          actions: assign({
            error: undefined,
            generatedText: '', // Clear any stale generated text
            lastGenerationTime: Date.now(),
          }),
        },
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ event }) => event.content,
            // Keep error visible until user tries again or resets
          }),
        },
        CLEAR_ERROR: {
          target: 'idle',
          actions: assign({
            error: undefined,
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({
            content: '',
            generatedText: '',
            streamingText: '',
            error: undefined,
            lastGenerationTime: undefined,
            generationCount: 0,
          }),
        },
      },
      after: {
        // Auto-clear error after 10 seconds to improve UX
        10000: {
          target: 'idle',
          actions: assign({
            error: undefined,
          }),
        },
      },
    },
  },
});

// Type exports for use in components
export type EditorMachine = typeof editorMachine;
export type EditorState = ReturnType<EditorMachine['transition']>;