import React, { useState } from 'react';
import { DownloadCloud, Settings, WifiOff, Sparkles, User as UserIcon } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { User } from 'firebase/auth';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  currentUser: User | null;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenAccount, currentUser }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#080a10]/80 border-b border-white/[0.08] px-4 py-3 transition-all">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-[0_4px_16px_rgba(59,130,246,0.4)] border border-white/20">
              <DownloadCloud className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#080a10]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  AniDownloader
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Reels & Video Saver</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            {/* In-App PWA Install Button */}
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 hover:brightness-110 active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Install
              </button>
            )}

            {!isInstalled && isIOS && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium border border-white/10 transition"
              >
                Install
              </button>
            )}

            {/* Account / Google Drive avatar */}
            <button
              onClick={onOpenAccount}
              aria-label="Google Drive Account"
              className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-slate-300 transition"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-6 h-6 rounded-lg object-cover ring-1 ring-blue-500/40"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-slate-300" />
              )}
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              aria-label="Settings"
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-slate-300 hover:text-white transition active:rotate-45"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl glass-panel p-6 shadow-2xl border border-white/20">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-blue-400" />
              Install AniDownloader on iOS
            </h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              To install AniDownloader on your iPhone or iPad home screen:
            </p>
            <ol className="mt-3 space-y-2 text-xs text-slate-300 list-decimal list-inside bg-white/[0.04] p-3 rounded-2xl border border-white/[0.06]">
              <li>
                Tap the <strong className="text-white">Share</strong> icon in the Safari bottom bar.
              </li>
              <li>
                Scroll down the share sheet and tap <strong className="text-white">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-white">Add</strong> in the top-right corner.
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
