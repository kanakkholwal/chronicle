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
    return ['u', 0] as const;
  }
};

// Convert OrderedMap to plain object and remove 'size'
const basicMarksObj: Record<string, any> = {};
basicSchema.spec.marks.forEach((markName: string, markSpec: any) => {
  if (markName !== "size") basicMarksObj[markName] = markSpec;
});

// Extend the basic schema with underline and list support
export const richTextSchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: {
    ...basicMarksObj,
    underline: underlineMark
  }
});

// Export individual node and mark types for convenience
export const { nodes, marks } = richTextSchema;