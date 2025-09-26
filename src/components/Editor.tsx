import { EditorError, ErrorType, sanitizeContent } from '@/lib/errors';
import { richTextSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { DOMParser, DOMSerializer } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useEffect, useRef } from 'react';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  isLoading: boolean;
  placeholder?: string;
  onError?: (error: EditorError) => void;
  onEditorReady?: (view: EditorView) => void;
}

export const Editor: React.FC<EditorProps> = ({ content, onChange, isLoading, placeholder = "Start typing...", onError, onEditorReady }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isMountedRef = useRef(true);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    try {
      const initialContent = sanitizeContent(content);
      const doc = initialContent
        ? DOMParser.fromSchema(richTextSchema).parse(new window.DOMParser().parseFromString(initialContent, 'text/html'))
        : richTextSchema.node('doc', null, [richTextSchema.node('paragraph')]);

      const state = EditorState.create({
        schema: richTextSchema,
        doc,
        plugins: [history(), keymap(baseKeymap), dropCursor(), gapCursor(), keymap({
          'Mod-b': toggleMark(richTextSchema.marks.strong),
          'Mod-i': toggleMark(richTextSchema.marks.em),
          'Mod-u': toggleMark(richTextSchema.marks.underline)
        })]
      });

      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(transaction) {
          const newState = view.state.apply(transaction);
          view.updateState(newState);

          // Serialize content
          const html = (() => {
            const frag = DOMSerializer.fromSchema(richTextSchema).serializeFragment(newState.doc.content);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(frag);
            return tempDiv.innerHTML;
          })();

          onChange(html); // **Directly update XState**
        },
        attributes: {
          class: cn('prose max-w-none min-h-[200px] p-3 rounded-md bg-input/30 focus:outline-none'),
          'data-placeholder': placeholder
        }
      });

      viewRef.current = view;
      onEditorReady?.(view);
    } catch (err) {
      onError?.(new EditorError(ErrorType.EDITOR_INITIALIZATION, `Editor init failed: ${err instanceof Error ? err.message : err}`));
    }

    return () => {
      isMountedRef.current = false;
      try { viewRef.current?.destroy(); } catch {}
      viewRef.current = null;
    };
  }, [editorRef, onChange, placeholder, onError, onEditorReady]);

  // Sync external content changes
  useEffect(() => {
    if (!viewRef.current) return;
    const currentHtml = DOMSerializer.fromSchema(richTextSchema).serializeFragment(viewRef.current.state.doc.content);
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(currentHtml);
    const serialized = tempDiv.innerHTML;

    if (serialized !== content) {
      try {
        const doc = content
          ? DOMParser.fromSchema(richTextSchema).parse(new window.DOMParser().parseFromString(content, 'text/html'))
          : richTextSchema.node('doc', null, [richTextSchema.node('paragraph')]);

        const newState = EditorState.create({
          schema: richTextSchema,
          plugins: viewRef.current.state.plugins,
          doc
        });

        viewRef.current.updateState(newState);
      } catch (err) {
        onError?.(new EditorError(ErrorType.EDITOR_UPDATE, `Failed to sync content: ${err instanceof Error ? err.message : err}`));
      }
    }
  }, [content, onError]);

  if (isLoading) return <div className="min-h-[200px] p-4 rounded-md bg-muted/50" />;

  return <div ref={editorRef} className="relative w-full" />;
};
