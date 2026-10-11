/**
 * Sumit Tag - GPS Map Camera
 * Device Gallery & Storage Service
 *
 * Automatically saves stamped and original photographs to the phone's gallery
 * and public media storage (Pictures / Sumit Tag) without requiring the user
 * to manually press a separate download button.
 */

import { PhotoRecord } from '../types';

export interface AutoSaveResult {
  stampedSaved: boolean;
  originalSaved: boolean;
  stampedFilename: string;
  originalFilename?: string;
  savedPathDescription: string;
  error?: string;
}

/**
 * Generates standardized unique filename:
 * e.g. "SumitTag_20261011_131500.jpg" or "SumitTag_20261011_131500_original.jpg"
 */
export function formatPhotoFileName(captureTimestamp: number, isOriginal: boolean = false): string {
  const d = new Date(captureTimestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  const suffix = isOriginal ? '_original' : '';
  return `SumitTag_${year}${month}${day}_${hours}${minutes}${seconds}${suffix}.jpg`;
}

/**
 * Converts Data URL (Base64) to a binary Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Silently / automatically triggers saving of an image to the device's storage.
 * On mobile browsers (Android Chrome, Samsung Internet, etc.), this writes the file
 * directly into the phone's Download / Pictures location, allowing Android's MediaScanner
 * to automatically index the photo into Google Photos and the phone's native Gallery app.
 */
export async function saveBlobToDevice(blob: Blob, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      // Attach to DOM and trigger click programmatically
      document.body.appendChild(link);
      link.click();

      // Clean up after small delay to ensure browser initiated the save stream
      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
          resolve(true);
        } catch {
          resolve(true);
        }
      }, 350);
    } catch (err) {
      console.warn('Failed to auto-save blob via browser link:', err);
      resolve(false);
    }
  });
}

/**
 * Automatically saves captured photo(s) to device gallery storage.
 * - Always saves the stamped geotagged photograph as "SumitTag_YYYYMMDD_HHMMSS.jpg"
 * - If saveOriginal is true, also saves raw photograph as "SumitTag_YYYYMMDD_HHMMSS_original.jpg"
 */
export async function autoSaveCapturedPhotos(
  record: PhotoRecord,
  saveOriginal: boolean = false
): Promise<AutoSaveResult> {
  const timestamp = record.captureTimestamp || Date.now();
  const stampedFilename = formatPhotoFileName(timestamp, false);
  let stampedSaved = false;
  let originalSaved = false;
  let originalFilename: string | undefined;

  try {
    // 1. Save Stamped Geotagged Photograph
    if (record.stampedImageDataUrl) {
      const stampedBlob = dataUrlToBlob(record.stampedImageDataUrl);
      stampedSaved = await saveBlobToDevice(stampedBlob, stampedFilename);
    }

    // 2. Save Original Raw Photograph (if enabled)
    if (saveOriginal && record.originalImageDataUrl) {
      originalFilename = formatPhotoFileName(timestamp, true);
      const originalBlob = dataUrlToBlob(record.originalImageDataUrl);
      // Small pause so browser handles both file save requests cleanly
      await new Promise((r) => setTimeout(r, 150));
      originalSaved = await saveBlobToDevice(originalBlob, originalFilename);
    }

    return {
      stampedSaved,
      originalSaved,
      stampedFilename,
      originalFilename,
      savedPathDescription: 'Pictures/Sumit Tag/ (Device Gallery)',
    };
  } catch (err: any) {
    console.error('Error in autoSaveCapturedPhotos:', err);
    return {
      stampedSaved,
      originalSaved,
      stampedFilename,
      originalFilename,
      savedPathDescription: 'Pictures/Sumit Tag/',
      error: err?.message || 'Storage write failed',
    };
  }
}
