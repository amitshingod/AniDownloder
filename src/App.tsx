/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { Navbar, TabType } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { QualityView } from './components/QualityView';
import { DownloadHistoryView } from './components/DownloadHistoryView';
import { GoogleDriveView } from './components/GoogleDriveView';
import { SettingsView } from './components/SettingsView';
import { MediaPreviewModal } from './components/MediaPreviewModal';
import { useShareTarget } from './hooks/useShareTarget';
import { initAuth } from './services/firebaseAuth';
import { MediaMetadata, DownloadHistoryItem, AppSettings } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  viewMode: 'mobile',
  autoDownload: false,
  defaultQuality: 'best_720',
  useFileSystemApi: false,
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [analyzedMedia, setAnalyzedMedia] = useState<MediaMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DownloadHistoryItem | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('anidownloader_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // History from localStorage
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('anidownloader_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('anidownloader_history', JSON.stringify(history));
    } catch (err) {
      console.warn('Failed to persist history:', err);
    }
  }, [history]);

  // Save settings and apply theme
  useEffect(() => {
    try {
      localStorage.setItem('anidownloader_settings', JSON.stringify(settings));
    } catch {}

    if (settings.theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [settings]);

  // Initialize Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Analyze media URL via backend
  const handleAnalyze = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      setCurrentTab('home');

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to analyze media.');
        }

        setAnalyzedMedia({
          ...data,
          sourceUrl: url,
        });
      } catch (err: any) {
        console.error('Analyze failed:', err);
        setErrorMessage(err.message || 'Media analysis failed. Please verify the URL.');
        setAnalyzedMedia(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Android Web Share Target handler:
  // When a YouTube/Instagram URL is shared to AniDownloader via Android Share Sheet:
  useShareTarget((sharedUrl) => {
    console.log('[AniDownloader] Received shared URL from Android share sheet:', sharedUrl);
    handleAnalyze(sharedUrl);
  });

  // Handle completed download item
  const handleDownloadComplete = (item: {
    title: string;
    filename: string;
    ext: string;
    quality: string;
    filesize: number;
    downloadUrl: string;
    sourceUrl: string;
    thumbnail: string;
    googleDriveUploaded?: boolean;
    googleDriveLink?: string;
  }) => {
    const newItem: DownloadHistoryItem = {
      id: crypto.randomUUID(),
      ...item,
      timestamp: Date.now(),
      status: 'completed',
    };

    setHistory((prev) => [newItem, ...prev]);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateHistoryItem = (updated: DownloadHistoryItem) => {
    setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col ${
        settings.theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-[#080a10] text-slate-100'
      }`}
    >
      {/* App Shell Container: Mobile Frame (390px centered) or Full Width based on setting */}
      <div
        className={`w-full mx-auto min-h-screen flex flex-col transition-all duration-300 ${
          settings.viewMode === 'mobile'
            ? 'max-w-md shadow-2xl relative border-x border-white/[0.05]'
            : 'max-w-4xl px-4'
        }`}
      >
        {/* Sticky Header */}
        <Header
          currentUser={currentUser}
          onOpenSettings={() => setCurrentTab('settings')}
          onOpenAccount={() => setCurrentTab('drive')}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-4 pt-4">
          {currentTab === 'home' && (
            <>
              {analyzedMedia ? (
                <QualityView
                  metadata={analyzedMedia}
                  onBack={() => setAnalyzedMedia(null)}
                  onDownloadComplete={handleDownloadComplete}
                />
              ) : (
                <HomeView
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                  errorMessage={errorMessage}
                  onClearError={() => setErrorMessage(null)}
                />
              )}
            </>
          )}

          {currentTab === 'downloads' && (
            <DownloadHistoryView
              history={history}
              onClearHistory={handleClearHistory}
              onDeleteItem={handleDeleteHistoryItem}
              onPlayMedia={(item) => setPreviewItem(item)}
              onItemUpdated={handleUpdateHistoryItem}
            />
          )}

          {currentTab === 'drive' && (
            <GoogleDriveView
              currentUser={currentUser}
              onUserChanged={setCurrentUser}
              history={history}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onClearHistory={handleClearHistory}
              currentUser={currentUser}
              onUserChanged={setCurrentUser}
            />
          )}
        </main>

        {/* Bottom Floating Navigation */}
        <Navbar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
          }}
          downloadCount={history.length}
          driveConnected={!!currentUser}
        />
      </div>

      {/* Media In-App Preview / Playback Modal */}
      <MediaPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
