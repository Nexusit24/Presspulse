import React, { useState } from 'react';
import {
  Globe,
  User,
  Key,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  LogOut,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ConnectionConfig, WordPressUser } from '../types/wordpress';
import { wordPressService, normalizeSiteUrl } from '../services/wordpress';

interface ConnectionModalProps {
  currentConfig: ConnectionConfig | null;
  onSaveConfig: (config: ConnectionConfig) => Promise<void>;
  onDisconnect: () => Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
  isInitialSetup?: boolean;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  currentConfig,
  onSaveConfig,
  onDisconnect,
  isInitialSetup = false,
}) => {
  const [siteUrl, setSiteUrl] = useState(currentConfig?.siteUrl || '');
  const [username, setUsername] = useState(currentConfig?.username || '');
  const [appPassword, setAppPassword] = useState(currentConfig?.appPassword || '');
  const [rememberCredentials, setRememberCredentials] = useState(
    currentConfig?.rememberCredentials ?? true
  );

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    user?: WordPressUser;
    siteName?: string;
    hasYoastCompanion?: boolean;
    error?: string;
    isCors?: boolean;
  } | null>(null);

  const [showAppPasswordGuide, setShowAppPasswordGuide] = useState(false);
  const [showCorsGuide, setShowCorsGuide] = useState(false);

  const handleTestConnection = async () => {
    if (!siteUrl.trim() || !username.trim() || !appPassword.trim()) {
      setTestResult({
        success: false,
        error: 'Please fill in Site URL, Username, and Application Password first.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const configToTest: ConnectionConfig = {
      siteUrl: normalizeSiteUrl(siteUrl),
      username: username.trim(),
      appPassword: appPassword.trim(),
      rememberCredentials,
    };

    try {
      const res = await wordPressService.testConnection(configToTest);
      setTestResult({
        success: true,
        user: res.user,
        siteName: res.siteName,
        hasYoastCompanion: res.hasYoastCompanion,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Connection failed.',
        isCors: err.isCorsError,
      });
      if (err.isCorsError) {
        setShowCorsGuide(true);
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl.trim() || !username.trim() || !appPassword.trim()) {
      setTestResult({
        success: false,
        error: 'All fields are required to connect.',
      });
      return;
    }

    const cleanConfig: ConnectionConfig = {
      siteUrl: normalizeSiteUrl(siteUrl),
      username: username.trim(),
      appPassword: appPassword.trim(),
      rememberCredentials,
    };

    setTesting(true);
    try {
      // Test before saving
      await wordPressService.testConnection(cleanConfig);
      await onSaveConfig(cleanConfig);
      setTestResult({ success: true });
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Could not verify WordPress credentials.',
        isCors: err.isCorsError,
      });
      if (err.isCorsError) {
        setShowCorsGuide(true);
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 max-w-lg mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-stone-900">
            {isInitialSetup ? 'Connect Your WordPress Site' : 'WordPress Connection'}
          </h2>
        </div>
        <p className="text-xs text-stone-500">
          Connect securely via standard WordPress Application Passwords. No third-party services involved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Site URL */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            WordPress Site URL
          </label>
          <div className="relative">
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://yourblog.com"
              className="w-full text-sm rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
              required
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            e.g. <span className="font-mono">https://mytechblog.com</span> (HTTPS required)
          </p>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            WordPress Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin or author username"
              className="w-full text-sm rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              required
            />
          </div>
        </div>

        {/* Application Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-stone-700">
              Application Password
            </label>
            <button
              type="button"
              onClick={() => setShowAppPasswordGuide(!showAppPasswordGuide)}
              className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-0.5 font-medium"
            >
              <HelpCircle className="w-3 h-3" />
              How to create?
            </button>
          </div>

          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="xxxx xxxx xxxx xxxx"
            className="w-full text-sm rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono tracking-wider"
            required
            autoComplete="current-password"
          />

          {showAppPasswordGuide && (
            <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-amber-950">How to generate an Application Password:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px]">
                <li>Log in to your WordPress Admin dashboard.</li>
                <li>Go to <strong>Users → Profile</strong> (or Edit User).</li>
                <li>Scroll down to the <strong>Application Passwords</strong> section.</li>
                <li>Enter <code className="bg-amber-100 px-1 py-0.5 rounded">PressPulse</code> as the new application name.</li>
                <li>Click <strong>Add New Application Password</strong>.</li>
                <li>Copy the generated 24-character password and paste it here.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Remember Credentials Toggle */}
        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberCredentials}
              onChange={(e) => setRememberCredentials(e.target.checked)}
              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <div className="text-xs">
              <span className="font-medium text-stone-800">
                Remember credentials on this device
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Saved securely in browser IndexedDB. If unchecked, credentials stay in session memory only and are cleared when the browser or tab closes.
              </p>
            </div>
          </label>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testResult.success ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Connection verified!
                </div>
                <p className="text-[11px]">
                  Logged in as <strong>{testResult.user?.name}</strong>
                  {testResult.siteName ? ` on "${testResult.siteName}"` : ''}.
                </p>
                <div className="text-[11px] pt-1 border-t border-emerald-200/60 flex items-center justify-between">
                  <span>Yoast SEO Companion Plugin:</span>
                  <span className="font-semibold">
                    {testResult.hasYoastCompanion ? 'Active ✓' : 'Not installed (standard meta fallback)'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Connection failed</span>
                </div>
                <p className="text-[11px] leading-relaxed">{testResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* CORS Troubleshooting Guide */}
        {showCorsGuide && (
          <div className="p-3 bg-stone-100 rounded-lg border border-stone-300 text-xs text-stone-800 space-y-2">
            <div className="flex items-center justify-between font-semibold text-stone-900">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Browser CORS Restriction Resolution
              </span>
              <button
                type="button"
                onClick={() => setShowCorsGuide(!showCorsGuide)}
                className="text-stone-500 hover:text-stone-700"
              >
                {showCorsGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-600">
              Direct browser-to-WordPress requests require CORS authorization. Choose either solution:
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="bg-white p-2 rounded border border-stone-200">
                <strong>Solution A (Easiest): Install PressPulse Companion Plugin</strong>
                <p className="text-stone-500 mt-0.5">
                  The plugin (available in Settings) automatically authorizes the mobile editor and enables full Yoast read/write.
                </p>
              </div>
              <div className="bg-white p-2 rounded border border-stone-200">
                <strong>Solution B: Add Apache Header (.htaccess)</strong>
                <pre className="mt-1 bg-stone-900 text-stone-100 p-1.5 rounded text-[10px] overflow-x-auto font-mono">
                  Header set Access-Control-Allow-Origin "*"{'\n'}
                  Header set Access-Control-Allow-Headers "Authorization, Content-Type"
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition active:scale-98 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            type="submit"
            disabled={testing}
            className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-stone-900 text-amber-300 hover:bg-stone-800 transition active:scale-98 disabled:opacity-50 shadow-xs"
          >
            {isInitialSetup ? 'Save & Start Writing' : 'Save Connection'}
          </button>
        </div>

        {/* Disconnect button if already connected */}
        {currentConfig && !isInitialSetup && (
          <div className="pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onDisconnect}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect & Wipe Credentials
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
