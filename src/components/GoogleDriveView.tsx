import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle,
  HardDrive,
  LogOut,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Folder,
  FileCheck2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { getDriveStorageQuota, DriveQuota } from '../services/googleDrive';
import { DownloadHistoryItem } from '../types';

interface GoogleDriveViewProps {
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  history: DownloadHistoryItem[];
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  currentUser,
  onUserChanged,
  history,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [driveQuota, setDriveQuota] = useState<DriveQuota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  const fetchQuota = async () => {
    if (!currentUser) return;
    setLoadingQuota(true);
    try {
      const quota = await getDriveStorageQuota();
      if (quota) setDriveQuota(quota);
    } catch (err) {
      console.error('Error fetching Drive quota:', err);
    } finally {
      setLoadingQuota(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchQuota();
    } else {
      setDriveQuota(null);
    }
  }, [currentUser]);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        onUserChanged(res.user);
      }
    } catch (err) {
      console.error('Sign-in error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Sign out of your Google account?')) {
      await logout();
      onUserChanged(null);
      setDriveQuota(null);
    }
  };

  const driveSyncedItems = history.filter((i) => i.googleDriveUploaded);

  const formatQuotaGb = (bytesStr?: string) => {
    if (!bytesStr) return '0 GB';
    const num = Number(bytesStr);
    if (isNaN(num)) return '0 GB';
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getQuotaPercent = () => {
    if (!driveQuota?.limit || !driveQuota?.usage) return 0;
    const limit = Number(driveQuota.limit);
    const usage = Number(driveQuota.usage);
    if (!limit || isNaN(limit) || isNaN(usage)) return 0;
    return Math.min(100, Math.round((usage / limit) * 100));
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-400" />
          Google Drive Cloud Backup
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Direct Google Workspace Drive integration for instant cloud saving
        </p>
      </div>

      {!currentUser ? (
        /* Not Signed In Card */
        <div className="rounded-3xl glass-panel p-6 border border-white/[0.12] text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
            <Folder className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Connect Your Google Drive</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
              Sign in with your Google account to automatically backup downloaded videos, Reels, and
              music directly to your personal Drive storage.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            {/* Official Google Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="gsi-material-button shadow-lg active:scale-95 transition"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-medium">
                  {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorized via Google Workspace OAuth</span>
          </div>
        </div>
      ) : (
        /* Connected Profile Card */
        <div className="space-y-4">
          <div className="rounded-3xl glass-panel p-5 border border-white/[0.12] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/40"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {currentUser.displayName?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {currentUser.displayName || 'Connected User'}
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[200px]">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-red-400 transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Storage Quota Progress */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  Google Drive Storage
                </span>
                <button
                  onClick={fetchQuota}
                  disabled={loadingQuota}
                  className="text-slate-400 hover:text-slate-200 transition"
                  title="Refresh Quota"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingQuota ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {driveQuota?.limit ? (
                <>
                  <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${getQuotaPercent()}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{formatQuotaGb(driveQuota.usage)} used</span>
                    <span>{formatQuotaGb(driveQuota.limit)} total</span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-slate-400">
                  {loadingQuota ? 'Loading storage information...' : 'Storage details available.'}
                </div>
              )}
            </div>
          </div>

          {/* Synced Files Overview */}
          <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                Files Backed Up to Drive ({driveSyncedItems.length})
              </h4>
            </div>

            {driveSyncedItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No files synced to Google Drive yet. Tap "Save to Google Drive" on any format or
                from your Downloads history!
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {driveSyncedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.filename}</div>
                    </div>
                    {item.googleDriveLink && (
                      <a
                        href={item.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 hover:text-white font-medium flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
