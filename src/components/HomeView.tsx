import React, { useState } from 'react';
import {
  DownloadCloud,
  ArrowRight,
  Clipboard,
  Search,
  Sparkles,
  Share2,
  CheckCircle2,
  Video,
  Music,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

interface HomeViewProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onAnalyze,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [urlInput, setUrlInput] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        onClearError();
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isLoading) return;
    onAnalyze(urlInput.trim());
  };

  const handleSample = (sampleUrl: string) => {
    setUrlInput(sampleUrl);
    onClearError();
    onAnalyze(sampleUrl);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* MAIN CARD (As specified in brief) */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 shadow-2xl border border-white/[0.12] transition-all">
        {/* Ambient Neon Glow Backdrops */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-blue-600/25 blur-3xl pointer-events-none animate-glow" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-purple-600/20 blur-3xl pointer-events-none animate-glow" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Large 3D Download Icon */}
          <div className="relative mb-5 group">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-b from-[#1e293b]/90 to-[#0f172a]/95 border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center transform transition-transform group-hover:scale-105 active:scale-95">
              <DownloadCloud className="w-12 h-12 text-blue-400 drop-shadow-[0_4px_12px_rgba(96,165,250,0.6)] animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-bold text-white shadow-md flex items-center gap-1 border border-white/20">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Ready to Download
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-xs font-medium">
            Share a YouTube or Instagram video to AniDownloader
          </p>

          {/* Android Share Sheet Flow Diagram */}
          <div className="mt-5 w-full rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 backdrop-blur-md">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Native Android Share Flow
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-200 px-1">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-300">YouTube / IG</span>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500" />

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-300">Tap Share</span>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500" />

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <DownloadCloud className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-blue-300 font-semibold">AniDownloader</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY URL INPUT (Fallback) */}
      <div className="rounded-3xl glass-panel p-5 border border-white/[0.08] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-400" />
            Or Enter URL Directly
          </span>
          <button
            type="button"
            onClick={handlePaste}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 active:scale-95"
          >
            <Clipboard className="w-3 h-3" />
            Paste from Clipboard
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (errorMessage) onClearError();
              }}
              placeholder="https://www.youtube.com/watch?v=... or /reel/..."
              className="w-full pl-4 pr-10 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition shadow-inner"
            />
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!urlInput.trim() || isLoading}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 btn-3d transition ${
              !urlInput.trim() || isLoading
                ? 'opacity-50 cursor-not-allowed bg-slate-700'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-98'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Media via yt-dlp...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Media
              </>
            )}
          </button>
        </form>

        {/* Error message display if backend reports an error */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <strong className="font-semibold block text-red-200">Unable to Process Media</strong>
              {errorMessage}
            </div>
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick test sample links */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="text-[11px] text-slate-400 mb-2 font-medium">Quick Test Links:</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSample('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
              className="text-xs px-2.5 py-1.5 rounded-xl glass-pill text-slate-300 hover:text-white flex items-center gap-1.5 transition"
            >
              <Video className="w-3 h-3 text-red-400" />
              YouTube Video
            </button>
            <button
              type="button"
              onClick={() => handleSample('https://www.youtube.com/shorts/50_48oYjUGE')}
              className="text-xs px-2.5 py-1.5 rounded-xl glass-pill text-slate-300 hover:text-white flex items-center gap-1.5 transition"
            >
              <Video className="w-3 h-3 text-blue-400" />
              YouTube Shorts
            </button>
            <button
              type="button"
              onClick={() => handleSample('https://www.instagram.com/reel/C-xyz123/')}
              className="text-xs px-2.5 py-1.5 rounded-xl glass-pill text-slate-300 hover:text-white flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3 h-3 text-pink-400" />
              Instagram Reel
            </button>
          </div>
        </div>
      </div>

      {/* Feature Badges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl glass-panel p-3.5 border border-white/[0.06]">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
            <Video className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white">Full HD Video</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Up to 1080p MP4 with combined high bitrate audio.
          </p>
        </div>

        <div className="rounded-2xl glass-panel p-3.5 border border-white/[0.06]">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
            <Music className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white">Audio Extraction</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Lossless MP3 (320kbps) & AAC M4A sound tracks.
          </p>
        </div>
      </div>
    </div>
  );
};
