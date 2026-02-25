// PATH: apps/web/src/components/editor/InlineComment.tsx
// WHAT: Добавление inline-комментария с диапазоном текста
// WHY:  FR-022 — заметки должны привязываться к выделенному диапазону
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-api.ts

import { FormEvent, useState } from 'react';

interface InlineCommentProps {
  content: string;
  onSubmit: (payload: {
    text: string;
    position_start?: number;
    position_end?: number;
  }) => Promise<void>;
}

export function InlineComment({ content, onSubmit }: InlineCommentProps) {
  const [text, setText] = useState('');
  const [selection, setSelection] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const note = text.trim();
    if (!note) return;

    const selected = selection.trim();
    if (!selected) {
      await onSubmit({ text: note });
      setText('');
      return;
    }

    const start = content.indexOf(selected);
    if (start < 0) {
      await onSubmit({ text: note });
    } else {
      await onSubmit({ text: note, position_start: start, position_end: start + selected.length });
    }
    setText('');
    setSelection('');
  };

  return (
    <form className="card" onSubmit={submit}>
      <h4>Inline comment</h4>
      <input
        value={selection}
        onChange={(e) => setSelection(e.target.value)}
        placeholder="Paste selected text (optional)"
      />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Comment" />
      <button type="submit" className="btn-secondary">
        Save comment
      </button>
    </form>
  );
}
