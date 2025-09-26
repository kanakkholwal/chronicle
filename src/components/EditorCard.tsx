import { CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { editorMachine, mockAIStreamingService } from "@/machines/editorMachine";
import { useMachine } from "@xstate/react";
import { Sparkles, X } from "lucide-react";
import { EditorView } from "prosemirror-view";
import "prosemirror-view/style/prosemirror.css";
import React from "react";
import { Editor } from "./Editor";
import { Toolbar } from "./Toolbar";
import { Button } from "./ui/button";

interface EditorCardProps {
  className?: string;
}

export const EditorCard: React.FC<EditorCardProps> = React.memo(({ className }) => {
  const [state, send] = useMachine(editorMachine);
  const [editorView, setEditorView] = React.useState<EditorView | null>(null);
  const streamingRef = React.useRef<AbortController | null>(null);

  const { content, error } = state.context;
  const isLoading = state.matches("loading") || state.matches("streaming");
  const hasError = Boolean(error);
  const isDisabled = isLoading || content.trim().length === 0;

  const handleContentChange = React.useCallback(
    (newContent: string) => send({ type: "UPDATE_CONTENT", content: newContent }),
    [send]
  );

  const handleContinueWriting = React.useCallback(async () => {
    if (state.matches("streaming")) {
      streamingRef.current?.abort();
      send({ type: "CANCEL" });
      return;
    }

    send({ type: "CONTINUE_WRITING" });
    streamingRef.current = new AbortController();
    const signal = streamingRef.current.signal;

    try {
      let currentContent = content;
      const generator = mockAIStreamingService(content);

      for await (const token of generator) {
        if (signal.aborted) break;
        currentContent += (currentContent.endsWith(" ") ? "" : " ") + token;
        send({ type: "UPDATE_CONTENT", content: currentContent });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!signal.aborted) send({ type: "CANCEL" });
    }
  }, [state, send, content]);

  const handleClearError = React.useCallback(() => send({ type: "CLEAR_ERROR" }), [send]);

  const handleEditorReady = React.useCallback((view: EditorView) => {
    setEditorView(view);
  }, []);

  return (
    <div className={cn("w-full mx-auto relative", className)}>
      {editorView && <Toolbar editorView={editorView}  aiStreaming={isLoading}/>}

      <CardContent className="py-3 h-full">
        <Editor
          content={content}
          onChange={handleContentChange}
          isLoading={isLoading}
          placeholder="Start typing your story..."
          onEditorReady={handleEditorReady}
        />


        {hasError && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium">Generation Failed</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
              <button
                onClick={handleClearError}
                className="ml-2 text-destructive/60 hover:text-destructive transition-colors"
                aria-label="Clear error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {state.matches("error") && (
              <p className="text-xs text-destructive/60 mt-2">
                You can try again, or the error will clear automatically.
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="py-4 items-center sticky bottom-0 bg-popover shadow rounded-2xl backdrop-blur-md min-w-1/2 max-w-md mx-auto">
        <div className="text-foreground/70 text-sm flex-auto">
          Use our AI to help you write your story.
        </div>
        <Button onClick={handleContinueWriting} size="sm" variant="dark" disabled={isDisabled}>
          {state.matches("streaming") ? "Stop" : "Continue Writing"}
          <Sparkles className="size-4 animate-pulse ml-1" />
        </Button>
      </CardFooter>
    </div>
  );
});
