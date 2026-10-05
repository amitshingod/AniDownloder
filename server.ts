import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFile, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Directories
const TEMP_DOWNLOAD_DIR = path.resolve(__dirname, 'downloads_temp');
if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
  fs.mkdirSync(TEMP_DOWNLOAD_DIR, { recursive: true });
}

// In-memory file registry for downloaded media
interface StoredFile {
  fileId: string;
  filePath: string;
  filename: string;
  mimeType: string;
  filesize: number;
  createdAt: number;
}
const fileRegistry = new Map<string, StoredFile>();

// Discover yt-dlp binary
function findYtDlp(): string {
  const candidates = [
    process.env.YTDLP_PATH,
    path.resolve(__dirname, 'bin/yt-dlp'),
    '/bin_tools/yt-dlp',
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      try {
        fs.chmodSync(candidate, 0o755);
      } catch (err) {
        console.warn(`[findYtDlp] Note: Could not set 0755 permissions on ${candidate}:`, err);
      }
      return candidate;
    }
  }

  return 'yt-dlp';
}

// Discover ffmpeg binary
function findFfmpeg(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (fs.existsSync('/usr/bin/ffmpeg')) {
    return '/usr/bin/ffmpeg';
  }
  return 'ffmpeg';
}

const YTDLP_BIN = findYtDlp();
const FFMPEG_BIN = findFfmpeg();

console.log(`[AniDownloader Backend] Using yt-dlp at: ${YTDLP_BIN}`);
console.log(`[AniDownloader Backend] Using ffmpeg at: ${FFMPEG_BIN}`);

// Periodic cleanup of temporary downloads (older than 30 minutes)
setInterval(() => {
  const now = Date.now();
  const EXPIRATION_MS = 30 * 60 * 1000;

  for (const [fileId, info] of fileRegistry.entries()) {
    if (now - info.createdAt > EXPIRATION_MS) {
      try {
        if (fs.existsSync(info.filePath)) {
          fs.unlinkSync(info.filePath);
        }
      } catch (err) {
        console.error(`Failed to delete expired file ${info.filePath}:`, err);
      }
      fileRegistry.delete(fileId);
    }
  }

  // Also clean unreferenced files in directory
  try {
    const files = fs.readdirSync(TEMP_DOWNLOAD_DIR);
    for (const f of files) {
      const full = path.join(TEMP_DOWNLOAD_DIR, f);
      const stat = fs.statSync(full);
      if (now - stat.mtimeMs > EXPIRATION_MS) {
        fs.unlinkSync(full);
      }
    }
  } catch (err) {
    // ignore
  }
}, 5 * 60 * 1000);

// Helper: Sanitize filename for safe Content-Disposition
function sanitizeFilename(name: string, ext: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 100);
  const cleanExt = ext.replace(/^\./, '');
  return `${cleaned || 'download'}.${cleanExt}`;
}

// Helper: Determine MIME type
function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'opus':
      return 'audio/opus';
    default:
      return 'application/octet-stream';
  }
}

// Helper: Validate source URL
function validateSourceUrl(rawUrl: unknown): { valid: boolean; url: string; error?: string } {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, url: '', error: 'URL must be a non-empty string' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, url: '', error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, url: '', error: 'Only HTTP and HTTPS URLs are allowed' };
  }

  return { valid: true, url: parsed.href };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  let ytVersion = 'unknown';
  try {
    ytVersion = execFileSync(YTDLP_BIN, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    // fallback
  }

  res.json({
    status: 'ok',
    ytdlp: true,
    ytdlpVersion: ytVersion,
    ffmpeg: fs.existsSync(FFMPEG_BIN) || FFMPEG_BIN === 'ffmpeg',
    activeCachedFiles: fileRegistry.size,
    timestamp: new Date().toISOString(),
  });
});

// Analyze endpoint
app.post('/api/analyze', (req: Request, res: Response) => {
  const { valid, url, error } = validateSourceUrl(req.body?.url);
  if (!valid) {
    return res.status(400).json({ error: error || 'Invalid source URL' });
  }

  console.log(`[Analyze] Processing URL: ${url}`);

  const args = [
    '--dump-single-json',
    '--no-playlist',
    '--no-warnings',
    '--prefer-free-formats',
    '--ffmpeg-location', FFMPEG_BIN,
    '--js-runtimes', `node:${process.execPath}`,
    '--',
    url,
  ];

  execFile(
    YTDLP_BIN,
    args,
    { maxBuffer: 15 * 1024 * 1024, timeout: 50000 },
    (err, stdout, stderr) => {
      if (err) {
        console.error('[Analyze Error]', stderr || err.message);
        const errMsg = stderr || err.message;
        if (
          errMsg.includes('Private video') ||
          errMsg.includes('Sign in') ||
          errMsg.includes('login') ||
          errMsg.includes('not a bot') ||
          errMsg.includes('bot')
        ) {
          return res.status(403).json({
            error:
              'This video requires account verification or is restricted by the host platform (bot check/login required). AniDownloader supports public media without login barriers.',
          });
        }
        if (errMsg.includes('DRM') || errMsg.includes('copyright')) {
          return res.status(403).json({
            error: 'This media is protected by DRM or copyright controls and cannot be downloaded.',
          });
        }
        if (errMsg.includes('Video unavailable') || errMsg.includes('not found') || errMsg.includes('404')) {
          return res.status(404).json({
            error: 'Media is unavailable or not found. Please verify the URL.',
          });
        }
        return res.status(500).json({
          error: `Media analysis failed: ${errMsg.slice(0, 150)}`,
        });
      }

      try {
        const jsonStart = stdout.indexOf('{');
        const jsonEnd = stdout.lastIndexOf('}');
        const rawJson = (jsonStart !== -1 && jsonEnd !== -1) ? stdout.slice(jsonStart, jsonEnd + 1) : stdout;
        const data = JSON.parse(rawJson);
        const title = data.title || 'Untitled Video';
        const thumbnail = data.thumbnail || (Array.isArray(data.thumbnails) && data.thumbnails[0]?.url) || '';
        const duration = Math.round(data.duration || 0);

        // Build curated format options
        const formatsList: Array<{
          formatId: string;
          quality: string;
          ext: string;
          filesize?: number;
          downloadUrl?: string;
          note?: string;
        }> = [];

        // Check if source has high-res formats
        const rawFormats: any[] = Array.isArray(data.formats) ? data.formats : [];
        const has1080 = rawFormats.some((f) => (f.height || 0) >= 1080);
        const has720 = rawFormats.some((f) => (f.height || 0) >= 720);
        const has480 = rawFormats.some((f) => (f.height || 0) >= 480);

        if (has1080) {
          formatsList.push({
            formatId: 'best_1080',
            quality: '1080p Full HD',
            ext: 'mp4',
            note: 'High Definition Video with AAC Audio',
          });
        }

        if (has720 || (!has1080 && rawFormats.length > 0)) {
          formatsList.push({
            formatId: 'best_720',
            quality: '720p HD',
            ext: 'mp4',
            note: 'Optimized Mobile HD Quality',
          });
        }

        if (has480) {
          formatsList.push({
            formatId: 'best_480',
            quality: '480p SD',
            ext: 'mp4',
            note: 'Data-saver standard definition',
          });
        }

        formatsList.push({
          formatId: 'best_360',
          quality: '360p Compact',
          ext: 'mp4',
          note: 'Lightweight format for fast downloads',
        });

        // Audio formats
        formatsList.push({
          formatId: 'audio_mp3',
          quality: 'Audio MP3',
          ext: 'mp3',
          note: 'High-quality MP3 Audio (320 kbps)',
        });

        formatsList.push({
          formatId: 'audio_m4a',
          quality: 'Audio M4A',
          ext: 'm4a',
          note: 'Original Apple/AAC Audio stream',
        });

        // Add any direct standalone mp4 streams with known filesize from raw formats
        const standaloneMp4s = rawFormats.filter(
          (f) => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4' && f.filesize
        );

        for (const s of standaloneMp4s.slice(0, 2)) {
          if (!formatsList.some((existing) => existing.formatId === s.format_id)) {
            formatsList.push({
              formatId: String(s.format_id),
              quality: `${s.height || 360}p Direct MP4`,
              ext: 'mp4',
              filesize: s.filesize,
              note: 'Direct combined stream',
            });
          }
        }

        return res.json({
          title,
          thumbnail,
          duration,
          uploader: data.uploader || data.channel || '',
          formats: formatsList,
        });
      } catch (parseErr: any) {
        console.error('[Analyze Parse Error]', parseErr);
        return res.status(500).json({ error: 'Failed to parse media metadata from yt-dlp.' });
      }
    }
  );
});

// Download endpoint
app.post('/api/download', (req: Request, res: Response) => {
  const { valid, url, error } = validateSourceUrl(req.body?.url);
  if (!valid) {
    return res.status(400).json({ error: error || 'Invalid source URL' });
  }

  const formatId = typeof req.body?.formatId === 'string' ? req.body.formatId.trim() : 'best_720';
  const fileId = crypto.randomUUID();
  const outputTemplate = path.join(TEMP_DOWNLOAD_DIR, `${fileId}.%(ext)s`);

  console.log(`[Download] Starting job ${fileId} for ${url} (format: ${formatId})`);

  const args: string[] = [
    '--no-playlist',
    '--no-warnings',
    '--restrict-filenames',
    '--ffmpeg-location', FFMPEG_BIN,
    '--js-runtimes', `node:${process.execPath}`,
    '-o', outputTemplate,
  ];

  let targetExt = 'mp4';

  if (formatId === 'audio_mp3') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    targetExt = 'mp3';
  } else if (formatId === 'audio_m4a') {
    args.push('-x', '--audio-format', 'm4a');
    targetExt = 'm4a';
  } else if (formatId === 'best_1080') {
    args.push(
      '-f',
      'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
      '--merge-output-format',
      'mp4'
    );
    targetExt = 'mp4';
  } else if (formatId === 'best_720') {
    args.push(
      '-f',
      'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best',
      '--merge-output-format',
      'mp4'
    );
    targetExt = 'mp4';
  } else if (formatId === 'best_480') {
    args.push(
      '-f',
      'bestvideo[height<=480]+bestaudio/best[height<=480]/best',
      '--merge-output-format',
      'mp4'
    );
    targetExt = 'mp4';
  } else if (formatId === 'best_360') {
    args.push(
      '-f',
      'bestvideo[height<=360]+bestaudio/best[height<=360]/best',
      '--merge-output-format',
      'mp4'
    );
    targetExt = 'mp4';
  } else if (/^\d+$/.test(formatId)) {
    args.push('-f', `${formatId}+bestaudio/best`, '--merge-output-format', 'mp4');
    targetExt = 'mp4';
  } else {
    args.push('-f', 'best', '--merge-output-format', 'mp4');
    targetExt = 'mp4';
  }

  args.push('--', url);

  execFile(
    YTDLP_BIN,
    args,
    { maxBuffer: 15 * 1024 * 1024, timeout: 180000 },
    (err, stdout, stderr) => {
      if (err) {
        console.error(`[Download Error for ${fileId}]`, stderr || err.message);
        return res.status(500).json({
          error: `Download processing failed: ${(stderr || err.message).slice(0, 150)}`,
        });
      }

      // Find the generated file matching `${fileId}.*`
      try {
        const files = fs.readdirSync(TEMP_DOWNLOAD_DIR);
        const matched = files.find((f) => f.startsWith(fileId));

        if (!matched) {
          return res.status(500).json({ error: 'Downloaded file could not be located on server.' });
        }

        const fullPath = path.join(TEMP_DOWNLOAD_DIR, matched);
        const stat = fs.statSync(fullPath);
        const actualExt = path.extname(matched).replace(/^\./, '') || targetExt;

        // Try to get title or default
        const safeBaseName = (req.body?.title && typeof req.body.title === 'string')
          ? req.body.title
          : 'AniDownloader_Media';
        const friendlyFilename = sanitizeFilename(safeBaseName, actualExt);
        const mimeType = getMimeType(actualExt);

        const stored: StoredFile = {
          fileId,
          filePath: fullPath,
          filename: friendlyFilename,
          mimeType,
          filesize: stat.size,
          createdAt: Date.now(),
        };

        fileRegistry.set(fileId, stored);

        console.log(`[Download Complete] ${fileId} => ${friendlyFilename} (${stat.size} bytes)`);

        return res.json({
          downloadUrl: `/files/${fileId}`,
          filename: friendlyFilename,
          filesize: stat.size,
          mimeType,
        });
      } catch (findErr: any) {
        console.error('[File Discovery Error]', findErr);
        return res.status(500).json({ error: 'Failed to prepare downloaded file.' });
      }
    }
  );
});

// File streaming & download endpoint
app.get('/files/:fileId', (req: Request, res: Response) => {
  const fileId = req.params.fileId;
  const stored = fileRegistry.get(fileId);

  let filePath = '';
  let filename = 'download.mp4';
  let mimeType = 'video/mp4';
  let filesize = 0;

  if (stored && fs.existsSync(stored.filePath)) {
    filePath = stored.filePath;
    filename = stored.filename;
    mimeType = stored.mimeType;
    filesize = stored.filesize;
  } else {
    // Check if on disk
    const files = fs.existsSync(TEMP_DOWNLOAD_DIR) ? fs.readdirSync(TEMP_DOWNLOAD_DIR) : [];
    const matched = files.find((f) => f.startsWith(fileId));
    if (!matched) {
      return res.status(404).send('File not found or has expired.');
    }
    filePath = path.join(TEMP_DOWNLOAD_DIR, matched);
    const stat = fs.statSync(filePath);
    const ext = path.extname(matched).replace(/^\./, '');
    filename = `AniDownloader_${fileId}.${ext}`;
    mimeType = getMimeType(ext);
    filesize = stat.size;
  }

  // Handle Range requests (essential for mobile media streaming / seeking)
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : filesize - 1;

    if (start >= filesize) {
      res.status(416).header('Content-Range', `bytes */${filesize}`).send('Requested range not satisfiable');
      return;
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${filesize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': filesize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Frontend
// -------------------------------------------------------------
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AniDownloader] Server running on http://0.0.0.0:${PORT}`);
  });
}

setupFrontend().catch((err) => {
  console.error('[Fatal Server Startup Error]', err);
  process.exit(1);
});
