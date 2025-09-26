import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Sparkles,
  Underline
} from 'lucide-react';
import { toggleMark } from 'prosemirror-commands';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React from 'react';

interface ToolbarProps {
  editorView: EditorView | null;
  className?: string;
  aiStreaming:boolean
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  onClick, 
  isActive, 
  disabled = false, 
  children, 
  title 
}) => {
  return (
    
      <Button
        variant={isActive ? 'default_light' : "secondary"}
        size="icon_sm"
        onClick={onClick}
        disabled={disabled}
        transition="none"
        title={title}
      >
        {children}
      </Button>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({ editorView, className,aiStreaming }) => {
  const [editorState, setEditorState] = React.useState<EditorState | null>(null);

  // Update editor state when view changes
  React.useEffect(() => {
    if (editorView) {
      setEditorState(editorView.state);
      
      // Listen for state updates
      const updateListener = () => {
        setEditorState(editorView.state);
      };
      
      // Add a custom update listener
      const originalUpdateState = editorView.updateState;
      editorView.updateState = function(state) {
        originalUpdateState.call(this, state);
        updateListener();
      };
      
      return () => {
        // Restore original updateState method
        editorView.updateState = originalUpdateState;
      };
    }
  }, [editorView]);

  if (!editorView || !editorState) {
    return (
      <div className={cn('flex items-center gap-1 p-2 border-b border-border bg-muted/30', className)}>
        {/* Skeleton buttons */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const { schema, selection } = editorState;
  
  if (!schema || !selection) {
    return (
      <div className={cn('flex items-center gap-1 p-2 border-b border-border bg-muted/30', className)}>
        {/* Skeleton buttons */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  // Helper function to check if a mark is active
  const isMarkActive = (markType: any) => {
    if (!markType || !editorState || !selection) return false;
    
    const { from, to, empty } = selection;
    if (empty) {
      const marks = editorState.storedMarks || selection.$from.marks();
      return markType.isInSet(marks);
    }
    return editorState.doc.rangeHasMark(from, to, markType);
  };



  // Command handlers
  const toggleBold = () => {
    if (!schema.marks.strong || !editorState || !editorView) return;
    const command = toggleMark(schema.marks.strong);
    if (command(editorState)) {
      command(editorState, editorView.dispatch);
      editorView.focus();
    }
  };

  const toggleItalic = () => {
    if (!schema.marks.em || !editorState || !editorView) return;
    const command = toggleMark(schema.marks.em);
    if (command(editorState)) {
      command(editorState, editorView.dispatch);
      editorView.focus();
    }
  };

  const toggleUnderline = () => {
    if (!schema.marks.underline || !editorState || !editorView) return;
    const command = toggleMark(schema.marks.underline);
    if (command(editorState)) {
      command(editorState, editorView.dispatch);
      editorView.focus();
    }
  };




  return (
    <div className={cn(
      'flex items-center gap-1 p-2 border-b border-border bg-card rounded-lg',
      className
    )}>
      <ToolbarButton
        onClick={toggleBold}
        isActive={schema.marks.strong ? isMarkActive(schema.marks.strong) : false}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={toggleItalic}
        isActive={schema.marks.em ? isMarkActive(schema.marks.em) : false}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={toggleUnderline}
        isActive={schema.marks.underline ? isMarkActive(schema.marks.underline) : false}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <div className='h-full w-1 bg-border'/>
        {aiStreaming && <div className='flex items-center ml-auto gap-2'>
          <Sparkles className='size-3 text-primary animate-spin'/>
          <span className="text-xs text-primary font-medium">AI Generating...</span>
        </div>}
  
    </div>
  );
};