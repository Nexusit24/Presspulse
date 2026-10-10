import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  FileText,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Eye,
} from 'lucide-react';
import { ConnectionConfig, PostStatus, WordPressPost, WordPressCategory } from '../types/wordpress';
import { wordPressService } from '../services/wordpress';
import { Language, translations } from '../utils/i18n';

interface PostsListProps {
  connectionConfig: ConnectionConfig | null;
  onSelectPost: (post: WordPressPost) => void;
  onCreateNewPost: () => void;
  categories: WordPressCategory[];
  lang?: Language;
}

export const PostsList: React.FC<PostsListProps> = ({
  connectionConfig,
  onSelectPost,
  onCreateNewPost,
  categories,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'any'>('any');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const STATUS_FILTERS: { label: string; value: PostStatus | 'any' }[] = [
    { label: t.all, value: 'any' },
    { label: t.published, value: 'publish' },
    { label: t.drafts, value: 'draft' },
    { label: t.pending, value: 'pending' },
  ];

  // Map category ID to Category Name
  const categoryMap = React.useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const fetchPosts = useCallback(
    async (page = 1) => {
      if (!connectionConfig) return;

      setLoading(true);
      setError(null);

      try {
        const result = await wordPressService.getPosts(connectionConfig, {
          search: searchQuery,
          status: statusFilter,
          page,
          perPage: 10,
        });

        setPosts(result.posts);
        setTotalPages(result.totalPages);
        setTotalPosts(result.totalPosts);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve posts from WordPress.');
      } finally {
        setLoading(false);
      }
    },
    [connectionConfig, searchQuery, statusFilter]
  );

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  // Strip HTML tags for clean title display
  const cleanTitle = (rawTitle: string) => {
    if (!rawTitle) return '(Untitled Article)';
    return rawTitle.replace(/<[^>]+>/g, '').trim() || '(Untitled Article)';
  };

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'publish':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            {t.published}
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            {t.drafts}
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            {t.pending}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-stone-100 text-stone-600 border border-stone-200">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-3">
      {/* Search & Actions Header */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-2xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchPosts(currentPage)}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 transition active:scale-95 disabled:opacity-50"
            title="Refresh posts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={onCreateNewPost}
            className="flex items-center gap-1 px-3.5 py-2.5 text-xs font-bold rounded-2xl bg-stone-900 text-amber-300 hover:bg-stone-800 transition active:scale-95 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? 'নতুন' : 'New'}</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-full font-semibold transition shrink-0 active:scale-95 ${
                statusFilter === f.value
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">
              {lang === 'bn' ? 'পোস্ট লোড করা যায়নি' : 'Unable to load posts'}
            </p>
            <p className="text-[11px] mt-0.5 leading-relaxed">{error}</p>
            <button
              onClick={() => fetchPosts(currentPage)}
              className="mt-2 text-[11px] font-bold text-rose-900 underline"
            >
              {lang === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Retry request'}
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && posts.length === 0 && (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-stone-200 animate-pulse space-y-2">
              <div className="h-4 bg-stone-200 rounded-lg w-3/4" />
              <div className="h-3 bg-stone-100 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-stone-200 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-bold text-stone-900 mb-1">
            {t.noArticlesFound}
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4 leading-relaxed">
            {searchQuery
              ? `"${searchQuery}" দিয়ে কোনো ফলাফল পাওয়া যায়নি। অন্য কিছু লিখে খুঁজুন।`
              : t.noArticlesSub}
          </p>
          <button
            onClick={onCreateNewPost}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-stone-900 text-amber-300 hover:bg-stone-800 transition active:scale-95 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            {t.createFirstPost}
          </button>
        </div>
      )}

      {/* Posts List Cards */}
      <div className="space-y-2.5">
        {posts.map((post) => {
          const title = cleanTitle(post.title?.rendered || post.title?.raw || '');
          const postCategories = (post.categories || [])
            .map((id) => categoryMap.get(id))
            .filter(Boolean) as string[];

          return (
            <div
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="p-3.5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:border-amber-400 transition cursor-pointer active:scale-[0.99] group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-900 transition leading-snug line-clamp-2">
                  {title}
                </h3>
                <div className="shrink-0">{getStatusBadge(post.status)}</div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400 pt-1.5 border-t border-stone-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  {formatDate(post.modified || post.date)}
                </span>

                {postCategories.length > 0 && (
                  <span className="text-stone-500 truncate max-w-[150px]">
                    {postCategories.slice(0, 2).join(', ')}
                    {postCategories.length > 2 && ` +${postCategories.length - 2}`}
                  </span>
                )}

                {post.status === 'publish' && post.link && (
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto text-sky-700 hover:text-sky-800 flex items-center gap-0.5 font-medium"
                    title="View live article"
                  >
                    <span>{t.viewLive}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-stone-200 text-xs text-stone-600">
          <span>
            {t.page} {lang === 'bn' ? currentPage.toLocaleString('bn-BD') : currentPage} {t.of}{' '}
            {lang === 'bn' ? totalPages.toLocaleString('bn-BD') : totalPages} ({lang === 'bn' ? totalPosts.toLocaleString('bn-BD') : totalPosts} {t.total})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchPosts(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchPosts(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
