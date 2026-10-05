export interface MediaFormat {
  formatId: string;
  quality: string;
  ext: string;
  filesize?: number;
  downloadUrl?: string;
  note?: string;
}

export interface MediaMetadata {
  title: string;
  thumbnail: string;
  duration: number;
  uploader?: string;
  formats: MediaFormat[];
  sourceUrl: string;
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  filename: string;
  ext: string;
  quality: string;
  filesize: number;
  downloadUrl: string;
  sourceUrl: string;
  thumbnail: string;
  timestamp: number;
  status: 'completed' | 'failed' | 'downloading';
  googleDriveUploaded?: boolean;
  googleDriveLink?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  viewMode: 'mobile' | 'desktop';
  autoDownload: boolean;
  defaultQuality: string;
  useFileSystemApi: boolean;
}

export interface BackendHealth {
  status: string;
  ytdlp: boolean;
  ytdlpVersion: string;
  ffmpeg: boolean;
  activeCachedFiles: number;
  timestamp: string;
}
