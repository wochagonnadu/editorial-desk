// PATH: apps/web/src/components/editor/RichTextEditor.tsx
// WHAT: TipTap редактор с базовым форматированием и callback изменений
// WHY:  FR-021 — нужен чистый editor с bold/italic/headings/lists/links
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/package.json

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const ToolbarButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" className="btn-secondary" onClick={onClick}>
    {label}
  </button>
);

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content,
    editorProps: { attributes: { class: 'editor-area' } },
    onUpdate: ({ editor: next }) => onChange(next.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === content) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  if (!editor) return <p>Editor is loading...</p>;

  return (
    <section className="card">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} label="Bold" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullets"
        />
        <ToolbarButton
          onClick={() => {
            const href = window.prompt('Link URL');
            if (!href) return;
            editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
          }}
          label="Link"
        />
      </div>
      <EditorContent editor={editor} />
    </section>
  );
}
