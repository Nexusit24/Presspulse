import React from 'react';
import { ArrowLeft, ExternalLink, Calendar, User, Tag, Eye } from 'lucide-react';
import { sanitizeArticleHtml } from '../services/contentPreserver';
import { WordPressCategory } from '../types/wordpress';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string; // HTML
  featuredImageUrl?: string;
  categoryNames?: string[];
  liveLink?: string;
  isPublished?: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  featuredImageUrl,
  categoryNames = [],
  liveLink,
  isPublished,
}) => {
  if (!isOpen) return null;

  const sanitizedHtml = sanitizeArticleHtml(content);

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Editor</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-amber-100 text-amber-900">
            <Eye className="w-3 h-3" />
            In-App Article Preview
          </span>

          {isPublished && liveLink && (
            <a
              href={liveLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-700 hover:underline flex items-center gap-0.5"
            >
              <span>View Live</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </header>

      {/* Preview Content Body */}
      <article className="max-w-xl mx-auto w-full px-5 py-6 pb-24 space-y-4">
        {/* Categories */}
        {categoryNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categoryNames.map((name) => (
              <span
                key={name}
                className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md bg-stone-100 text-stone-700"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight leading-tight">
          {title || '(Untitled Article)'}
        </h1>

        {/* Meta / Date */}
        <div className="flex items-center gap-3 text-xs text-stone-500 pb-3 border-b border-stone-200">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            {new Date().toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span>•</span>
          <span>Article Preview</span>
        </div>

        {/* Featured Image */}
        {featuredImageUrl && (
          <div className="rounded-2xl overflow-hidden border border-stone-200 my-4 bg-stone-100">
            <img
              src={featuredImageUrl}
              alt={title}
              className="w-full max-h-80 object-cover"
            />
          </div>
        )}

        {/* Prose Content */}
        <div
          className="ProseMirror prose prose-stone max-w-none text-stone-900"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </article>
    </div>
  );
};
