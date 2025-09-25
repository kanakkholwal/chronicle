import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState,   } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser, Node as ProseMirrorNode } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { richTextSchema } from '@/lib/schema';
import { EditorError, ErrorType, logError, validateContent, sanitizeContent } from '@/lib/errors';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  isLoading: boolean;
  placeholder?: string;
  onError?: (error: EditorError) => void;
  editorView?: EditorView | null;
  onEditorReady?: (view: EditorView) => void;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  onChange,
  isLoading,
  placeholder = "Start typing your story...",
  onError,
  onEditorReady
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitializedRef = useRef(false);
  const [_initError, setInitError] = useState<EditorError | null>(null);
  const [_isEmpty, setIsEmpty] = useState(true);
  
  // Performance optimization: Track if component is mounted to prevent memory leaks
  const isMountedRef = useRef(true);
  
  // Performance optimization: Memoize placeholder to prevent unnecessary re-renders
  const memoizedPlaceholder = React.useMemo(() => placeholder, [placeholder]);

  // Performance-optimized debounced content change handler
  const debouncedOnChange = useCallback(
    (() => {
      let timeoutId: number;
      let lastContent = '';
      
      return (newContent: string) => {
        // Performance optimization: Skip if content hasn't changed
        if (newContent === lastContent) return;
        lastContent = newContent;
        
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          // Check if component is still mounted
          if (!isMountedRef.current) return;
          
          try {
            // Validate content before calling onChange
            const validation = validateContent(newContent);
            if (!validation.isValid) {
              const error = new EditorError(
                ErrorType.VALIDATION,
                `Content validation failed: ${validation.errors.join(', ')}`,
                undefined,
                { content: newContent.substring(0, 100) + '...' }
              );
              logError(error, 'Editor.debouncedOnChange');
              onError?.(error);
              return;
            }

            const sanitized = sanitizeContent(newContent);
            onChange(sanitized);
            setIsEmpty(sanitized.trim().length === 0);
          } catch (error) {
            const editorError = new EditorError(
              ErrorType.EDITOR_UPDATE,
              `Failed to update content: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error instanceof Error ? error : undefined
            );
            logError(editorError, 'Editor.debouncedOnChange');
            onError?.(editorError);
          }
        }, 100); // Reduced debounce time for better responsiveness
      };
    })(),
    [onChange, onError]
  );

  useEffect(() => {
    if (!editorRef.current || isInitializedRef.current) return;

    try {
      // Validate and sanitize initial content
      const validation = validateContent(content);
      if (!validation.isValid) {
        const error = new EditorError(
          ErrorType.VALIDATION,
          `Initial content validation failed: ${validation.errors.join(', ')}`,
          undefined,
          { content: content.substring(0, 100) + '...' }
        );
        setInitError(error);
        logError(error, 'Editor.useEffect.initialization');
        onError?.(error);
        return;
      }

      const sanitizedContent = sanitizeContent(content);
      setIsEmpty(sanitizedContent.trim().length === 0);

      // Create initial document with error handling
      let doc;
      try {
        if (sanitizedContent) {
          // Parse HTML content if it contains formatting
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = sanitizedContent;
          doc = DOMParser.fromSchema(richTextSchema).parse(tempDiv);
        } else {
          doc = richTextSchema.node('doc', null, [richTextSchema.node('paragraph')]);
        }
      } catch (error) {
        const editorError = new EditorError(
          ErrorType.EDITOR_INITIALIZATION,
          `Failed to create initial document: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined,
          { content: sanitizedContent.substring(0, 100) + '...' }
        );
        setInitError(editorError);
        logError(editorError, 'Editor.useEffect.document');
        onError?.(editorError);
        return;
      }

      // Create editor state with error handling
      let state;
      try {
        // Custom keymap for formatting shortcuts
        const customKeymap = keymap({
          'Mod-b': toggleMark(richTextSchema.marks.strong),
          'Mod-i': toggleMark(richTextSchema.marks.em),
          'Mod-u': toggleMark(richTextSchema.marks.underline),
        });

        state = EditorState.create({
          schema: richTextSchema,
          doc,
          plugins: [
            history(),
            customKeymap,
            keymap(baseKeymap),
            dropCursor(),
            gapCursor()
          ]
        });
      } catch (error) {
        const editorError = new EditorError(
          ErrorType.EDITOR_INITIALIZATION,
          `Failed to create editor state: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined
        );
        setInitError(editorError);
        logError(editorError, 'Editor.useEffect.state');
        onError?.(editorError);
        return;
      }

      // Create editor view with comprehensive error handling
      let view: EditorView;
      try {
        view = new EditorView(editorRef.current, {
          state,
          dispatchTransaction(transaction) {
            try {
              const newState = view.state.apply(transaction);
              view.updateState(newState);
              
              // Get text content and call debounced onChange
              const textContent = newState.doc.textContent;
              debouncedOnChange(textContent);
            } catch (error) {
              const editorError = new EditorError(
                ErrorType.EDITOR_UPDATE,
                `Transaction dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
              );
              logError(editorError, 'Editor.dispatchTransaction');
              onError?.(editorError);
            }
          },
          attributes: {
            class: cn(
              'prose prose-sm max-w-none focus:outline-none',
              'min-h-[200px] p-4 rounded-md',
              'bg-muted/50 border border-muted',
              'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
              'transition-colors duration-200',
              // Performance optimization: will-change for smooth animations
              'will-change-[border-color,box-shadow]'
            ),
            'data-placeholder': memoizedPlaceholder,
            // Performance optimization: Enable hardware acceleration
            style: 'transform: translateZ(0);'
          },
          handleDOMEvents: {
            // Handle paste events with validation
            paste: (_view, event) => {
              try {
                const clipboardData = event.clipboardData?.getData('text/plain') || '';
                const validation = validateContent(clipboardData);
                
                if (!validation.isValid) {
                  event.preventDefault();
                  const error = new EditorError(
                    ErrorType.VALIDATION,
                    `Pasted content validation failed: ${validation.errors.join(', ')}`,
                    undefined,
                    { pastedContent: clipboardData.substring(0, 100) + '...' }
                  );
                  logError(error, 'Editor.paste');
                  onError?.(error);
                  return true;
                }
                
                return false; // Allow default paste behavior
              } catch (error) {
                const editorError = new EditorError(
                  ErrorType.EDITOR_UPDATE,
                  `Paste handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  error instanceof Error ? error : undefined
                );
                logError(editorError, 'Editor.paste');
                onError?.(editorError);
                return true; // Prevent default to avoid corruption
              }
            }
          }
        });
      } catch (error) {
        const editorError = new EditorError(
          ErrorType.EDITOR_INITIALIZATION,
          `Failed to create editor view: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined
        );
        setInitError(editorError);
        logError(editorError, 'Editor.useEffect.view');
        onError?.(editorError);
        return;
      }

      viewRef.current = view;
      isInitializedRef.current = true;
      setInitError(null); // Clear any previous errors
      
      // Notify parent component that editor is ready
      onEditorReady?.(view);

      return () => {
        isMountedRef.current = false;
        try {
          view?.destroy();
        } catch (error) {
          logError(
            new EditorError(
              ErrorType.EDITOR_INITIALIZATION,
              `Error during editor cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error instanceof Error ? error : undefined
            ),
            'Editor.cleanup'
          );
        }
        viewRef.current = null;
        isInitializedRef.current = false;
      };
    } catch (error) {
      const editorError = new EditorError(
        ErrorType.EDITOR_INITIALIZATION,
        `Unexpected error during editor initialization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
      setInitError(editorError);
      logError(editorError, 'Editor.useEffect.unexpected');
      onError?.(editorError);
    }
  }, [memoizedPlaceholder, debouncedOnChange, onError]);

  // Performance optimization: Cleanup mounted ref on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update content when prop changes with error handling
  useEffect(() => {
    if (!viewRef.current || content === viewRef.current.state.doc.textContent) return;

    try {
      // Validate new content
      const validation = validateContent(content);
      if (!validation.isValid) {
        const error = new EditorError(
          ErrorType.VALIDATION,
          `Content update validation failed: ${validation.errors.join(', ')}`,
          undefined,
          { content: content.substring(0, 100) + '...' }
        );
        logError(error, 'Editor.useEffect.contentUpdate');
        onError?.(error);
        return;
      }

      const sanitizedContent = sanitizeContent(content);
      setIsEmpty(sanitizedContent.trim().length === 0);

      const { state } = viewRef.current;
      
      // Create new document with error handling
      let doc;
      try {
        if (sanitizedContent) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = sanitizedContent;
          doc = DOMParser.fromSchema(richTextSchema).parse(tempDiv);
        } else {
          doc = richTextSchema.node('doc', null, [richTextSchema.node('paragraph')]);
        }
      } catch (error) {
        const editorError = new EditorError(
          ErrorType.EDITOR_UPDATE,
          `Failed to create document for content update: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined,
          { content: sanitizedContent.substring(0, 100) + '...' }
        );
        logError(editorError, 'Editor.useEffect.contentUpdate.document');
        onError?.(editorError);
        return;
      }
      
      // Create new state with error handling
      let newState;
      try {
        newState = EditorState.create({
          schema: state.schema,
          plugins: state.plugins,
          doc
        });
      } catch (error) {
        const editorError = new EditorError(
          ErrorType.EDITOR_UPDATE,
          `Failed to create state for content update: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined
        );
        logError(editorError, 'Editor.useEffect.contentUpdate.state');
        onError?.(editorError);
        return;
      }
      
      // Update view state with error handling
      try {
        viewRef.current.updateState(newState);
      } catch (error) {
        const editorError = new EditorError(
          ErrorType.EDITOR_UPDATE,
          `Failed to update editor state: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined
        );
        logError(editorError, 'Editor.useEffect.contentUpdate.updateState');
        onError?.(editorError);
      }
    } catch (error) {
      const editorError = new EditorError(
        ErrorType.EDITOR_UPDATE,
        `Unexpected error during content update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
      logError(editorError, 'Editor.useEffect.contentUpdate.unexpected');
      onError?.(editorError);
    }
  }, [content, onError]);

  if (isLoading) {
    return (
      <div className="min-h-[200px] p-4 rounded-md bg-muted/50 border border-muted">
        <Skeleton className="h-4 w-3/4 mb-3" />
        <Skeleton className="h-4 w-full mb-3" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return (
    <div 
      ref={editorRef}
      className="relative is-empty"
      data-placeholder={placeholder}
    />
  );
};