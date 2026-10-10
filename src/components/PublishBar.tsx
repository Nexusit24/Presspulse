import React, { useState } from 'react';
import { Send, Save, Eye, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { PostStatus, WordPressPost } from '../types/wordpress';
import { Language, translations } from '../utils/i18n';

interface PublishBarProps {
  isEditingPost: boolean;
  currentStatus: PostStatus;
  isSaving: boolean;
  onSaveDraft: () => Promise<void>;
  onPublishOrUpdate: (targetStatus: PostStatus) => Promise<WordPressPost | undefined>;
  onOpenPreview: () => void;
  publishedPostResult?: WordPressPost | null;
  onClearPublishedResult?: () => void;
  lang?: Language;
}

export const PublishBar: React.FC<PublishBarProps> = ({
  isEditingPost,
  currentStatus,
  isSaving,
  onSaveDraft,
  onPublishOrUpdate,
  onOpenPreview,
  publishedPostResult,
  onClearPublishedResult,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetStatusToConfirm, setTargetStatusToConfirm] = useState<PostStatus>('publish');

  const handleInitiatePublish = (status: PostStatus) => {
    setTargetStatusToConfirm(status);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmModal(false);
    await onPublishOrUpdate(targetStatusToConfirm);
  };

  const isAlreadyPublished = currentStatus === 'publish';

  return (
    <>
      {/* Bottom Floating Bar */}
      <div className="fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 px-3.5 py-2.5 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* In-App Preview Button */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-2xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition active:scale-95 shrink-0"
          >
            <Eye className="w-4 h-4 text-stone-500" />
            <span>{t.preview}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Save Draft */}
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-stone-500" />
              <span>{isSaving ? t.saving : t.saveDraft}</span>
            </button>

            {/* Main Action: Publish or Update */}
            <button
              type="button"
              onClick={() => handleInitiatePublish('publish')}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-stone-900 text-amber-300 hover:bg-stone-800 transition active:scale-95 disabled:opacity-50 shadow-xs"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.saving}</span>
                </>
              ) : isAlreadyPublished ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t.updatePost}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t.publishNow}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-900">
              {targetStatusToConfirm === 'publish'
                ? isAlreadyPublished
                  ? t.confirmUpdate
                  : t.confirmPublish
                : 'Save Post Status Change?'}
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed">
              {targetStatusToConfirm === 'publish'
                ? isAlreadyPublished
                  ? t.confirmUpdateDesc
                  : t.confirmPublishDesc
                : `Status will change to "${targetStatusToConfirm}".`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-2 text-xs font-bold bg-stone-900 text-amber-300 rounded-xl hover:bg-stone-800 transition active:scale-95"
              >
                {isAlreadyPublished ? (lang === 'bn' ? 'হ্যাঁ, আপডেট করুন' : 'Confirm & Update') : (lang === 'bn' ? 'হ্যাঁ, পাবলিশ করুন' : 'Confirm & Publish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real WordPress Success Modal */}
      {publishedPostResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-stone-900">
                {t.confirmDone}
              </h3>
              <p className="text-xs text-stone-600">
                {lang === 'bn'
                  ? `পোস্ট আইডি #${publishedPostResult.id} সফলভাবে সংরক্ষিত হয়েছে।`
                  : `Post ID #${publishedPostResult.id} was saved successfully.`}
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-500">
                <span>{lang === 'bn' ? 'স্ট্যাটাস:' : 'Status:'}</span>
                <span className="font-semibold text-stone-800 uppercase tracking-wider text-[11px]">
                  {publishedPostResult.status}
                </span>
              </div>
              {publishedPostResult.link && (
                <div className="flex justify-between items-center text-stone-500 pt-1.5 border-t border-stone-200/60">
                  <span>{lang === 'bn' ? 'লিংক:' : 'Permalink:'}</span>
                  <a
                    href={publishedPostResult.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:underline flex items-center gap-0.5 truncate max-w-[170px] font-medium"
                  >
                    <span>{t.viewLive}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClearPublishedResult}
              className="w-full py-2.5 text-xs font-bold bg-stone-900 text-amber-300 rounded-xl hover:bg-stone-800 transition"
            >
              {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
