import {
  sanitizeContent,
  validateContent,
  ValidationError
} from '@/lib/errors';
import { assign, createMachine } from 'xstate';

// Fake Streaming AI generator
export async function* mockAIStreamingService(
  existingContent: string = ''
): AsyncGenerator<string, void, unknown> {
  const { isValid, errors } = validateContent(existingContent);
  if (!isValid) {
    throw new ValidationError(
      `Invalid content: ${errors.join(', ')}`,
      { content: existingContent.substring(0, 100) + '...' }
    );
  }

  const sanitized = sanitizeContent(existingContent);
  if (!sanitized.trim()) throw new ValidationError('Cannot generate content for empty input');

  // Simulate AI-generated text options
  const continuationTexts = [
    "The morning sun cast long shadows across the empty street...",
    "As the clock struck midnight, the old library seemed to come alive...",
    "The coffee shop buzzed with the familiar sounds of morning...",
    "Mountains stretched endlessly before them, their peaks shrouded in mist...",
    "In the digital age, human connections had become both easier and more complex...",
    "The old wooden door creaked as it opened, revealing a room untouched for years...",
    "She closed her eyes and listened to the ocean waves crashing against the shore...",
    "The city never slept, its neon lights painting the night in electric blues and pinks...",
    "Thunder rumbled in the distance as dark clouds gathered overhead...",
    "In the quiet of the forest, every sound seemed amplified..."
  ];

  const selectedText =
    sanitized.length < 50
      ? continuationTexts.find(t => /morning|door|city/i.test(t)) || continuationTexts[0]
      : continuationTexts[Math.floor(Math.random() * continuationTexts.length)];

  const tokens = selectedText.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    await new Promise(r => setTimeout(r, Math.random() * 100 + 50));
    yield token;
  }
}


// XState Editor Machine
export interface EditorContext {
  content: string;
  error: string | null;
}

export type EditorEvent =
  | { type: "UPDATE_CONTENT"; content: string }
  | { type: "CONTINUE_WRITING" }
  | { type: "CANCEL" }
  | { type: "CLEAR_ERROR" };

export const editorMachine = createMachine({
  id: 'editor',
  initial: 'idle',
  context: { content: '', error: null },
  states: {
    idle: {
      on: {
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ context,event }) =>
              event.type === 'UPDATE_CONTENT' ? event.content : context.content,
          }),
        },
        CONTINUE_WRITING: 'loading',
      },
    },
    loading: {
      on: {
        CANCEL: 'idle',
        UPDATE_CONTENT: {
          actions: assign({
            content: ({ context,event }) =>
              event.type === 'UPDATE_CONTENT' ? event.content : context.content,
          }),
        },
      },
    },
    streaming: {
      on: {
        CANCEL: 'idle',
      },
    },
    error: {
      on: {
        CLEAR_ERROR: {
          actions: assign({ error: (_) => null }),
          target: 'idle',
        },
      },
    },
  },
});

export type EditorMachine = typeof editorMachine;
export type EditorState = ReturnType<EditorMachine['transition']>;
