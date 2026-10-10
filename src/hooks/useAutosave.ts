import { useEffect, useRef, useState, useCallback } from 'react';
import { LocalDraft, PostStatus, YoastSeoData } from '../types/wordpress';
import { storageService } from '../services/storage';

export type SaveStatus =
  | 'idle'
  | 'saving_local'
  | 'saved_local'
  | 'saving_server'
  | 'saved_server'
  | 'unsaved_changes'
  | 'offline';

interface UseAutosaveProps {
  localId: string;
  postId?: number;
  title: string;
  content: string;
  status: PostStatus;
  categories: number[];
  featuredMediaId: number;
  featuredMediaUrl?: string;
  seo: YoastSeoData;
  lastKnownServerModifiedGmt?: string;
  originalServerContent?: string;
  isOnline: boolean;
  onDraftLoaded?: (draft: LocalDraft) => void;
}

export function useAutosave({
  localId,
  postId,
  title,
  content,
  status,
  categories,
  featuredMediaId,
  featuredMediaUrl,
  seo,
  lastKnownServerModifiedGmt,
  originalServerContent,
  isOnline,
}: UseAutosaveProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);

  // Perform local draft save to IndexedDB
  const saveToLocal = useCallback(
    async (hasUnsaved: boolean = true) => {
      if (!title && !content) return; // Don't autosave empty blank slate

      setSaveStatus('saving_local');
      try {
        const now = Date.now();
        const draft: LocalDraft = {
          localId,
          postId,
          title,
          content,
          status,
          categories,
          featuredMediaId,
          featuredMediaUrl,
          seo,
          lastLocalModified: now,
          lastKnownServerModifiedGmt,
          originalServerContent,
          hasUnsavedChanges: hasUnsaved,
        };

        await storageService.saveDraft(draft);
        setLastSavedTime(now);
        setSaveStatus(hasUnsaved ? 'saved_local' : 'saved_server');
      } catch (err) {
        console.error('Failed to autosave locally:', err);
      }
    },
    [
      localId,
      postId,
      title,
      content,
      status,
      categories,
      featuredMediaId,
      featuredMediaUrl,
      seo,
      lastKnownServerModifiedGmt,
      originalServerContent,
    ]
  );

  // Trigger debounced autosave on field changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setHasPendingChanges(true);
    setSaveStatus('unsaved_changes');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveToLocal(true);
    }, 1200); // 1.2s debounce for mobile typing performance

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [title, content, categories, featuredMediaId, seo, status, saveToLocal]);

  // Window beforeunload warning when changes are pending
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingChanges]);

  // Mark draft as fully saved to WordPress server
  const markSavedToServer = useCallback(
    async (newServerModifiedGmt?: string) => {
      setHasPendingChanges(false);
      setSaveStatus('saved_server');
      const now = Date.now();
      setLastSavedTime(now);

      const draft: LocalDraft = {
        localId,
        postId,
        title,
        content,
        status,
        categories,
        featuredMediaId,
        featuredMediaUrl,
        seo,
        lastLocalModified: now,
        lastKnownServerModifiedGmt: newServerModifiedGmt || lastKnownServerModifiedGmt,
        originalServerContent: content,
        hasUnsavedChanges: false,
      };

      await storageService.saveDraft(draft);
    },
    [
      localId,
      postId,
      title,
      content,
      status,
      categories,
      featuredMediaId,
      featuredMediaUrl,
      seo,
      lastKnownServerModifiedGmt,
    ]
  );

  // Set saving to WordPress status
  const markSavingToServer = useCallback(() => {
    setSaveStatus('saving_server');
  }, []);

  // Discard local draft
  const discardLocalDraft = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await storageService.deleteDraft(localId);
    setHasPendingChanges(false);
    setSaveStatus('idle');
  }, [localId]);

  return {
    saveStatus: !isOnline ? 'offline' : saveStatus,
    lastSavedTime,
    hasPendingChanges,
    saveToLocal,
    markSavingToServer,
    markSavedToServer,
    discardLocalDraft,
  };
}
