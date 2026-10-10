import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
  Copy,
  ClipboardCheck,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';
import { copyFormattedContent, copyPlainText, getWordAndCharCount } from '../services/contentPreserver';
import { Language, translations } from '../utils/i18n';

interface ArticleEditorProps {
  title: string;
  onChangeTitle: (title: string) => void;
  content: string; // HTML string
  onChangeContent: (html: string) => void;
  warningNote?: string;
  onOpenMediaModal?: () => void;
  lang?: Language;
  isFocusMode?: boolean;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  title,
  onChangeTitle,
  content,
  onChangeContent,
  warningNote,
  onOpenMediaModal,
  lang = 'en',
  isFocusMode = false,
}) => {
  const t = translations[lang];
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize TipTap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-sky-700 underline cursor-pointer font-medium',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[380px] pb-36 text-stone-900 leading-relaxed font-sans',
        spellcheck: 'true',
        inputmode: 'text',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChangeContent(html);
      setStats(getWordAndCharCount(editor.getText()));
    },
  });

  // Sync content if changed externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
      setStats(getWordAndCharCount(editor.getText()));
    }
  }, [content, editor]);

  // Auto-resize title textarea as user types
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeTitle(e.target.value);
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  // Link Dialog
  const handleOpenLinkModal = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setLinkModalOpen(true);
  };

  const handleApplyLink = () => {
    if (!editor) return;
    if (linkUrl.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('/') && !finalUrl.startsWith('#')) {
        finalUrl = 'https://' + finalUrl;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    setLinkModalOpen(false);
  };

  // Dedicated Copy Formatted Content
  const handleCopyFormatted = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const res = await copyFormattedContent(html);
    if (res.success) {
      setCopyFeedback(t.copiedRich);
    } else {
      setCopyFeedback('Clipboard access restricted.');
    }
    setTimeout(() => setCopyFeedback(null), 3500);
  };

  // Plain Text Copy
  const handleCopyPlain = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const ok = await copyPlainText(html);
    if (ok) {
      setCopyFeedback(t.copiedPlain);
    } else {
      setCopyFeedback('Copy failed.');
    }
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // Reading time calculation (average 200 words per minute)
  const readingTimeMin = Math.max(1, Math.ceil(stats.words / 200));

  if (!editor) {
    return (
      <div className="p-8 text-center text-xs text-stone-400 animate-pulse">
        Initializing editorial workspace...
      </div>
    );
  }

  return (
    <div className="relative flex flex-col">
      {/* Sticky Mobile Formatting Toolbar (Optimized for Android soft keyboard) */}
      <div className="sticky top-[49px] z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200/90 py-1.5 px-2 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Paragraph & Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`p-2 rounded-xl text-xs font-semibold transition shrink-0 active:scale-95 ${
              editor.isActive('paragraph') && !editor.isActive('heading')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Paragraph"
          >
            <Pilcrow className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-0.5 active:scale-95 ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-amber-200 text-amber-950 shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Heading 2 (H2)"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-0.5 active:scale-95 ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-amber-200 text-amber-950 shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Heading 3 (H3)"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            className={`px-2 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-0.5 active:scale-95 ${
              editor.isActive('heading', { level: 4 })
                ? 'bg-amber-200 text-amber-950 shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Heading 4 (H4)"
          >
            <Heading4 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-stone-300 shrink-0 mx-1" />

          {/* Inline Formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-xl transition shrink-0 active:scale-95 ${
              editor.isActive('bold')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-xl transition shrink-0 active:scale-95 ${
              editor.isActive('italic')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-xl transition shrink-0 active:scale-95 ${
              editor.isActive('underline')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-stone-300 shrink-0 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-xl transition shrink-0 active:scale-95 ${
              editor.isActive('bulletList')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Bullet list"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-xl transition shrink-0 active:scale-95 ${
              editor.isActive('orderedList')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Numbered list"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-xl transition shrink-0 active:scale-95 ${
              editor.isActive('blockquote')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>

          {/* Hyperlink */}
          <button
            type="button"
            onClick={handleOpenLinkModal}
            className={`p-2 rounded-xl transition shrink-0 active:scale-95 ${
              editor.isActive('link')
                ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
            }`}
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {/* Tables dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowTableMenu(!showTableMenu)}
              className={`p-2 rounded-xl transition flex items-center gap-0.5 active:scale-95 ${
                editor.isActive('table')
                  ? 'bg-amber-200 text-amber-950 font-bold shadow-2xs'
                  : 'text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100'
              }`}
              title="Table Options"
            >
              <TableIcon className="w-4 h-4" />
            </button>

            {showTableMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 z-50 min-w-[170px] text-xs space-y-1">
                {!editor.isActive('table') ? (
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                      setShowTableMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 text-stone-800 font-semibold"
                  >
                    + {lang === 'bn' ? '৩×৩ টেবিল যুক্ত করুন' : 'Insert 3x3 Table'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addRowAfter().run();
                        setShowTableMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-stone-100 text-stone-700"
                    >
                      + {lang === 'bn' ? 'সারি (Row) যোগ করুন' : 'Add Row'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addColumnAfter().run();
                        setShowTableMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-stone-100 text-stone-700"
                    >
                      + {lang === 'bn' ? 'কলাম যোগ করুন' : 'Add Column'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteRow().run();
                        setShowTableMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700"
                    >
                      {lang === 'bn' ? 'সারি মুছুন' : 'Delete Row'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteColumn().run();
                        setShowTableMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700"
                    >
                      {lang === 'bn' ? 'কলাম মুছুন' : 'Delete Column'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteTable().run();
                        setShowTableMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 font-semibold border-t border-stone-100 pt-1.5"
                    >
                      {lang === 'bn' ? 'সম্পূর্ণ টেবিল মুছুন' : 'Delete Entire Table'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="w-[1px] h-6 bg-stone-300 shrink-0 mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded-xl text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100 disabled:opacity-30 transition shrink-0 active:scale-95"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded-xl text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100 disabled:opacity-30 transition shrink-0 active:scale-95"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-2 rounded-xl text-stone-700 bg-white border border-stone-200/80 hover:bg-stone-100 transition shrink-0 active:scale-95"
            title="Clear formatting"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-stone-300 shrink-0 mx-1" />

          {/* Formatted Copy Button (Primary Action) */}
          <button
            type="button"
            onClick={handleCopyFormatted}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-stone-900 text-amber-300 hover:bg-stone-800 transition shrink-0 active:scale-95 shadow-xs"
            title="Copy Formatted Content (H2, H3, bold, lists, tables preserved)"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t.copyRich}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPlain}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition shrink-0 active:scale-95"
            title="Copy Plain Text"
          >
            {t.copyPlain}
          </button>
        </div>
      </div>

      {/* Copy Feedback Toast Banner */}
      {copyFeedback && (
        <div className="max-w-md mx-auto w-full px-4 mt-2">
          <div className="p-3 bg-stone-900 text-amber-300 text-xs rounded-2xl flex items-center gap-2.5 shadow-xl animate-in fade-in slide-in-from-top-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1 font-medium">{copyFeedback}</span>
          </div>
        </div>
      )}

      {/* Preservation Warning Banner */}
      {warningNote && (
        <div className="max-w-md mx-auto w-full px-4 mt-2">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">
                {lang === 'bn' ? 'ব্লক প্রিজার্ভেশন সক্রিয়:' : 'Block Preservation Active:'}
              </span>
              <span className="leading-relaxed">{warningNote}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Writing Pad */}
      <div className="max-w-md mx-auto w-full px-4 pt-3">
        {/* Title Field (Auto-expanding) */}
        <textarea
          ref={titleTextareaRef}
          value={title}
          onChange={handleTitleChange}
          placeholder={t.articleTitle}
          rows={1}
          className="w-full text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 placeholder:text-stone-300 border-none outline-none resize-none bg-transparent overflow-hidden leading-snug py-1 mb-2 font-sans"
        />

        <div className="h-[1px] bg-stone-200/90 mb-4" />

        {/* TipTap Rich Text Area */}
        <EditorContent editor={editor} />
      </div>

      {/* Word, Character & Reading Time Metrics */}
      <div className="max-w-md mx-auto w-full px-4 py-2.5 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-stone-800 font-bold">
              {lang === 'bn' ? stats.words.toLocaleString('bn-BD') : stats.words}
            </strong>{' '}
            {t.words}
          </span>
          <span>
            <strong className="text-stone-800 font-bold">
              {lang === 'bn' ? stats.chars.toLocaleString('bn-BD') : stats.chars}
            </strong>{' '}
            {t.chars}
          </span>
          <span className="hidden xs:inline text-stone-400">•</span>
          <span className="hidden xs:inline flex items-center gap-1 text-stone-500">
            <BookOpen className="w-3 h-3 text-stone-400" />
            {lang === 'bn'
              ? `~${readingTimeMin.toLocaleString('bn-BD')} মিনিট পড়া`
              : `~${readingTimeMin} min read`}
          </span>
        </div>
        <span className="text-[10px] text-stone-400 font-medium">
          {t.bengaliEnglishReady}
        </span>
      </div>

      {/* Link Insertion Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl border border-stone-200 space-y-3">
            <h3 className="text-sm font-bold text-stone-900">
              {lang === 'bn' ? 'লিংক যুক্ত বা এডিট করুন' : 'Insert or Edit Hyperlink'}
            </h3>
            <div>
              <label className="block text-xs text-stone-600 mb-1">
                {lang === 'bn' ? 'ওয়েব ঠিকানা (URL)' : 'Target URL'}
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/reference"
                className="w-full text-xs rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                className="px-3.5 py-1.5 text-xs font-bold bg-stone-900 text-amber-300 rounded-xl hover:bg-stone-800 transition active:scale-95"
              >
                {lang === 'bn' ? 'প্রয়োগ করুন' : 'Apply Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
