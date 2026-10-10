import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Sparkles, Check, AlertCircle } from 'lucide-react';
import { YoastSeoData } from '../types/wordpress';

interface SeoPanelProps {
  seo: YoastSeoData;
  onChangeSeo: (seo: YoastSeoData) => void;
  postTitle?: string;
  siteUrl?: string;
  isCompanionActive?: boolean;
}

export const SeoPanel: React.FC<SeoPanelProps> = ({
  seo,
  onChangeSeo,
  postTitle = '',
  siteUrl = 'example.com',
  isCompanionActive,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const displayTitle = seo.seoTitle || postTitle || 'Article Title';
  const displaySlug = seo.slug || 'article-slug';
  const displayDesc =
    seo.metaDescription ||
    'Provide a concise meta description summarizing the key insights of your article for Google and social shares.';

  const titleLength = (seo.seoTitle || '').length;
  const descLength = (seo.metaDescription || '').length;

  const getTitleStatus = () => {
    if (titleLength === 0) return { label: 'Empty', color: 'text-stone-400', bar: 'bg-stone-200', pct: 0 };
    if (titleLength < 35) return { label: 'Too short', color: 'text-amber-600', bar: 'bg-amber-400', pct: (titleLength / 60) * 100 };
    if (titleLength <= 65) return { label: 'Good length', color: 'text-emerald-600', bar: 'bg-emerald-500', pct: 100 };
    return { label: 'Too long', color: 'text-rose-600', bar: 'bg-rose-500', pct: 100 };
  };

  const getDescStatus = () => {
    if (descLength === 0) return { label: 'Empty', color: 'text-stone-400', bar: 'bg-stone-200', pct: 0 };
    if (descLength < 100) return { label: 'Too short', color: 'text-amber-600', bar: 'bg-amber-400', pct: (descLength / 160) * 100 };
    if (descLength <= 160) return { label: 'Good length', color: 'text-emerald-600', bar: 'bg-emerald-500', pct: 100 };
    return { label: 'Too long', color: 'text-rose-600', bar: 'bg-rose-500', pct: 100 };
  };

  const titleStatus = getTitleStatus();
  const descStatus = getDescStatus();

  return (
    <div className="max-w-md mx-auto w-full px-4 mb-4">
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {/* Header Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50/60 transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              Y
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-900 leading-tight">
                Yoast SEO Metadata
              </h3>
              <p className="text-[11px] text-stone-500">
                {seo.focusKeyword ? `Keyphrase: "${seo.focusKeyword}"` : 'Manage search snippet & metadata'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompanionActive && (
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                Companion Active
              </span>
            )}
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-stone-100 space-y-4">
            {/* Google Mobile Search Preview Card */}
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
                Google Mobile Preview
              </span>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-mono truncate">
                  <span className="w-3.5 h-3.5 rounded-full bg-stone-300 flex items-center justify-center text-[8px] text-white font-bold">
                    W
                  </span>
                  <span>{siteUrl.replace(/^https?:\/\//i, '')}</span>
                  <span className="text-stone-400">› {displaySlug}</span>
                </div>
                <h4 className="text-sm font-medium text-blue-800 line-clamp-2 leading-snug">
                  {displayTitle}
                </h4>
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {displayDesc}
                </p>
              </div>
            </div>

            {/* Focus Keyphrase */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Focus Keyphrase
              </label>
              <input
                type="text"
                value={seo.focusKeyword}
                onChange={(e) => onChangeSeo({ ...seo, focusKeyword: e.target.value })}
                placeholder="e.g. mobile publishing, wordpress pwa"
                className="w-full text-xs rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            {/* SEO Title */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-semibold text-stone-700">SEO Title</label>
                <span className={`text-[11px] font-medium ${titleStatus.color}`}>
                  {titleLength} chars ({titleStatus.label})
                </span>
              </div>
              <input
                type="text"
                value={seo.seoTitle}
                onChange={(e) => onChangeSeo({ ...seo, seoTitle: e.target.value })}
                placeholder="Defaults to article title if empty"
                className="w-full text-xs rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
              <div className="w-full bg-stone-100 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${titleStatus.bar}`}
                  style={{ width: `${Math.min(titleStatus.pct, 100)}%` }}
                />
              </div>
            </div>

            {/* Post Slug */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                value={seo.slug}
                onChange={(e) =>
                  onChangeSeo({
                    ...seo,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  })
                }
                placeholder="my-article-permalink"
                className="w-full text-xs rounded-xl border border-stone-300 px-3 py-2 text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-semibold text-stone-700">Meta Description</label>
                <span className={`text-[11px] font-medium ${descStatus.color}`}>
                  {descLength} / 160 chars ({descStatus.label})
                </span>
              </div>
              <textarea
                value={seo.metaDescription}
                onChange={(e) => onChangeSeo({ ...seo, metaDescription: e.target.value })}
                placeholder="Brief summary shown in Google search results and social cards..."
                rows={3}
                className="w-full text-xs rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 leading-relaxed"
              />
              <div className="w-full bg-stone-100 h-1 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full transition-all ${descStatus.bar}`}
                  style={{ width: `${Math.min(descStatus.pct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
