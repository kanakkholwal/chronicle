import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';

// Create a custom schema with underline support
const underlineMark = {
  parseDOM: [
    { tag: 'u' },
    { style: 'text-decoration=underline' }
  ],
  toDOM() {
    return ['u', 0];
  }
};

// Extend the basic schema with underline and list support
export const richTextSchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: {
    ...basicSchema.spec.marks,
    underline: underlineMark
  }
});

// Export individual node and mark types for convenience
export const { nodes, marks } = richTextSchema;