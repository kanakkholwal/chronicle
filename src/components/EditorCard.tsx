import React from 'react';
import { useMachine } from '@xstate/react';
import { EditorView } from 'prosemirror-view';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Editor } from './Editor';
import { Toolbar } from './Toolbar';
import { ContinueButton } from './ContinueButton';
import { StreamingSkeleton } from './StreamingSkeleton';
import { editorMachine } from '@/machines/editorMachine';
import { cn } from '@/lib/utils';

interface EditorCardProps {
  className?: string;
}

export const EditorCard: React.FC<EditorCardProps> = React.memo(({ className }) => {
  const [state, send] = useMachine(editorMachine);
  const [editorView, setEditorView] = React.useState<EditorView | null>(null);

  // Performance optimization: Memoize event handlers to prevent unnecessary re-renders
  const handleContentChange = React.useCallback((content: string) => {
    send({ type: 'UPDATE_CONTENT', content });
  }, [send]);

  const handleContinueWriting = React.useCallback(() => {
    send({ type: 'CONTINUE_WRITING' });
  }, [send]);

  const handleClearError = React.useCallback(() => {
    send({ type: 'CLEAR_ERROR' });
  }, [send]);

  const handleEditorReady = React.useCallback((view: EditorView) => {
    setEditorView(view);
  }, []);

  // Performance optimization: Memoize computed values
  const isLoading = React.useMemo(() => state.matches('loading'), [state]);
  const currentContent = React.useMemo(() => state.context.content, [state.context.content]);
  const hasError = React.useMemo(() => Boolean(state.context.error), [state.context.error]);
  const isButtonDisabled = React.useMemo(() => 
    !currentContent.trim() || isLoading, 
    [currentContent, isLoading]
  );

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <Card>
        <CardHeader className="pb-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              AI Writing Assistant
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Start writing and let AI help you continue your story
            </p>
          </div>
          {editorView && <Toolbar editorView={editorView} />}
        </CardHeader>
        
        <CardContent className="px-6 py-0">
          <Editor
            content={currentContent}
            onChange={handleContentChange}
            isLoading={isLoading}
            placeholder="Start typing your story..."
            onEditorReady={handleEditorReady}
          />
          
          {isLoading && <StreamingSkeleton />}
          
          {hasError && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 will-change-[opacity,transform]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium">
                    Generation Failed
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    {state.context.error}
                  </p>
                </div>
                <button
                  onClick={handleClearError}
                  className="ml-2 text-destructive/60 hover:text-destructive transition-colors duration-200 will-change-[color]"
                  aria-label="Clear error"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {state.matches('error') && (
                <p className="text-xs text-destructive/60 mt-2">
                  You can try again or the error will clear automatically in a few seconds.
                </p>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-4 justify-center">
          <ContinueButton
            onClick={handleContinueWriting}
            isLoading={isLoading}
            disabled={isButtonDisabled}
          />
        </CardFooter>
      </Card>
    </div>
  );
});