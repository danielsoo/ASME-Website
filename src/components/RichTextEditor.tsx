import React, { useMemo, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import Quill from 'quill';
import 'react-quill-new/dist/quill.snow.css';

// Quill Font: apply custom font to selected text only (register once before editor use)
let quillFontRegistered = false;
function registerQuillFont() {
  if (quillFontRegistered) return;
  try {
    const Font = Quill.import('formats/font') as { whitelist: string[] };
    Font.whitelist = ['sans', 'serif', 'monospace', 'jost', 'georgia', 'arial'];
    Quill.register(Font, true);
    quillFontRegistered = true;
  } catch (_) {}
}
if (typeof window !== 'undefined') registerQuillFont();

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Hint text shown above the toolbar (e.g. "Select text then use the toolbar to format only that part") */
  hint?: string;
}

const FONT_OPTIONS = [
  { value: 'sans', label: 'Default' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'jost', label: 'Jost' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'arial', label: 'Arial' },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter content...',
  className = '',
  minHeight = '120px',
  hint,
}) => {
  useEffect(() => {
    registerQuillFont();
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        [{ font: FONT_OPTIONS.map((f) => f.value) }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  const formats = [
    'header', 'font',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'align',
    'link',
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      {hint && (
        <p className="text-xs text-gray-500 mb-2">{hint}</p>
      )}
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
        className="bg-white text-gray-900 rounded border border-gray-300"
      />
      <style>{`
        .rich-text-editor .quill { border: none; }
        .rich-text-editor .ql-container { font-size: 14px; min-height: 100px; border: none; border-top: 1px solid #d1d5db; }
        .rich-text-editor .ql-editor { min-height: 100px; }
        .rich-text-editor .ql-toolbar { border: none; border-bottom: 1px solid #d1d5db; background: #f9fafb; border-radius: 6px 6px 0 0; }
        .rich-text-editor .ql-toolbar .ql-stroke { stroke: #d1d5db; }
        .rich-text-editor .ql-toolbar .ql-fill { fill: #6b7280; }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke { stroke: #3b82f6; }
        .rich-text-editor .ql-toolbar button:hover .ql-fill { fill: #3b82f6; }
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke { stroke: #3b82f6; }
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill { fill: #3b82f6; }
        .rich-text-editor .ql-font-sans { font-family: inherit; }
        .rich-text-editor .ql-font-serif { font-family: Georgia, serif; }
        .rich-text-editor .ql-font-monospace { font-family: monospace; }
        .rich-text-editor .ql-font-jost { font-family: 'Jost', sans-serif; }
        .rich-text-editor .ql-font-georgia { font-family: Georgia, serif; }
        .rich-text-editor .ql-font-arial { font-family: Arial, sans-serif; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
