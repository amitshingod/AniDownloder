import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Film,
  Music,
  Clock,
  HardDrive,
  Cloud,
  CheckCircle,
  Loader2,
  AlertCircle,
  Sparkles,
  Share2,
} from 'lucide-react';
import { MediaMetadata, MediaFormat } from '../types';
import { uploadToGoogleDrive } from '../services/googleDrive';
import { getAccessToken, googleSignIn } from '../services/firebaseAuth';

interface QualityViewProps {
  metadata: MediaMetadata;
  onBack: () => void;
  onDownloadComplete: (item: {
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
  }) => void;
}

export const QualityView: React.FC<QualityViewProps> = ({
  metadata,
  onBack,
  onDownloadComplete,
}) => {
  const [downloadingFormatId, setDownloadingFormatId] = useState<string | null>(null);
  const [uploadingFormatId, setUploadingFormatId] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ filename: string; driveLink?: string } | null>(null);

  // Format seconds into MM:SS or HH:MM:SS
  const formatDuration = (sec: number) => {
    if (!sec || sec <= 0) return 'Live / Unknown';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format bytes into KB, MB, GB
  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Estimated';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Trigger browser download mechanism
  const triggerBrowserDownload = async (
    downloadUrl: string,
    filename: string,
    useFilePicker: boolean = false
  ) => {
    // If browser supports File System Access API and user requested it:
    if (useFilePicker && 'showSaveFilePicker' in window) {
      try {
        const pickerHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
        });
        const res = await fetch(downloadUrl);
        const writableStream = await pickerHandle.createWritable();
        await res.body?.pipeTo(writableStream);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // user cancelled picker
        }
        console.warn('File picker fallback to standard download:', err);
      }
    }

    // Standard high-reliability browser / PWA download flow
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Standard Download Handler
  const handleDownload = async (format: MediaFormat) => {
    setDownloadingFormatId(format.formatId);
    setProgressStatus('Requesting media download from server...');
    setProgressPercent(null);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: metadata.sourceUrl,
          formatId: format.formatId,
          title: metadata.title,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed (${response.status})`);
      }

      const data = await response.json();
      setProgressStatus('Saving file through browser download manager...');

      await triggerBrowserDownload(data.downloadUrl, data.filename);

      setSuccessInfo({ filename: data.filename });
      onDownloadComplete({
        title: metadata.title,
        filename: data.filename,
        ext: format.ext,
        quality: format.quality,
        filesize: data.filesize || 0,
        downloadUrl: data.downloadUrl,
        sourceUrl: metadata.sourceUrl,
        thumbnail: metadata.thumbnail,
      });
    } catch (err: any) {
      console.error('Download Error:', err);
      setErrorMessage(err.message || 'An error occurred while preparing your download.');
    } finally {
      setDownloadingFormatId(null);
      setProgressStatus('');
    }
  };

  // Direct Google Drive Upload Handler (Google Workspace Skill)
  const handleSaveToDrive = async (format: MediaFormat) => {
    const confirmed = window.confirm(
      `Save "${metadata.title}" (${format.quality}) to your Google Drive?`
    );
    if (!confirmed) return;

    setUploadingFormatId(format.formatId);
    setProgressStatus('Downloading media on server for Google Drive backup...');
    setProgressPercent(10);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      // 1. Download to backend
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: metadata.sourceUrl,
          formatId: format.formatId,
          title: metadata.title,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server media processing failed.');
      }

      const dlData = await response.json();

      // 2. Fetch the file as Blob from server
      setProgressStatus('Transferring file to Google Drive...');
      setProgressPercent(40);
      const fileRes = await fetch(dlData.downloadUrl);
      const blob = await fileRes.blob();

      // 3. Upload to Google Drive API
      setProgressStatus('Uploading to Google Drive with your authorization...');
      const uploadResult = await uploadToGoogleDrive(
        blob,
        dlData.filename,
        dlData.mimeType || 'video/mp4',
        (pct) => {
          setProgressPercent(40 + Math.round(pct * 0.6));
        }
      );

      setSuccessInfo({
        filename: dlData.filename,
        driveLink: uploadResult.webViewLink,
      });

      onDownloadComplete({
        title: metadata.title,
        filename: dlData.filename,
        ext: format.ext,
        quality: format.quality,
        filesize: dlData.filesize || 0,
        downloadUrl: dlData.downloadUrl,
        sourceUrl: metadata.sourceUrl,
        thumbnail: metadata.thumbnail,
        googleDriveUploaded: true,
        googleDriveLink: uploadResult.webViewLink,
      });
    } catch (err: any) {
      console.error('Google Drive Upload Error:', err);
      setErrorMessage(err.message || 'Google Drive upload encountered an error.');
    } finally {
      setUploadingFormatId(null);
      setProgressStatus('');
      setProgressPercent(null);
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top back button bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 text-xs font-semibold border border-white/[0.08] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </button>

        <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
          Analysis Complete
        </span>
      </div>

      {/* Media Details Card */}
      <div className="rounded-3xl glass-panel p-4 border border-white/[0.12] shadow-xl overflow-hidden relative">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 group">
          {metadata.thumbnail ? (
            <img
              src={metadata.thumbnail}
              alt={metadata.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <Film className="w-12 h-12" />
            </div>
          )}

          {/* Duration Badge */}
          <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 border border-white/10 shadow-md">
            <Clock className="w-3 h-3 text-blue-400" />
            {formatDuration(metadata.duration)}
          </div>
        </div>

        <div className="mt-3.5 space-y-1">
          <h2 className="text-base font-bold text-white line-clamp-2 leading-snug">
            {metadata.title}
          </h2>
          {metadata.uploader && (
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span>Channel / Creator:</span>
              <span className="text-slate-200 font-semibold">{metadata.uploader}</span>
            </p>
          )}
        </div>
      </div>

      {/* Active Progress or Status Notification */}
      {(downloadingFormatId || uploadingFormatId) && (
        <div className="p-4 rounded-2xl glass-panel border border-blue-500/40 bg-blue-950/30 text-xs space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-blue-300 font-semibold">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              {progressStatus || 'Processing media request...'}
            </span>
            {progressPercent !== null && <span>{progressPercent}%</span>}
          </div>
          {progressPercent !== null && (
            <div className="w-full h-2 rounded-full bg-blue-950 overflow-hidden border border-blue-500/20">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            Powered by high-performance backend yt-dlp & FFmpeg engine.
          </p>
        </div>
      )}

      {/* Success banner */}
      {successInfo && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            File successfully ready: {successInfo.filename}
          </div>
          {successInfo.driveLink && (
            <a
              href={successInfo.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-300 hover:text-blue-200 underline mt-1"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              Open file in Google Drive
            </a>
          )}
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Available Formats Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            Select Format & Quality
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            {metadata.formats.length} formats available
          </span>
        </div>

        <div className="space-y-2.5">
          {metadata.formats.map((format) => {
            const isAudio = format.ext === 'mp3' || format.ext === 'm4a';
            const isCurrentDownloading = downloadingFormatId === format.formatId;
            const isCurrentUploading = uploadingFormatId === format.formatId;
            const isBusy = downloadingFormatId !== null || uploadingFormatId !== null;

            return (
              <div
                key={format.formatId}
                className="rounded-2xl glass-panel p-3.5 border border-white/[0.08] hover:border-blue-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                {/* Format Details */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isAudio
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}
                  >
                    {isAudio ? <Music className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{format.quality}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300">
                        {format.ext}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{format.note || (isAudio ? 'Audio Stream' : 'Video')}</span>
                      {format.filesize && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-medium">
                            {formatBytes(format.filesize)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Download & Google Drive Save */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Save to Google Drive Button */}
                  <button
                    onClick={() => handleSaveToDrive(format)}
                    disabled={isBusy}
                    title="Save to your Google Drive"
                    className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 hover:text-white transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {isCurrentUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    ) : (
                      <Cloud className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="hidden xs:inline">Drive</span>
                  </button>

                  {/* Direct Download Button */}
                  <button
                    onClick={() => handleDownload(format)}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 btn-3d"
                  >
                    {isCurrentDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Browser Download Notice */}
      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400 space-y-1">
        <strong className="text-slate-300 block font-semibold">Browser Download Notice</strong>
        <p>
          Downloaded files are saved to your device's default Downloads folder using the native
          browser download manager, or synced to Google Drive when cloud save is chosen.
        </p>
      </div>
    </div>
  );
};
