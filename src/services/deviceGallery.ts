/**
 * Sumit Tag - GPS Map Camera
 * Device Gallery & Storage Service
 *
 * Automatically saves stamped and original photographs to the phone's gallery
 * and public media storage (Pictures / Sumit Tag) without requiring the user
 * to manually press a separate download button.
 *
 * Powered by Android MediaStore Scoped Storage architecture (MediaStore.Images.Media).
 */

import { PhotoRecord } from '../types';
import {
  MediaStore,
  savePhotoRecordToMediaStore,
  formatMediaStoreFileName,
  toImageBlob,
  updateGalleryScanIndices,
  SaveToMediaStoreOptions,
  MediaStoreSaveResult,
  PhotoRecordSaveResult,
  GalleryScanIndexResult,
} from './imageSaver';

// Re-export MediaStore APIs for consumer components
export {
  MediaStore,
  savePhotoRecordToMediaStore,
  formatMediaStoreFileName,
  toImageBlob,
  updateGalleryScanIndices,
};
export type {
  SaveToMediaStoreOptions,
  MediaStoreSaveResult,
  PhotoRecordSaveResult,
  GalleryScanIndexResult,
};

export interface AutoSaveResult {
  stampedSaved: boolean;
  originalSaved: boolean;
  stampedFilename: string;
  originalFilename?: string;
  savedPathDescription: string;
  isPending?: 0 | 1;
  scanIndexed?: boolean;
  error?: string;
}

/**
 * Standardized unique filename generator
 */
export function formatPhotoFileName(captureTimestamp: number, isOriginal: boolean = false): string {
  return formatMediaStoreFileName(captureTimestamp, isOriginal);
}

/**
 * Converts Data URL (Base64) to a binary Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  return toImageBlob(dataUrl, MediaStore.Images.Media.DEFAULT_MIME_TYPE);
}

/**
 * Automatically saves captured photo(s) to device gallery storage using MediaStore.Images.Media.
 * - Marks IS_PENDING = 1 during the writing phase
 * - Streams JPEG bytes into "Pictures/Sumit Tag/"
 * - Transitions IS_PENDING = 0 upon completion
 * - Triggers Gallery scan index update to make photos immediately visible in Gallery / Google Photos
 */
export async function autoSaveCapturedPhotos(
  record: PhotoRecord,
  saveOriginal: boolean = false
): Promise<AutoSaveResult> {
  const result = await savePhotoRecordToMediaStore(record, saveOriginal);

  return {
    stampedSaved: result.stampedResult.success,
    originalSaved: result.originalResult ? result.originalResult.success : false,
    stampedFilename: result.stampedResult.fileName,
    originalFilename: result.originalResult?.fileName,
    savedPathDescription: `${MediaStore.Images.Media.RELATIVE_DIRECTORY} (${MediaStore.Images.Media.ALBUM_NAME})`,
    isPending: result.stampedResult.isPending,
    scanIndexed: result.stampedResult.scanIndexed,
    error: result.stampedResult.error || result.originalResult?.error,
  };
}
