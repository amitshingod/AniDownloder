import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Trash2,
  HelpCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { AppSettings, BackendHealth } from '../types';
import { User } from 'firebase/auth';
import { logout } from '../services/firebaseAuth';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearHistory: () => void;
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onClearHistory,
  currentUser,
  onUserChanged,
}) => {
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setBackendHealth(data);
      }
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSignOut = async () => {
    if (window.confirm('Sign out of your Google account?')) {
      await logout();
      onUserChanged(null);
    }
  };

  return (
    <div className="space-y-5 pb-28 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          App Settings
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Configuration, engine diagnostics, and PWA guide
        </p>
      </div>

      {/* Backend Engine Diagnostics */}
      <div className="rounded-3xl glass-panel p-5 border border-white/[0.1] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-400" />
            Backend Engine Status
          </h3>
          <button
            onClick={checkHealth}
            disabled={loadingHealth}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {backendHealth ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-[10px] text-slate-400 block">yt-dlp Core</span>
              <div className="flex items-center gap-1 mt-1 font-semibold text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="truncate">{backendHealth.ytdlpVersion || 'Active'}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-[10px] text-slate-400 block">FFmpeg Engine</span>
              <div className="flex items-center gap-1 mt-1 font-semibold text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Installed & Ready</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-[10px] text-slate-400 block">Service Status</span>
              <div className="flex items-center gap-1 mt-1 font-semibold text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Online (Local & Cloud)</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-[10px] text-slate-400 block">Auto File Cleaner</span>
              <div className="flex items-center gap-1 mt-1 font-semibold text-slate-200">
                <span>30-min Expiration</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 p-2">
            {loadingHealth ? 'Checking engine status...' : 'Connecting to backend engine...'}
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Preferences & Defaults
        </h3>

        {/* Default Quality */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-white block">Default Quality</label>
            <span className="text-[11px] text-slate-400">Preferred format when analyzing</span>
          </div>
          <select
            value={settings.defaultQuality}
            onChange={(e) => onUpdateSettings({ defaultQuality: e.target.value })}
            className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="best_1080">1080p Full HD</option>
            <option value="best_720">720p HD</option>
            <option value="best_480">480p SD</option>
            <option value="audio_mp3">Audio MP3</option>
            <option value="audio_m4a">Audio M4A</option>
          </select>
        </div>

        {/* File System Access API Toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div className="max-w-[70%]">
            <span className="text-xs font-bold text-white block">
              Prompt for Destination Folder
            </span>
            <span className="text-[11px] text-slate-400 leading-tight block">
              Uses File System Access API when supported by the browser
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.useFileSystemApi}
            onChange={(e) => onUpdateSettings({ useFileSystemApi: e.target.checked })}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-black/40 border-white/20"
          />
        </div>
      </div>

      {/* Appearance Section */}
      <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Appearance</h3>

        {/* Dark / Light Mode */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Theme Mode</span>
            <span className="text-[11px] text-slate-400">
              {settings.theme === 'dark' ? 'Deep Space Navy' : 'Clean Light'}
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`p-1.5 rounded-lg transition ${
                settings.theme === 'dark'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`p-1.5 rounded-lg transition ${
                settings.theme === 'light'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile / Desktop Layout */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div>
            <span className="text-xs font-bold text-white block">Layout View Mode</span>
            <span className="text-[11px] text-slate-400">
              {settings.viewMode === 'mobile' ? 'Mobile Container (390px)' : 'Full Responsive Width'}
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
            <button
              onClick={() => onUpdateSettings({ viewMode: 'mobile' })}
              className={`p-1.5 rounded-lg transition ${
                settings.viewMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => onUpdateSettings({ viewMode: 'desktop' })}
              className={`p-1.5 rounded-lg transition ${
                settings.viewMode === 'desktop'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PWA Installation Instructions */}
      <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          PWA Installation on Android
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Installing AniDownloader enables the <strong className="text-white">Android Share Sheet</strong> integration so you can share directly from the YouTube or Instagram apps:
        </p>
        <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside bg-white/[0.03] p-3 rounded-2xl border border-white/[0.06]">
          <li>Open this app in <strong className="text-white">Google Chrome</strong> on Android.</li>
          <li>Tap the three dots (⋮) menu in Chrome, or tap the <strong className="text-white">Install</strong> button at the top of the screen.</li>
          <li>Select <strong className="text-white">Install App</strong> or <strong className="text-white">Add to Home screen</strong>.</li>
          <li>Open YouTube or Instagram, find any public video or Reel, tap <strong className="text-white">Share</strong>, and choose <strong className="text-white">AniDownloader</strong>!</li>
        </ol>
      </div>

      {/* Account / Sign Out Section */}
      {currentUser && (
        <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Google Account</span>
            <span className="text-[11px] text-slate-400 truncate block max-w-[200px]">
              {currentUser.email}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}

      {/* Clear History */}
      <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white block">Download History</span>
          <span className="text-[11px] text-slate-400">Clear saved records from browser</span>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Delete all saved download records?')) {
              onClearHistory();
            }
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-red-400 text-xs font-medium border border-white/[0.08] transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* About & Disclaimer */}
      <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg space-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-bold text-white">
          <Info className="w-4 h-4 text-blue-400" />
          About AniDownloader PWA v2.0
        </div>
        <p className="leading-relaxed">
          AniDownloader processes publicly available media for personal backup and offline viewing. It does not circumvent DRM, paywalls, or private account protections.
        </p>
      </div>
    </div>
  );
};
