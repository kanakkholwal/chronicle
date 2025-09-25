import React from 'react';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { toggleMark, setBlockType } from 'prosemirror-commands';
import { wrapInList } from 'prosemirror-schema-list';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered 
} from 'lucide-react';

interface ToolbarProps {
  editorView: EditorView | null;
  className?: string;
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
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          'h-8 w-8 p-0 transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {children}
      </Button>
    </motion.div>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({ editorView, className }) => {
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

  // Helper function to check if a block type is active
  const isBlockActive = (nodeType: any) => {
    if (!nodeType || !editorState || !selection) return false;
    
    const { $from, to, node } = selection;
    if (node) {
      return node.type === nodeType;
    }
    return to <= $from.end() && $from.parent.type === nodeType;
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

  const setHeading1 = () => {
    if (!schema.nodes.heading || !editorState || !editorView) return;
    const command = setBlockType(schema.nodes.heading, { level: 1 });
    if (command(editorState)) {
      command(editorState, editorView.dispatch);
      editorView.focus();
    }
  };

  const setHeading2 = () => {
    if (!schema.nodes.heading || !editorState || !editorView) return;
    const command = setBlockType(schema.nodes.heading, { level: 2 });
    if (command(editorState)) {
      command(editorState, editorView.dispatch);
      editorView.focus();
    }
  };

  const toggleBulletList = () => {
    if (!schema.nodes.bullet_list || !editorState || !editorView) return;
    const command = wrapInList(schema.nodes.bullet_list);
    if (command(editorState)) {
      command(editorState, editorView.dispatch);
      editorView.focus();
    }
  };

  const toggleOrderedList = () => {
    if (!schema.nodes.ordered_list || !editorState || !editorView) return;
    const command = wrapInList(schema.nodes.ordered_list);
    if (command(editorState)) {
      command(editorState, editorView.dispatch);
      editorView.focus();
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-1 p-2 border-b border-border bg-muted/30',
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

      <div className="w-px h-6 bg-border mx-1" />

      <ToolbarButton
        onClick={setHeading1}
        isActive={schema.nodes.heading ? (isBlockActive(schema.nodes.heading) && selection.$from?.parent?.attrs?.level === 1) : false}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={setHeading2}
        isActive={schema.nodes.heading ? (isBlockActive(schema.nodes.heading) && selection.$from?.parent?.attrs?.level === 2) : false}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-border mx-1" />

      <ToolbarButton
        onClick={toggleBulletList}
        isActive={schema.nodes.bullet_list ? isBlockActive(schema.nodes.bullet_list) : false}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={toggleOrderedList}
        isActive={schema.nodes.ordered_list ? isBlockActive(schema.nodes.ordered_list) : false}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};