# AniDownloader — Mobile-First Video & Audio PWA

AniDownloader is a production-quality Progressive Web App (PWA) with native Android Share Sheet integration, powered by a high-performance Node.js backend using **yt-dlp** and **FFmpeg**, and integrated with **Google Drive (Workspace OAuth)** for instant cloud backup.

---

## 1. Complete Project Structure

```
├── .env.example                # Runtime environment template
├── .gitignore
├── firebase-applet-config.json # Firebase client configuration (OAuth & Auth)
├── index.html                  # HTML entry point with PWA meta, themes, and icons
├── metadata.json               # Applet metadata
├── package.json                # Project dependencies and full-stack scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite + Tailwind + VitePWA configuration
├── server.ts                   # Full-stack Express backend (yt-dlp, FFmpeg, API & Vite middleware)
├── bin/
│   └── yt-dlp                  # Standalone executable yt-dlp binary
├── public/
│   ├── icon.svg                # High-contrast 3D vector brand icon
│   ├── pwa-192x192.png         # Standard 192px Android home screen icon
│   ├── pwa-512x512.png         # Standard 512px splash screen icon
│   ├── pwa-maskable-512x512.png# Maskable icon with 15% safe padding
│   ├── apple-touch-icon.png    # iOS Safari 180px touch icon
│   ├── manifest.webmanifest    # Web App Manifest with Web Share Target API
│   └── service-worker.js       # Offline cache & asset pre-cacher
├── scripts/
│   └── generate-png-icons.cjs  # Programmatic PNG generator utility
└── src/
    ├── App.tsx                 # Main application controller with tab navigation
    ├── index.css               # 3D OriginOS/iOS glassmorphism & Google styling
    ├── main.tsx                # React entry point with service worker registration
    ├── types/
    │   └── index.ts            # Type definitions for formats, metadata, history, settings
    ├── hooks/
    │   ├── useOnlineStatus.ts  # Network connectivity detector
    │   ├── usePWAInstall.ts    # In-app PWA install trigger & iOS guide
    │   └── useShareTarget.ts   # Android Share Sheet URL extractor
    ├── services/
    │   ├── firebaseAuth.ts     # Firebase Auth with in-memory Google Workspace OAuth token
    │   └── googleDrive.ts      # Google Drive API v3 upload & storage quota client
    └── components/
        ├── Header.tsx          # Top navigation bar with logo, install button, account
        ├── Navbar.tsx          # Bottom floating navigation bar
        ├── HomeView.tsx        # Ready to Download card, Android share flow, URL input
        ├── QualityView.tsx     # Thumbnail, video info, format options (1080p, 720p, MP3)
        ├── DownloadHistoryView.tsx # History list with media playback & Drive sync
        ├── GoogleDriveView.tsx # Google Drive storage quota & cloud files manager
        ├── SettingsView.tsx    # Backend diagnostics, theme, layout & PWA guide
        └── MediaPreviewModal.tsx # In-app audio and video player
```

---

## 2. Exact Installation Commands

To run locally or inside a fresh container:

```bash
# 1. Install Node.js dependencies
npm install

# 2. Download and prepare yt-dlp executable
mkdir -p bin
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
chmod +x bin/yt-dlp

# 3. Ensure FFmpeg is installed on your OS
# Ubuntu/Debian:
sudo apt-get update && sudo apt-get install -y ffmpeg

# 4. Start the full-stack application (frontend + backend on port 3000)
npm run dev
```

---

## 3. Backend Deployment Instructions (Free-Tier Compatible)

AniDownloader's backend is fully self-contained in `server.ts` and requires **Node.js 18+**, **FFmpeg**, and **yt-dlp**.

### A. Deploy to Google Cloud Run (Recommended & Free Tier Eligible)

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-bullseye-slim

# Install FFmpeg and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download latest standalone yt-dlp
RUN mkdir -p /app/bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /app/bin/yt-dlp && \
    chmod a+rx /app/bin/yt-dlp

# Copy package manifests and install
COPY package*.json ./
RUN npm ci

# Copy source code and build frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
```

Deploy with gcloud:

```bash
gcloud run deploy anidownloader \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### B. Deploy to Render / Railway / Fly.io

1. Connect your repository.
2. Select **Docker** environment or Node environment with FFmpeg buildpack (`https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git`).
3. Build Command: `npm install && npm run build`
4. Start Command: `npx tsx server.ts`

---

## 4. Setting the Frontend API URL

By default, AniDownloader operates as a unified full-stack application where the frontend and backend share the same origin (`/api/analyze`, `/api/download`, `/files/:fileId`).

If you host the backend on a separate domain (e.g. `https://api.my-anidownloader.com`), set the environment variable in your frontend:

```env
VITE_API_URL=https://api.my-anidownloader.com
```

AniDownloader will automatically route requests to the remote backend while honoring CORS.

---

## 5. PWA Installation Instructions for Android

1. Open AniDownloader in **Google Chrome** on your Android phone.
2. An **Install App** button will appear in the top header. Tap it, or tap the three dots (`⋮`) in Chrome and select **Install app** (or **Add to Home screen**).
3. The app is installed as a native-like Android standalone application.
4. **Using the Share Sheet Flow**:
   - Open YouTube or Instagram.
   - Open any public video, Short, or Reel.
   - Tap the **Share** button.
   - Select **AniDownloader** from the Android system share sheet.
   - AniDownloader will launch automatically, receive the URL, query metadata from yt-dlp, and present available video & audio formats.

---

## 6. HTTPS Requirements Explained

| Feature | Requires HTTPS? | Explanation |
|---|---|---|
| **Service Worker & PWA Install** | **Yes** (Strict) | Modern browsers (Chrome, Edge, Safari) only register Service Workers and permit PWA home screen installation over secure HTTPS connections (or `http://localhost` during local development). |
| **Web Share Target API** | **Yes** | Android only exposes Web Share Target capabilities for PWAs delivered over verified HTTPS. |
| **Google Workspace OAuth** | **Yes** | Google Identity Services and Firebase Auth require HTTPS origins for authorization callbacks. |
| **File System Access API** | **Yes** | `showSaveFilePicker()` is a secure-context API only available under HTTPS. |

---

## 7. Android Browser Filesystem Limitations

### Why can't a PWA silently save to `/Download/AniDownloader/`?
For security and user privacy, modern mobile browsers (including Android Chrome and WebKit) operate in a **strict web sandbox**:
1. Web applications and PWAs **do not** have arbitrary native file-system access to Android's storage volumes without explicit user interaction.
2. When a file is downloaded via a PWA:
   - The browser's native download manager intercepts the file stream and routes it to the device's default **Downloads** directory (`/storage/emulated/0/Download/`).
   - The browser displays standard download progress notifications in the Android notification shade.
3. If the browser supports the **File System Access API** (`showSaveFilePicker()`), AniDownloader allows the user to explicitly select a target folder or name.
4. If you need cloud backup independent of local device storage, AniDownloader includes direct **Google Drive** integration to stream and save files straight to your Google Drive account!
