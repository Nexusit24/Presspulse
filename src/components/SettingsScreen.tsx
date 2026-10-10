import React, { useState, useEffect } from 'react';
import {
  Globe,
  Shield,
  Trash2,
  Download,
  Copy,
  Check,
  Smartphone,
  FileCode,
  FileText,
  RefreshCw,
  LogOut,
  Layers,
} from 'lucide-react';
import { ConnectionConfig, LocalDraft } from '../types/wordpress';
import { storageService } from '../services/storage';
import { wordPressService } from '../services/wordpress';
import { COMPANION_PLUGIN_PHP, COMPANION_PLUGIN_VERSION, INSTALLATION_STEPS } from '../companion/pluginCode';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language, translations } from '../utils/i18n';

interface SettingsScreenProps {
  connectionConfig: ConnectionConfig | null;
  onDisconnect: () => Promise<void>;
  onOpenConnectionModal: () => void;
  onLoadDraft: (draft: LocalDraft) => void;
  lang?: Language;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  connectionConfig,
  onDisconnect,
  onOpenConnectionModal,
  onLoadDraft,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>([]);
  const [copiedPlugin, setCopiedPlugin] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [yoastCompanionDetected, setYoastCompanionDetected] = useState<boolean | null>(null);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    loadDrafts();
    if (connectionConfig) {
      checkCompanion();
    }
  }, [connectionConfig]);

  const loadDrafts = async () => {
    try {
      const drafts = await storageService.getAllDrafts();
      setLocalDrafts(drafts);
    } catch {
      // ignore
    }
  };

  const checkCompanion = async () => {
    if (!connectionConfig) return;
    try {
      const res = await wordPressService.testConnection(connectionConfig);
      setYoastCompanionDetected(res.hasYoastCompanion);
    } catch {
      setYoastCompanionDetected(false);
    }
  };

  const handleTest = async () => {
    if (!connectionConfig) return;
    setTestingConnection(true);
    setTestStatus(null);
    try {
      const res = await wordPressService.testConnection(connectionConfig);
      setTestStatus(
        lang === 'bn'
          ? `সফল সংযোগ: "${res.user.name}" (${res.siteName || 'ওয়ার্ডপ্রেস'})`
          : `Connected as "${res.user.name}" (${res.siteName || 'WordPress'}).`
      );
      setYoastCompanionDetected(res.hasYoastCompanion);
    } catch (err: any) {
      setTestStatus(`Error: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCopyPluginCode = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(COMPANION_PLUGIN_PHP);
      setCopiedPlugin(true);
      setTimeout(() => setCopiedPlugin(false), 3000);
    }
  };

  const handleClearAllDrafts = async () => {
    const confirmMsg =
      lang === 'bn'
        ? 'আপনি কি নিশ্চিত যে এই ফোনে সংরক্ষিত সব অফলাইন ড্রাফট মুছে ফেলতে চান?'
        : 'Are you sure you want to delete all offline drafts stored on this phone?';
    if (window.confirm(confirmMsg)) {
      await storageService.clearAllDrafts();
      await loadDrafts();
    }
  };

  const handleDeleteSingleDraft = async (localId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await storageService.deleteDraft(localId);
    await loadDrafts();
  };

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* SECTION 1: CONNECTION STATUS */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold text-stone-900">
              {lang === 'bn' ? 'ওয়ার্ডপ্রেস সাইট সংযোগ' : 'WordPress Site'}
            </h2>
          </div>
          {connectionConfig && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              {lang === 'bn' ? 'সংযুক্ত' : 'Connected'}
            </span>
          )}
        </div>

        {connectionConfig ? (
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
              <div className="text-stone-500 text-[11px]">
                {lang === 'bn' ? 'সাইটের ঠিকানা:' : 'Site URL:'}
              </div>
              <div className="font-mono text-stone-900 font-medium truncate">
                {connectionConfig.siteUrl}
              </div>
              <div className="text-stone-500 text-[11px] pt-1">
                {lang === 'bn' ? 'ইউজারনেম:' : 'Username:'}
              </div>
              <div className="text-stone-800 font-medium">{connectionConfig.username}</div>
              <div className="text-stone-500 text-[11px] pt-1">
                {lang === 'bn' ? 'কম্প্যানিয়ন প্লাগইন:' : 'Yoast Companion Status:'}
              </div>
              <div className="font-bold text-stone-800">
                {yoastCompanionDetected === null
                  ? 'Checking...'
                  : yoastCompanionDetected
                  ? (lang === 'bn' ? 'সক্রিয় ✓ (v' + COMPANION_PLUGIN_VERSION + ')' : 'Active ✓ (v' + COMPANION_PLUGIN_VERSION + ')')
                  : (lang === 'bn' ? 'ইনস্টল নেই (স্ট্যান্ডার্ড মেটা মোড)' : 'Not Installed (standard meta fallback)')}
              </div>
            </div>

            {testStatus && (
              <div className="p-2.5 bg-stone-100 rounded-2xl text-[11px] text-stone-800 font-medium">
                {testStatus}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testingConnection}
                className="flex-1 py-2.5 px-3 text-xs font-bold rounded-2xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testing...' : (lang === 'bn' ? 'সংযোগ পরীক্ষা করুন' : 'Test Connection')}</span>
              </button>

              <button
                type="button"
                onClick={onOpenConnectionModal}
                className="py-2.5 px-3.5 text-xs font-bold rounded-2xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition active:scale-98"
              >
                {lang === 'bn' ? 'সম্পাদনা' : 'Edit'}
              </button>
            </div>

            <button
              type="button"
              onClick={onDisconnect}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-2xl transition mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              {lang === 'bn' ? 'সংযোগ বিচ্ছিন্ন করুন ও তথ্য মুছুন' : 'Disconnect & Wipe Credentials'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-stone-500 leading-relaxed">
              {lang === 'bn'
                ? 'এখনও কোনো সাইট সংযুক্ত করা হয়নি। আপনার আসল ওয়ার্ডপ্রেস সাইটের অ্যাপ্লিকেশন পাসওয়ার্ড দিয়ে সহজেই কানেক্ট করুন।'
                : 'No WordPress site connected yet. Connect your site to create, edit, and publish articles.'}
            </p>
            <button
              type="button"
              onClick={onOpenConnectionModal}
              className="w-full py-2.5 px-4 text-xs font-bold bg-stone-900 text-amber-300 rounded-2xl hover:bg-stone-800 transition active:scale-98 shadow-xs"
            >
              {t.connectWordPress}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: LOCAL DRAFT RECOVERY MANAGER */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold text-stone-900">
              {lang === 'bn' ? 'ফোনে সংরক্ষিত ড্রাফট' : 'Local Autosave Recovery'} ({localDrafts.length})
            </h2>
          </div>
          {localDrafts.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllDrafts}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
            >
              {t.clearLocalDrafts}
            </button>
          )}
        </div>

        <p className="text-xs text-stone-500 leading-relaxed">
          {lang === 'bn'
            ? 'প্রতিটি অক্ষর টাইপ করার সাথে সাথে ফোনের IndexedDB মেমোরিতে ড্রাফট সংরক্ষিত হয়, তাই কোনো লেখা হারিয়ে যায় না।'
            : 'Articles are saved continuously to this device’s IndexedDB storage to prevent data loss.'}
        </p>

        {localDrafts.length === 0 ? (
          <div className="text-center py-4 text-xs text-stone-400">
            {lang === 'bn' ? 'কোনো ড্রাফট জমা নেই।' : 'No local drafts stored.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {localDrafts.map((d) => (
              <div
                key={d.localId}
                onClick={() => onLoadDraft(d)}
                className="p-3 rounded-2xl border border-stone-200 hover:border-amber-400 bg-stone-50/50 flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h4 className="text-xs font-bold text-stone-900 truncate">
                    {d.title || '(Untitled Draft)'}
                  </h4>
                  <div className="text-[10px] text-stone-400">
                    {new Date(d.lastLocalModified).toLocaleTimeString()}
                    {d.postId && ` • Post #${d.postId}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                    {lang === 'bn' ? 'লোড' : 'Load'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSingleDraft(d.localId, e)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                    title="Delete local draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: YOAST SEO COMPANION PLUGIN (PHP) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-purple-700" />
            <h2 className="text-sm font-bold text-stone-900">
              {lang === 'bn' ? 'ইয়োস্ট কম্প্যানিয়ন প্লাগইন' : 'Yoast Companion Plugin'} (PHP)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            v{COMPANION_PLUGIN_VERSION}
          </span>
        </div>

        <p className="text-xs text-stone-500 leading-relaxed">
          {lang === 'bn'
            ? 'মোবাইল থেকে সরাসরি ফোকাস কি-ফ্রেজ, টাইটেল এবং ডেসক্রিপশন সেভ করার জন্য এই একক পিএইচপি ফাইলটি আপনার সাইটের প্লাগইন ফোল্ডারে রাখুন।'
            : 'Enables writing Focus Keyphrase, SEO Title, and Meta Description, plus CORS authorization for mobile editing.'}
        </p>

        <button
          type="button"
          onClick={handleCopyPluginCode}
          className="w-full py-2.5 px-3 text-xs font-bold rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 transition active:scale-98 flex items-center justify-center gap-1.5 shadow-2xs"
        >
          {copiedPlugin ? (
            <>
              <Check className="w-4 h-4 text-purple-700" />
              <span>{lang === 'bn' ? 'পিএইচপি কোড কপি হয়েছে!' : 'PHP Plugin Code Copied!'}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>{lang === 'bn' ? 'সম্পূর্ণ প্লাগইন কোড কপি করুন (PHP)' : 'Copy Complete Plugin Code (PHP)'}</span>
            </>
          )}
        </button>

        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
          <span className="text-xs font-bold text-stone-900 block">
            {lang === 'bn' ? 'সহজ ইনস্টলেশন ধাপ:' : 'Easy Installation in 4 Steps:'}
          </span>
          <div className="space-y-1.5 text-[11px] text-stone-600">
            {INSTALLATION_STEPS.map((step) => (
              <div key={step.step} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {step.step}
                </span>
                <p className="leading-snug">{step.instruction}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5: ANDROID PWA INSTALLATION */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-700" />
          <h2 className="text-sm font-bold text-stone-900">
            {t.installOnAndroid}
          </h2>
        </div>

        {isInstalled ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>
              {lang === 'bn'
                ? 'অ্যাপটি বর্তমানে অ্যান্ড্রয়েড হোম স্ক্রিন থেকে ফুলস্ক্রিনে চালু আছে!'
                : 'Currently running as an installed standalone PWA!'}
            </span>
          </div>
        ) : isInstallable ? (
          <button
            type="button"
            onClick={install}
            className="w-full py-2.5 px-4 text-xs font-bold bg-stone-900 text-amber-300 rounded-2xl hover:bg-stone-800 transition active:scale-98 flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            {t.installOnAndroid}
          </button>
        ) : (
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-1 leading-relaxed">
            <span className="font-bold text-stone-800 block">
              {lang === 'bn' ? 'যেভাবে হোম স্ক্রিনে অ্যাপ যুক্ত করবেন:' : 'How to install in Chrome on Android:'}
            </span>
            <p className="text-[11px]">
              {lang === 'bn'
                ? '১. ক্রোম ব্রাউজারের উপরে ডানদিকের তিনটি ডট মেনু (⋮) তে চাপ দিন।\n২. "Install app" অথবা "Add to Home screen" নির্বাচন করুন।'
                : '1. Tap the three dots menu (⋮) in Chrome.\n2. Tap "Install app" or "Add to Home screen".'}
            </p>
          </div>
        )}
      </div>

      {/* SECTION 6: SECURITY & PRIVACY */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs p-4 space-y-2 text-xs text-stone-600">
        <div className="flex items-center gap-2 text-stone-900 font-bold">
          <Shield className="w-4 h-4 text-emerald-700" />
          <span>{lang === 'bn' ? 'নিরাপত্তা ও গোপনীয়তা' : 'Security & Privacy'}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-stone-500">
          {lang === 'bn'
            ? '• অ্যাপ্লিকেশন পাসওয়ার্ড শুধুমাত্র আপনার সাইটের সাথে সরাসরি HTTPS এর মাধ্যমে কথা বলে। কোনো থার্ড-পার্টি সার্ভারে কোনো পাসওয়ার্ড পাঠানো হয় না।'
            : '• All credentials authenticate directly against your WordPress site using standard Application Passwords over HTTPS.'}
        </p>
        <div className="pt-2 text-[10px] text-stone-400 font-mono text-center">
          PressPulse v1.0.4 • Ultra-Lightweight WordPress Mobile Editor
        </div>
      </div>
    </div>
  );
};
