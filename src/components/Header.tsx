import React from 'react';
import {
  PenTool,
  CheckCircle2,
  Clock,
  CloudOff,
  AlertCircle,
  RefreshCw,
  Download,
  Languages,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { SaveStatus } from '../hooks/useAutosave';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language, translations } from '../utils/i18n';

interface HeaderProps {
  saveStatus?: SaveStatus;
  isOnline: boolean;
  onOpenSettings?: () => void;
  siteUrl?: string;
  hasUnsaved?: boolean;
  lang: Language;
  onToggleLang: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  saveStatus = 'idle',
  isOnline,
  siteUrl,
  lang,
  onToggleLang,
  isFocusMode,
  onToggleFocusMode,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const t = translations[lang];

  const getStatusBadge = () => {
    if (!isOnline) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-stone-200 text-stone-700">
          <CloudOff className="w-3 h-3 text-stone-600" />
          <span className="hidden xs:inline">{t.offline}</span>
        </span>
      );
    }

    switch (saveStatus) {
      case 'saving_server':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span className="hidden xs:inline">{t.saving}</span>
          </span>
        );
      case 'saved_server':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span className="hidden xs:inline">{t.savedToWp}</span>
          </span>
        );
      case 'saving_local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            <span className="hidden xs:inline">{t.savingLocally}</span>
          </span>
        );
      case 'saved_local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <CheckCircle2 className="w-3 h-3 text-amber-600" />
            <span className="hidden xs:inline">{t.savedLocally}</span>
          </span>
        );
      case 'unsaved_changes':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-orange-50 text-orange-800 border border-orange-200">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            <span className="hidden xs:inline">{t.unsavedChanges}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-3.5 py-2 flex items-center justify-between transition-all">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
          <PenTool className="w-3.5 h-3.5 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-sm font-bold text-stone-900 tracking-tight leading-none truncate">
              {t.appName}
            </h1>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
              {lang === 'bn' ? 'বাংলা' : 'PRO'}
            </span>
          </div>
          {siteUrl && (
            <p className="text-[10px] text-stone-500 truncate max-w-[120px] sm:max-w-[180px] leading-tight">
              {siteUrl.replace(/^https?:\/\//i, '')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {getStatusBadge()}

        {/* Focus Mode Toggle */}
        {onToggleFocusMode && (
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`p-1.5 rounded-lg border transition ${
              isFocusMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
            title={isFocusMode ? t.exitFocusMode : t.distractionFree}
          >
            {isFocusMode ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Bilingual Lang Switcher Button */}
        <button
          type="button"
          onClick={onToggleLang}
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border border-stone-200 bg-stone-50 text-stone-800 hover:bg-amber-50 hover:border-amber-300 transition active:scale-95"
          title="Switch Language (বাংলা / English)"
        >
          <Languages className="w-3 h-3 text-amber-700" />
          <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
        </button>

        {/* PWA Install */}
        {isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-900 text-amber-300 hover:bg-stone-800 transition active:scale-95 shadow-xs"
            title="Install App on Android"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}
      </div>
    </header>
  );
};
