/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { PostsList } from './components/PostsList';
import { ArticleEditor } from './components/ArticleEditor';
import { SeoPanel } from './components/SeoPanel';
import { CategorySelector } from './components/CategorySelector';
import { MediaPickerModal } from './components/MediaPickerModal';
import { PreviewModal } from './components/PreviewModal';
import { ConflictModal } from './components/ConflictModal';
import { PublishBar } from './components/PublishBar';
import { SettingsScreen } from './components/SettingsScreen';
import { ConnectionModal } from './components/ConnectionModal';

import {
  ConnectionConfig,
  LocalDraft,
  PostStatus,
  WordPressCategory,
  WordPressPost,
  YoastSeoData,
} from './types/wordpress';
import { storageService } from './services/storage';
import { wordPressService } from './services/wordpress';
import {
  exportToWordPress,
  importWordPressContent,
} from './services/contentPreserver';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useAutosave } from './hooks/useAutosave';
import { Language, translations } from './utils/i18n';
import { Tag, Image as ImageIcon, X, AlertTriangle, Minimize2 } from 'lucide-react';

const DEFAULT_SEO: YoastSeoData = {
  focusKeyword: '',
  seoTitle: '',
  slug: '',
  metaDescription: '',
};

export default function App() {
  const isOnline = useOnlineStatus();

  // Language state (defaults to Bengali / বাংলা with quick one-tap toggle to English)
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('presspulse_lang') as Language) || 'bn';
  });

  const toggleLanguage = () => {
    const nextLang: Language = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    localStorage.setItem('presspulse_lang', nextLang);
  };

  const t = translations[lang];

  // Distraction-Free Focus Writing Mode
  const [isFocusMode, setIsFocusMode] = useState(false);

  // App Connection State
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor'); // Default straight into writing!

  // Categories
  const [categories, setCategories] = useState<WordPressCategory[]>([]);

  // Active Post & Editor State
  const [localDraftId, setLocalDraftId] = useState<string>(() => `draft_${Date.now()}`);
  const [editingPostId, setEditingPostId] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postStatus, setPostStatus] = useState<PostStatus>('draft');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [featuredMediaId, setFeaturedMediaId] = useState<number>(0);
  const [featuredMediaUrl, setFeaturedMediaUrl] = useState<string | undefined>(undefined);
  const [seo, setSeo] = useState<YoastSeoData>(DEFAULT_SEO);
  const [originalServerContent, setOriginalServerContent] = useState<string | undefined>(undefined);
  const [lastKnownServerModifiedGmt, setLastKnownServerModifiedGmt] = useState<string | undefined>(undefined);
  const [livePermalink, setLivePermalink] = useState<string | undefined>(undefined);
  const [warningNote, setWarningNote] = useState<string | undefined>(undefined);

  // Modals & UI States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictServerDate, setConflictServerDate] = useState<string | undefined>(undefined);
  const [isSavingToServer, setIsSavingToServer] = useState(false);
  const [publishedPostResult, setPublishedPostResult] = useState<WordPressPost | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Autosave hook
  const {
    saveStatus,
    hasPendingChanges,
    markSavingToServer,
    markSavedToServer,
    discardLocalDraft,
  } = useAutosave({
    localId: localDraftId,
    postId: editingPostId,
    title,
    content,
    status: postStatus,
    categories: selectedCategories,
    featuredMediaId,
    featuredMediaUrl,
    seo,
    lastKnownServerModifiedGmt,
    originalServerContent,
    isOnline,
  });

  // Load connection and draft on startup
  useEffect(() => {
    async function init() {
      try {
        const config = await storageService.getConnection();
        if (config) {
          setConnectionConfig(config);
          loadCategories(config);
        }

        // Check if there is an unsaved recovery draft in IndexedDB
        const allDrafts = await storageService.getAllDrafts();
        if (allDrafts.length > 0) {
          const latest = allDrafts[0];
          if (latest.hasUnsavedChanges) {
            setLocalDraftId(latest.localId);
            setEditingPostId(latest.postId);
            setTitle(latest.title);
            setContent(latest.content);
            setPostStatus(latest.status);
            setSelectedCategories(latest.categories || []);
            setFeaturedMediaId(latest.featuredMediaId || 0);
            setFeaturedMediaUrl(latest.featuredMediaUrl);
            setSeo(latest.seo || DEFAULT_SEO);
            setLastKnownServerModifiedGmt(latest.lastKnownServerModifiedGmt);
            setOriginalServerContent(latest.originalServerContent);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  const loadCategories = async (config: ConnectionConfig) => {
    const cached = await storageService.getCachedCategories();
    if (cached.length > 0) {
      setCategories(cached);
    }

    try {
      const fetched = await wordPressService.getCategories(config);
      setCategories(fetched);
      await storageService.saveCategories(fetched);
    } catch {
      // Offline fallback
    }
  };

  // Switch to New Blank Post
  const handleCreateNewPost = () => {
    setLocalDraftId(`draft_${Date.now()}`);
    setEditingPostId(undefined);
    setTitle('');
    setContent('');
    setPostStatus('draft');
    setSelectedCategories([]);
    setFeaturedMediaId(0);
    setFeaturedMediaUrl(undefined);
    setSeo(DEFAULT_SEO);
    setOriginalServerContent(undefined);
    setLastKnownServerModifiedGmt(undefined);
    setLivePermalink(undefined);
    setWarningNote(undefined);
    setActiveTab('editor');
  };

  // Select an existing post from WordPress list
  const handleSelectPost = async (post: WordPressPost) => {
    if (!connectionConfig) return;

    try {
      const fullPost = await wordPressService.getPost(connectionConfig, post.id);

      const rawContent = fullPost.content?.raw || fullPost.content?.rendered || '';
      const { editorHtml, warning } = importWordPressContent(rawContent);

      const rawTitle = fullPost.title?.raw || fullPost.title?.rendered || '';

      const yoastMeta: YoastSeoData = {
        focusKeyword: (fullPost.meta?._yoast_wpseo_focuskw as string) || '',
        seoTitle: (fullPost.meta?._yoast_wpseo_title as string) || '',
        slug: fullPost.slug || '',
        metaDescription: (fullPost.meta?._yoast_wpseo_metadesc as string) || '',
      };

      setLocalDraftId(`post_${fullPost.id}`);
      setEditingPostId(fullPost.id);
      setTitle(rawTitle);
      setContent(editorHtml);
      setPostStatus(fullPost.status);
      setSelectedCategories(fullPost.categories || []);
      setFeaturedMediaId(fullPost.featured_media || 0);
      setFeaturedMediaUrl(undefined);
      setSeo(yoastMeta);
      setOriginalServerContent(rawContent);
      setLastKnownServerModifiedGmt(fullPost.modified_gmt);
      setLivePermalink(fullPost.link);
      setWarningNote(warning);

      if (fullPost.featured_media > 0) {
        try {
          const { data: media } = await (wordPressService as any).request(
            connectionConfig,
            `/wp/v2/media/${fullPost.featured_media}`
          );
          if (media && media.source_url) {
            setFeaturedMediaUrl(media.source_url);
          }
        } catch {
          // ignore
        }
      }

      setActiveTab('editor');
    } catch (err: any) {
      setBannerError(err.message || 'Failed to load post content from WordPress.');
    }
  };

  // Load a draft from Local Recovery Manager
  const handleLoadLocalDraft = (draft: LocalDraft) => {
    setLocalDraftId(draft.localId);
    setEditingPostId(draft.postId);
    setTitle(draft.title);
    setContent(draft.content);
    setPostStatus(draft.status);
    setSelectedCategories(draft.categories || []);
    setFeaturedMediaId(draft.featuredMediaId || 0);
    setFeaturedMediaUrl(draft.featuredMediaUrl);
    setSeo(draft.seo || DEFAULT_SEO);
    setLastKnownServerModifiedGmt(draft.lastKnownServerModifiedGmt);
    setOriginalServerContent(draft.originalServerContent);
    setActiveTab('editor');
  };

  // Conflict handling
  const handleKeepLocal = async () => {
    setIsConflictModalOpen(false);
    await executeSaveToWordPress(postStatus);
  };

  const handleLoadServer = async () => {
    setIsConflictModalOpen(false);
    if (editingPostId && connectionConfig) {
      const serverPost = await wordPressService.getPost(connectionConfig, editingPostId);
      handleSelectPost(serverPost);
    }
  };

  // Save / Publish execution
  const executeSaveToWordPress = async (targetStatus: PostStatus): Promise<WordPressPost | undefined> => {
    if (!connectionConfig) {
      setIsConnectionModalOpen(true);
      return;
    }

    if (!isOnline) {
      setBannerError(
        lang === 'bn'
          ? 'বর্তমানে অফলাইন অবস্থায় আছেন। আপনার পরিবর্তনগুলো ফোনের মেমোরিতে নিরাপদে সংরক্ষিত আছে।'
          : 'Cannot publish while offline. Your changes are safely preserved in local storage.'
      );
      return;
    }

    setIsSavingToServer(true);
    markSavingToServer();
    setBannerError(null);

    const exportContent = exportToWordPress(content, { wrapGutenberg: true });

    try {
      let savedPost: WordPressPost;

      if (editingPostId) {
        if (lastKnownServerModifiedGmt) {
          try {
            const currentServerPost = await wordPressService.getPost(connectionConfig, editingPostId);
            if (
              currentServerPost.modified_gmt &&
              currentServerPost.modified_gmt !== lastKnownServerModifiedGmt
            ) {
              setConflictServerDate(currentServerPost.modified);
              setIsConflictModalOpen(true);
              setIsSavingToServer(false);
              return;
            }
          } catch {
            // ignore
          }
        }

        savedPost = await wordPressService.updatePost(connectionConfig, editingPostId, {
          title,
          content: exportContent,
          status: targetStatus,
          categories: selectedCategories,
          featured_media: featuredMediaId,
          slug: seo.slug || undefined,
        });
      } else {
        savedPost = await wordPressService.createPost(connectionConfig, {
          title,
          content: exportContent,
          status: targetStatus,
          categories: selectedCategories,
          featured_media: featuredMediaId,
          slug: seo.slug || undefined,
        });

        setEditingPostId(savedPost.id);
        setLocalDraftId(`post_${savedPost.id}`);
      }

      if (seo.focusKeyword || seo.seoTitle || seo.metaDescription) {
        await wordPressService.updateYoastSeo(connectionConfig, savedPost.id, seo);
      }

      setPostStatus(savedPost.status);
      setLastKnownServerModifiedGmt(savedPost.modified_gmt);
      setLivePermalink(savedPost.link);

      await markSavedToServer(savedPost.modified_gmt);
      setPublishedPostResult(savedPost);
      return savedPost;
    } catch (err: any) {
      setBannerError(err.message || 'Failed to save to WordPress.');
      return undefined;
    } finally {
      setIsSavingToServer(false);
    }
  };

  // Connection settings update
  const handleSaveConnection = async (config: ConnectionConfig) => {
    await storageService.saveConnection(config);
    setConnectionConfig(config);
    setIsConnectionModalOpen(false);
    await loadCategories(config);
  };

  const handleDisconnect = async () => {
    await storageService.clearConnection();
    setConnectionConfig(null);
    setIsConnectionModalOpen(false);
    setActiveTab('settings');
  };

  const selectedCategoryNames = categories
    .filter((cat) => selectedCategories.includes(cat.id))
    .map((cat) => cat.name);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mx-auto shadow-md animate-pulse">
            <span className="font-bold text-lg">P</span>
          </div>
          <p className="text-xs text-stone-600 font-semibold">{t.appName} চালু হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Top Mobile Header (Hidden in Distraction-Free Focus Mode) */}
      {!isFocusMode && (
        <Header
          saveStatus={saveStatus}
          isOnline={isOnline}
          siteUrl={connectionConfig?.siteUrl}
          hasUnsaved={hasPendingChanges}
          lang={lang}
          onToggleLang={toggleLanguage}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        />
      )}

      {/* Floating Focus Mode Exit Button */}
      {isFocusMode && (
        <button
          type="button"
          onClick={() => setIsFocusMode(false)}
          className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-stone-900/90 text-amber-300 backdrop-blur-md shadow-lg active:scale-95"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>{t.exitFocusMode}</span>
        </button>
      )}

      {/* Global Error Banner */}
      {bannerError && (
        <div className="mx-4 mt-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">{lang === 'bn' ? 'বিজ্ঞপ্তি' : 'Notice'}</span>
            <span className="leading-relaxed">{bannerError}</span>
          </div>
          <button
            onClick={() => setBannerError(null)}
            className="text-stone-400 hover:text-stone-600 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {/* TAB 1: POSTS LIST */}
        {activeTab === 'posts' && (
          <PostsList
            connectionConfig={connectionConfig}
            onSelectPost={handleSelectPost}
            onCreateNewPost={handleCreateNewPost}
            categories={categories}
            lang={lang}
          />
        )}

        {/* TAB 2: ARTICLE EDITOR */}
        {activeTab === 'editor' && (
          <div className="pb-36">
            {/* Metadata Bar: Categories & Featured Image Chips */}
            <div className="max-w-md mx-auto px-4 pt-3 flex flex-wrap items-center gap-2">
              {/* Category Selector Pill */}
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-white border border-stone-200 text-stone-700 hover:border-amber-400 transition active:scale-95 shadow-2xs"
              >
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {selectedCategories.length === 0
                    ? t.categories
                    : selectedCategoryNames.slice(0, 2).join(', ') +
                      (selectedCategories.length > 2 ? ` +${selectedCategories.length - 2}` : '')}
                </span>
              </button>

              {/* Featured Image Pill / Thumbnail */}
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition active:scale-95 shadow-2xs ${
                  featuredMediaId > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-amber-400'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                <span>{featuredMediaId > 0 ? t.featuredImageSet : t.featuredImage}</span>
              </button>

              {/* Post status label if editing existing */}
              {editingPostId && (
                <span className="ml-auto text-[11px] font-mono font-semibold text-stone-400">
                  #{editingPostId}
                </span>
              )}
            </div>

            {/* Featured Image Preview Card if set */}
            {featuredMediaUrl && (
              <div className="max-w-md mx-auto px-4 mt-2">
                <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 max-h-40">
                  <img
                    src={featuredMediaUrl}
                    alt="Featured preview"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-between p-2.5">
                    <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-md">
                      {t.featuredImage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMediaModalOpen(true)}
                      className="text-[11px] font-bold text-stone-900 bg-white/95 hover:bg-white px-2.5 py-1 rounded-xl shadow-xs"
                    >
                      {t.change}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Rich-Text Editor Pad */}
            <ArticleEditor
              title={title}
              onChangeTitle={setTitle}
              content={content}
              onChangeContent={setContent}
              warningNote={warningNote}
              onOpenMediaModal={() => setIsMediaModalOpen(true)}
              lang={lang}
              isFocusMode={isFocusMode}
            />

            {/* Yoast SEO Collapsible Panel */}
            <SeoPanel
              seo={seo}
              onChangeSeo={setSeo}
              postTitle={title}
              siteUrl={connectionConfig?.siteUrl}
            />

            {/* Bottom Publishing Bar */}
            <PublishBar
              isEditingPost={!!editingPostId}
              currentStatus={postStatus}
              isSaving={isSavingToServer}
              onSaveDraft={async () => {
                await executeSaveToWordPress('draft');
              }}
              onPublishOrUpdate={(status) => executeSaveToWordPress(status)}
              onOpenPreview={() => setIsPreviewOpen(true)}
              publishedPostResult={publishedPostResult}
              onClearPublishedResult={() => setPublishedPostResult(null)}
              lang={lang}
            />
          </div>
        )}

        {/* TAB 3: SETTINGS SCREEN */}
        {activeTab === 'settings' && (
          <SettingsScreen
            connectionConfig={connectionConfig}
            onDisconnect={handleDisconnect}
            onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
            onLoadDraft={handleLoadLocalDraft}
            lang={lang}
          />
        )}
      </main>

      {/* Category Selector Modal */}
      <CategorySelector
        allCategories={categories}
        selectedCategoryIds={selectedCategories}
        onChangeCategories={setSelectedCategories}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Media Picker / Featured Image Modal */}
      <MediaPickerModal
        connectionConfig={connectionConfig}
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        currentFeaturedMediaId={featuredMediaId}
        currentFeaturedMediaUrl={featuredMediaUrl}
        onSelectFeaturedMedia={(id, url) => {
          setFeaturedMediaId(id);
          setFeaturedMediaUrl(url);
        }}
        onRemoveFeaturedMedia={() => {
          setFeaturedMediaId(0);
          setFeaturedMediaUrl(undefined);
        }}
        lang={lang}
      />

      {/* Article Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={title}
        content={content}
        featuredImageUrl={featuredMediaUrl}
        categoryNames={selectedCategoryNames}
        liveLink={livePermalink}
        isPublished={postStatus === 'publish'}
      />

      {/* Remote Conflict Resolution Modal */}
      <ConflictModal
        isOpen={isConflictModalOpen}
        onKeepLocal={handleKeepLocal}
        onLoadServer={handleLoadServer}
        serverModifiedDate={conflictServerDate}
      />

      {/* Connection Modal */}
      {isConnectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto">
            <ConnectionModal
              currentConfig={connectionConfig}
              onSaveConfig={handleSaveConnection}
              onDisconnect={handleDisconnect}
              isInitialSetup={!connectionConfig}
              isOpen={isConnectionModalOpen}
              onClose={() => setIsConnectionModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation (Hidden in Focus Mode) */}
      {!isFocusMode && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          isEditingPost={!!editingPostId}
          hasUnsavedChanges={hasPendingChanges}
          lang={lang}
        />
      )}
    </div>
  );
}
