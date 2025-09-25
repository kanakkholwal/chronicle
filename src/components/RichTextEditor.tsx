import React from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  isLoading = false,
  placeholder = "Start typing your story...",
  className
}) => {
  return (
    <div className={className}>
      <div>Rich Text Editor - {content}</div>
      <button onClick={() => onChange('test')}>Test</button>
    </div>
  );
};

export { RichTextEditor };