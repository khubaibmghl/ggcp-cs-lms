/**
 * IndexedDB Local File Vault for GGCP LMS
 * Eliminates browser localStorage 5MB quota limits by safely persisting large document blobs
 * (PDFs, Word docs) in browser IndexedDB (500 MB+ capacity).
 */

import { UploadedFile } from '@/types';

const DB_NAME = 'GGCP_LMS_VAULT';
const DB_VERSION = 1;
const STORE_NAME = 'file_blobs';

// In-memory fallback if IndexedDB is blocked in private/incognito mode
const memoryVault = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environments.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Save a base64 DataURL or binary string into IndexedDB
 */
export async function saveFileBlob(key: string, dataUrl: string): Promise<boolean> {
  if (!key || !dataUrl) return false;

  memoryVault.set(key, dataUrl);

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id: key, dataUrl, savedAt: Date.now() });

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(true); // memoryVault already has it
    });
  } catch (err) {
    console.warn('[LMS File Vault] IndexedDB write fallback to memory:', err);
    return true; // memory fallback successful
  }
}

/**
 * Retrieve a base64 DataURL from IndexedDB (or in-memory cache)
 */
export async function getFileBlob(key: string): Promise<string | null> {
  if (!key) return null;

  if (memoryVault.has(key)) {
    return memoryVault.get(key) || null;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result;
        if (result && result.dataUrl) {
          memoryVault.set(key, result.dataUrl);
          resolve(result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[LMS File Vault] IndexedDB read fallback:', err);
    return null;
  }
}

/**
 * Delete a file blob from IndexedDB
 */
export async function deleteFileBlob(key: string): Promise<boolean> {
  if (!key) return false;
  memoryVault.delete(key);

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Resolves a downloadable / viewable URL for any UploadedFile.
 * Seamlessly checks:
 * 1. Cloudinary / remote URL (file.url)
 * 2. In-memory dataUrl (file.dataUrl)
 * 3. IndexedDB local vault (file.fileKey)
 */
export async function resolveFileUrl(file?: UploadedFile | null): Promise<string> {
  if (!file) return '';

  if (file.url) return file.url;
  if (file.dataUrl) return file.dataUrl;

  if (file.fileKey) {
    const blob = await getFileBlob(file.fileKey);
    if (blob) return blob;
  }

  return '';
}

/**
 * Synchronous resolver for instant renders (e.g. <a> href)
 */
export function resolveSyncFileUrl(file?: UploadedFile | null): string {
  if (!file) return '';
  if (file.url) return file.url;
  if (file.dataUrl) return file.dataUrl;
  if (file.fileKey && memoryVault.has(file.fileKey)) {
    return memoryVault.get(file.fileKey) || '';
  }
  return '';
}

/**
 * Universal file downloader that handles dataUrls, Cloudinary remote URLs, and IndexedDB blobs.
 * Enforces correct original filename and extension across all cross-origin downloads.
 */
export async function downloadFileUrl(src: string, fileName: string): Promise<void> {
  if (!src) return;

  // Sanitize filename to ensure proper extension
  let safeFileName = fileName || 'document.pdf';
  if (!safeFileName.includes('.')) {
    if (src.includes('application/pdf') || src.includes('.pdf')) {
      safeFileName += '.pdf';
    } else if (src.includes('word') || src.includes('.docx')) {
      safeFileName += '.docx';
    } else {
      safeFileName += '.pdf';
    }
  }

  // 1. Base64 Data URL or local Object URL
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    let finalSrc = src;
    // If base64 data URL, convert to real Blob so Windows and browsers always recognize the file type
    if (src.startsWith('data:')) {
      try {
        const parts = src.split(';base64,');
        const contentType = parts[0].replace('data:', '') || (safeFileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
        const raw = window.atob(parts[1]);
        const uInt8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        finalSrc = URL.createObjectURL(blob);
        setTimeout(() => URL.revokeObjectURL(finalSrc), 60000);
      } catch {
        finalSrc = src;
      }
    }

    const a = document.createElement('a');
    a.href = finalSrc;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. Remote URL (e.g. Cloudinary, Supabase): Route via dedicated download API endpoint
  // to guarantee strict Content-Disposition, matching MIME type, and safe Windows extension
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const downloadEndpoint = `/api/download-submission?url=${encodeURIComponent(src)}&name=${encodeURIComponent(safeFileName)}`;
    const a = document.createElement('a');
    a.href = downloadEndpoint;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
}

/**
 * Universal file downloader that handles dataUrls, Cloudinary remote URLs, and IndexedDB blobs.
 * Enforces correct original filename and extension across all cross-origin downloads.
 */
export async function downloadUploadedFile(file: UploadedFile, fallbackName = 'solution_document.pdf'): Promise<void> {
  if (!file) return;

  const resolved = await resolveFileUrl(file);
  let fileName = file.name || fallbackName;

  const isWord = file.type?.includes('word') || file.type?.includes('officedocument') || file.type?.includes('msword') || fileName.endsWith('.docx') || fileName.endsWith('.doc');

  // Ensure fileName has proper extension
  if (!fileName.includes('.')) {
    fileName += isWord ? '.docx' : '.pdf';
  } else if (isWord && fileName.toLowerCase().endsWith('.pdf')) {
    fileName = fileName.replace(/\.pdf$/i, '.docx');
  }

  if (!resolved) {
    alert('The attached file data is no longer available on this device.');
    return;
  }

  await downloadFileUrl(resolved, fileName);
}
