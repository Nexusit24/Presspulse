import React from 'react';
import { FileText, Edit3, Settings } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

export type ActiveTab = 'posts' | 'editor' | 'settings';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  isEditingPost?: boolean;
  hasUnsavedChanges?: boolean;
  lang?: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  isEditingPost,
  hasUnsavedChanges,
  lang = 'en',
}) => {
  const t = translations[lang];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 safe-pb">
      <div className="max-w-md mx-auto grid grid-cols-3 h-14">
        {/* Posts Tab */}
        <button
          onClick={() => onChangeTab('posts')}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            activeTab === 'posts' ? 'text-amber-800 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'posts' ? 'bg-amber-100 text-amber-900' : ''}`}>
            <FileText className={`w-5 h-5 ${activeTab === 'posts' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] leading-none tracking-tight">{t.posts}</span>
        </button>

        {/* Editor Tab */}
        <button
          onClick={() => onChangeTab('editor')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            activeTab === 'editor' ? 'text-amber-800 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className="relative">
            <div className={`p-1 rounded-xl transition ${activeTab === 'editor' ? 'bg-amber-100 text-amber-900' : ''}`}>
              <Edit3 className={`w-5 h-5 ${activeTab === 'editor' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
            </div>
            {hasUnsavedChanges && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
          <span className="text-[10px] leading-none tracking-tight">
            {isEditingPost ? t.editPost : t.newPost}
          </span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            activeTab === 'settings' ? 'text-amber-800 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'settings' ? 'bg-amber-100 text-amber-900' : ''}`}>
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] leading-none tracking-tight">{t.settings}</span>
        </button>
      </div>
    </nav>
  );
};
