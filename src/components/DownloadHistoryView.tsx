import React, { useState } from 'react';
import {
  FolderDown,
  Trash2,
  Play,
  Download,
  Cloud,
  ExternalLink,
  Film,
  Music,
  CheckCircle,
  Clock,
  HardDrive,
  FileCheck,
  AlertCircle,
  Loader2,
  Share2,
  Check,
} from 'lucide-react';
import { DownloadHistoryItem } from '../types';
import { uploadToGoogleDrive } from '../services/googleDrive';

interface DownloadHistoryViewProps {
  history: DownloadHistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  onPlayMedia: (item: DownloadHistoryItem) => void;
  onItemUpdated: (item: DownloadHistoryItem) => void;
}

export const DownloadHistoryView: React.FC<DownloadHistoryViewProps> = ({
  history,
  onClearHistory,
  onDeleteItem,
  onPlayMedia,
  onItemUpdated,
}) => {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<{ id: string; message: string } | null>(null);

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDriveUpload = async (item: DownloadHistoryItem) => {
    const confirmed = window.confirm(`Upload "${item.filename}" to your Google Drive?`);
    if (!confirmed) return;

    setUploadingId(item.id);
    try {
      // Fetch file blob from backend
      const res = await fetch(item.downloadUrl);
      if (!res.ok) throw new Error('File has expired on server or is unavailable.');
      const blob = await res.blob();

      const mimeType = item.ext === 'mp3' ? 'audio/mpeg' : 'video/mp4';
      const uploadResult = await uploadToGoogleDrive(blob, item.filename, mimeType);

      const updated: DownloadHistoryItem = {
        ...item,
        googleDriveUploaded: true,
        googleDriveLink: uploadResult.webViewLink,
      };
      onItemUpdated(updated);
    } catch (err: any) {
      alert(err.message || 'Google Drive upload failed.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleShareItem = async (item: DownloadHistoryItem) => {
    setSharingId(item.id);
    try {
      const mimeType =
        item.ext === 'mp3'
          ? 'audio/mpeg'
          : item.ext === 'm4a'
          ? 'audio/mp4'
          : item.ext === 'webm'
          ? 'video/webm'
          : 'video/mp4';

      // 1. Fetch file blob to share the real file to apps (e.g. WhatsApp, Telegram, Files, etc.)
      let fileBlob: Blob | null = null;
      try {
        const res = await fetch(item.downloadUrl);
        if (res.ok) {
          fileBlob = await res.blob();
        }
      } catch (blobErr) {
        console.warn('Could not fetch blob for file share:', blobErr);
      }

      if (fileBlob) {
        const file = new File([fileBlob], item.filename, {
          type: fileBlob.type || mimeType,
        });

        // Check if browser Web Share API supports file sharing
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: item.title,
            text: item.title,
          });
          return;
        }
      }

      // 2. Fallback: Share the absolute link if file sharing is not supported by current browser
      const absoluteUrl = new URL(item.downloadUrl, window.location.origin).href;
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Download "${item.title}":`,
          url: absoluteUrl,
        });
        return;
      }

      // 3. Fallback for browsers without Web Share API: Copy download link to clipboard
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteUrl);
        setShareFeedback({ id: item.id, message: 'Link Copied!' });
        setTimeout(() => setShareFeedback(null), 2500);
      } else {
        alert(`Share link: ${absoluteUrl}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User dismissed the share sheet
        return;
      }
      console.error('Share action failed:', err);
      alert(err.message || 'Could not share file.');
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FolderDown className="w-5 h-5 text-blue-400" />
            Downloads History
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {history.length} {history.length === 1 ? 'file' : 'files'} recorded
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Clear all items from your download history?')) {
                onClearHistory();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-3xl glass-panel p-8 text-center border border-white/[0.08] shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-3">
            <FolderDown className="w-8 h-8 opacity-70" />
          </div>
          <h3 className="text-base font-bold text-white">No Downloads Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Shared videos from YouTube, Shorts, or Instagram Reels will appear here once saved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const isAudio = item.ext === 'mp3' || item.ext === 'm4a';

            return (
              <div
                key={item.id}
                className="rounded-2xl glass-panel p-3.5 border border-white/[0.08] hover:border-blue-500/30 transition shadow-md flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail / Media Icon */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/50 shrink-0 border border-white/10 group">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        {isAudio ? <Music className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                      </div>
                    )}
                    <button
                      onClick={() => onPlayMedia(item)}
                      title="Play Preview"
                      className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white opacity-90 transition"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                  </div>

                  {/* Title and metadata */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {item.filename}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase">
                        {item.quality}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(item.filesize)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Delete individual item */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom action row for this item */}
                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Saved</span>
                    {item.googleDriveUploaded && (
                      <span className="text-blue-400 flex items-center gap-0.5 ml-1">
                        • <Cloud className="w-3 h-3" /> In Drive
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Google Drive action */}
                    {item.googleDriveUploaded && item.googleDriveLink ? (
                      <a
                        href={item.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Drive
                      </a>
                    ) : (
                      <button
                        onClick={() => handleDriveUpload(item)}
                        disabled={uploadingId === item.id}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition disabled:opacity-50"
                      >
                        {uploadingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        ) : (
                          <Cloud className="w-3 h-3 text-blue-400" />
                        )}
                        Drive
                      </button>
                    )}

                    {/* Web Share button */}
                    <button
                      onClick={() => handleShareItem(item)}
                      disabled={sharingId === item.id}
                      title="Share file to other apps"
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition active:scale-95 disabled:opacity-50 ${
                        shareFeedback?.id === item.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30'
                      }`}
                    >
                      {sharingId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                      ) : shareFeedback?.id === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3 h-3 text-indigo-400" />
                      )}
                      <span>{shareFeedback?.id === item.id ? shareFeedback.message : 'Share'}</span>
                    </button>

                    {/* Download again / file link */}
                    <a
                      href={item.downloadUrl}
                      download={item.filename}
                      className="flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 transition active:scale-95"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
