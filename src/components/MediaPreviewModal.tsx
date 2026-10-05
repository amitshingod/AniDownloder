import React, { useState } from 'react';
import { X, Download, Cloud, ExternalLink, Film, Music, Share2, Loader2, Check } from 'lucide-react';
import { DownloadHistoryItem } from '../types';

interface MediaPreviewModalProps {
  item: DownloadHistoryItem | null;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ item, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!item) return null;

  const isAudio = item.ext === 'mp3' || item.ext === 'm4a';

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const mimeType =
        item.ext === 'mp3'
          ? 'audio/mpeg'
          : item.ext === 'm4a'
          ? 'audio/mp4'
          : item.ext === 'webm'
          ? 'video/webm'
          : 'video/mp4';

      let fileBlob: Blob | null = null;
      try {
        const res = await fetch(item.downloadUrl);
        if (res.ok) {
          fileBlob = await res.blob();
        }
      } catch (e) {
        console.warn('Could not fetch blob for file share:', e);
      }

      if (fileBlob) {
        const file = new File([fileBlob], item.filename, {
          type: fileBlob.type || mimeType,
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: item.title,
            text: item.title,
          });
          return;
        }
      }

      const absoluteUrl = new URL(item.downloadUrl, window.location.origin).href;
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Download "${item.title}":`,
          url: absoluteUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteUrl);
        setShareFeedback('Copied!');
        setTimeout(() => setShareFeedback(null), 2500);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Share modal failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl glass-panel p-5 border border-white/20 shadow-2xl relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate pr-4">
            {isAudio ? (
              <Music className="w-5 h-5 text-purple-400 shrink-0" />
            ) : (
              <Film className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Player */}
        <div className="rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center min-h-[220px]">
          {isAudio ? (
            <div className="w-full p-6 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                <Music className="w-10 h-10" />
              </div>
              <audio controls autoPlay src={item.downloadUrl} className="w-full" />
            </div>
          ) : (
            <video
              controls
              autoPlay
              playsInline
              src={item.downloadUrl}
              className="w-full max-h-[380px] object-contain rounded-2xl"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
            {item.filename}
          </span>

          <div className="flex items-center gap-2">
            {item.googleDriveLink && (
              <a
                href={item.googleDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-blue-300 text-xs font-semibold transition"
              >
                <Cloud className="w-3.5 h-3.5" />
                Drive
              </a>
            )}
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition disabled:opacity-50"
            >
              {isSharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : shareFeedback ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              )}
              {shareFeedback || 'Share'}
            </button>
            <a
              href={item.downloadUrl}
              download={item.filename}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition btn-3d"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
