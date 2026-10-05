import { getAccessToken, googleSignIn } from './firebaseAuth';

export interface DriveQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
  userName?: string;
  userEmail?: string;
  userPhoto?: string;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  webViewLink?: string;
  size?: string;
}

// Fetch user storage quota and profile from Google Drive
export async function getDriveStorageQuota(): Promise<DriveQuota | null> {
  let token = await getAccessToken();
  if (!token) {
    return null;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        // Token expired
        return null;
      }
      throw new Error(`Google Drive API error (${res.status})`);
    }

    const data = await res.json();
    return {
      limit: data.storageQuota?.limit,
      usage: data.storageQuota?.usage,
      usageInDrive: data.storageQuota?.usageInDrive,
      usageInDriveTrash: data.storageQuota?.usageInDriveTrash,
      userName: data.user?.displayName,
      userEmail: data.user?.emailAddress,
      userPhoto: data.user?.photoLink,
    };
  } catch (err) {
    console.error('Failed to get Drive storage quota:', err);
    return null;
  }
}

// Upload a downloaded media Blob directly to Google Drive
export async function uploadToGoogleDrive(
  fileBlob: Blob,
  filename: string,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<DriveUploadResult> {
  let token = await getAccessToken();
  if (!token) {
    // Attempt sign in if not currently authenticated
    const signinResult = await googleSignIn();
    if (!signinResult?.accessToken) {
      throw new Error('Google Drive authorization required.');
    }
    token = signinResult.accessToken;
  }

  // Create multipart/related request for Google Drive v3
  const boundary = '-------AniDownloaderBoundary' + Math.random().toString(36).substring(2);
  const metadata = {
    name: filename,
    description: 'Saved via AniDownloader PWA',
    mimeType: mimeType || 'video/mp4',
  };

  const metadataPart =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    '\r\n';

  const mediaPartHeader =
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType || 'video/mp4'}\r\n\r\n`;

  const closingPart = `\r\n--${boundary}--`;

  const metadataBuffer = new TextEncoder().encode(metadataPart);
  const mediaHeaderBuffer = new TextEncoder().encode(mediaPartHeader);
  const closingBuffer = new TextEncoder().encode(closingPart);

  const multipartBody = new Blob(
    [metadataBuffer, mediaHeaderBuffer, fileBlob, closingBuffer],
    { type: `multipart/related; boundary=${boundary}` }
  );

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size'
    );
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({
            fileId: res.id,
            name: res.name,
            webViewLink: res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`,
            size: res.size,
          });
        } catch (e) {
          reject(new Error('Failed to parse Google Drive response.'));
        }
      } else {
        let errDesc = `Drive upload failed with status ${xhr.status}`;
        try {
          const parsedErr = JSON.parse(xhr.responseText);
          if (parsedErr.error?.message) {
            errDesc = parsedErr.error.message;
          }
        } catch {}
        reject(new Error(errDesc));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading to Google Drive.'));
    };

    xhr.send(multipartBody);
  });
}
