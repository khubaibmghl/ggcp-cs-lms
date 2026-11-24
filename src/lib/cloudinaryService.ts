/**
 * Cloudinary 25 GB Free Cloud Storage Service
 * Handles direct, secure client-side uploads of student assignment files
 * (handwritten photos, PDFs, ZIPs) to Cloudinary's 25 GB free media bucket.
 */

export interface CloudinaryUploadResult {
  url: string;
  bytes: number;
  format?: string;
  publicId?: string;
  isCloudinary: boolean;
}

export function isCloudinaryConfigured(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  );
}

export async function uploadFileToCloudinary(
  fileDataUrl: string,
  fileName: string
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Fallback: If Cloudinary keys are not yet provided in Vercel/.env,
  // do not return a multi-megabyte dataUrl as url; return empty url so local storage stays lightweight.
  if (!cloudName || !uploadPreset) {
    const approxBytes = Math.round((fileDataUrl.length * 3) / 4);
    return {
      url: '',
      bytes: approxBytes,
      isCloudinary: false,
    };
  }

  try {
    const isDoc =
      fileName.toLowerCase().endsWith('.pdf') ||
      fileName.toLowerCase().endsWith('.docx') ||
      fileName.toLowerCase().endsWith('.doc') ||
      fileDataUrl.startsWith('data:application/pdf') ||
      fileDataUrl.startsWith('data:application/msword') ||
      fileDataUrl.startsWith('data:application/vnd.openxmlformats');

    const endpoint = isDoc
      ? `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`
      : `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const formData = new FormData();
    formData.append('file', fileDataUrl);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'ggcp_lms/submissions');

    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      console.warn('Cloudinary upload warning:', errJson);
      // Fallback: Return empty url so callers know cloud upload didn't succeed and use IndexedDB
      const approxBytes = Math.round((fileDataUrl.length * 3) / 4);
      return {
        url: '',
        bytes: approxBytes,
        isCloudinary: false,
      };
    }

    const data = await res.json();
    return {
      url: data.secure_url || data.url,
      bytes: data.bytes || Math.round((fileDataUrl.length * 3) / 4),
      format: data.format,
      publicId: data.public_id,
      isCloudinary: true,
    };
  } catch (err) {
    console.warn('Cloudinary upload network error, using local fallback:', err);
    const approxBytes = Math.round((fileDataUrl.length * 3) / 4);
    return {
      url: '',
      bytes: approxBytes,
      isCloudinary: false,
    };
  }
}
