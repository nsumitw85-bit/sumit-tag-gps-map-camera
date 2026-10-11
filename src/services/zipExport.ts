import JSZip from 'jszip';
import { PhotoRecord } from '../types';

export interface ZipBundleOptions {
  includeStamped?: boolean;
  includeOriginal?: boolean;
  includeCsvManifest?: boolean;
  includeJsonMetadata?: boolean;
  zipName?: string;
  onProgress?: (percent: number, currentItem?: string) => void;
}

export interface ZipBundleResult {
  blob: Blob;
  filename: string;
  totalStamped: number;
  totalOriginal: number;
  fileCount: number;
}

/**
 * Utility function using JSZip to bundle multiple photo records
 * (both original unwatermarked and stamped geotagged versions)
 * into a single structured ZIP file for batch export.
 */
export async function bundlePhotosToZip(
  photos: PhotoRecord[],
  options: ZipBundleOptions = {}
): Promise<ZipBundleResult> {
  const {
    includeStamped = true,
    includeOriginal = true,
    includeCsvManifest = true,
    includeJsonMetadata = true,
    zipName = `SumitTag_Batch_Export_${Date.now()}.zip`,
    onProgress,
  } = options;

  if (photos.length === 0) {
    throw new Error('No photographs provided for bundling.');
  }

  const zip = new JSZip();

  // Create organized subfolders matching municipal scoped-storage guidelines:
  // Root: Sumit_Tag_Export/
  //   ├── Stamped/
  //   ├── Original/
  //   ├── MUNICIPAL_GEOTAG_MANIFEST.csv
  //   └── photos_metadata.json
  const baseFolder = zip.folder('Sumit_Tag_Export') || zip;
  const stampedFolder = includeStamped ? baseFolder.folder('Stamped') : null;
  const originalFolder = includeOriginal ? baseFolder.folder('Original') : null;

  let totalStamped = 0;
  let totalOriginal = 0;

  // Prepare CSV audit manifest
  const csvHeaders = [
    'File Identifier',
    'Record ID',
    'Worker Name',
    'Worker ID',
    'Work Category',
    'Ward Number',
    'Area Name',
    'Latitude',
    'Longitude',
    'GPS Accuracy (m)',
    'Altitude (m)',
    'Capture Date (DD-MM-YYYY)',
    'Capture Time (HH:MM:SS TZ)',
    'Ward Verification Status',
    'Postal PIN Code',
    'Street / Locality Address',
    'Has Original Photo',
    'Has Stamped Photo',
    'Notes / Remarks',
  ];
  const csvRows: string[] = [csvHeaders.join(',')];

  const escapeCsv = (str: string | undefined | null) => {
    if (!str) return '""';
    return `"${String(str).replace(/"/g, '""')}"`;
  };

  const totalSteps = photos.length * 2;
  let currentStep = 0;

  // Process each selected photo record
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    // Standardized municipal file naming: [Ward]_[Worker]_[Category]_[Date]_[ID]
    const safeWard = photo.wardNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeWorker = photo.workerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeCategory = photo.workCategory.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = photo.formattedDate.replace(/[^0-9]/g, '');
    const shortId = photo.id.slice(-6);

    const baseName = `${safeWard}_${safeWorker}_${safeCategory}_${safeDate}_${shortId}`;

    // 1. Add Stamped Photograph (with location watermark)
    let stampedFileName: string | null = null;
    if (includeStamped && stampedFolder) {
      const dataUrl = photo.stampedImageDataUrl;
      if (dataUrl) {
        stampedFileName = `${baseName}_STAMPED.jpg`;
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        stampedFolder.file(stampedFileName, base64Data, { base64: true });
        totalStamped++;
      }
    }

    currentStep++;
    if (onProgress) {
      onProgress(Math.round((currentStep / totalSteps) * 50), `Processing stamped ${i + 1}/${photos.length}`);
    }

    // 2. Add Original Photograph (raw camera frame)
    let originalFileName: string | null = null;
    if (includeOriginal && originalFolder) {
      const originalUrl = photo.originalImageDataUrl;
      if (originalUrl) {
        originalFileName = `${baseName}_ORIGINAL.jpg`;
        const base64Data = originalUrl.includes(',') ? originalUrl.split(',')[1] : originalUrl;
        originalFolder.file(originalFileName, base64Data, { base64: true });
        totalOriginal++;
      }
    }

    currentStep++;
    if (onProgress) {
      onProgress(Math.round((currentStep / totalSteps) * 50), `Processing original ${i + 1}/${photos.length}`);
    }

    // 3. Add record row to CSV Manifest
    if (includeCsvManifest) {
      const row = [
        escapeCsv(baseName),
        escapeCsv(photo.id),
        escapeCsv(photo.workerName),
        escapeCsv(photo.workerId),
        escapeCsv(photo.workCategory),
        escapeCsv(photo.wardNumber),
        escapeCsv(photo.areaName || 'Not Available'),
        photo.latitude.toFixed(6),
        photo.longitude.toFixed(6),
        photo.gpsAccuracy,
        photo.altitude ?? 'N/A',
        escapeCsv(photo.formattedDate),
        escapeCsv(photo.formattedTime),
        escapeCsv(photo.wardVerificationMethod === 'boundary_verified' ? 'Boundary Verified' : 'Manually Selected'),
        escapeCsv(photo.address?.postcode || 'Not Available'),
        escapeCsv(photo.address?.formattedAddress || 'Not Available'),
        Boolean(photo.originalImageDataUrl) ? 'YES' : 'NO',
        Boolean(photo.stampedImageDataUrl) ? 'YES' : 'NO',
        escapeCsv(photo.notes || ''),
      ];
      csvRows.push(row.join(','));
    }
  }

  // 4. Add CSV Audit Manifest to root of ZIP
  if (includeCsvManifest) {
    baseFolder.file('MUNICIPAL_GEOTAG_MANIFEST.csv', csvRows.join('\r\n'));
  }

  // 5. Add Structured JSON Metadata for database restore or GIS integration
  if (includeJsonMetadata) {
    const metadataToExport = photos.map((p) => ({
      id: p.id,
      workerId: p.workerId,
      workerName: p.workerName,
      workCategory: p.workCategory,
      wardNumber: p.wardNumber,
      wardName: p.wardName,
      areaName: p.areaName,
      wardVerificationMethod: p.wardVerificationMethod,
      latitude: p.latitude,
      longitude: p.longitude,
      gpsAccuracy: p.gpsAccuracy,
      altitude: p.altitude,
      speed: p.speed,
      locationTimestamp: p.locationTimestamp,
      captureTimestamp: p.captureTimestamp,
      formattedDate: p.formattedDate,
      formattedTime: p.formattedTime,
      timezone: p.timezone,
      address: p.address,
      notes: p.notes,
      watermarkStyle: p.watermarkStyle,
      hasOriginalPhoto: Boolean(p.originalImageDataUrl),
      hasStampedPhoto: Boolean(p.stampedImageDataUrl),
    }));

    baseFolder.file('photos_metadata.json', JSON.stringify(metadataToExport, null, 2));
  }

  // 6. Generate ZIP file with DEFLATE compression
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        // metadata.percent is 0-100
        const overall = Math.round(50 + metadata.percent * 0.5);
        onProgress(overall, `Compressing ZIP archive (${Math.round(metadata.percent)}%)`);
      }
    }
  );

  return {
    blob,
    filename: zipName,
    totalStamped,
    totalOriginal,
    fileCount: totalStamped + totalOriginal + (includeCsvManifest ? 1 : 0) + (includeJsonMetadata ? 1 : 0),
  };
}

/**
 * Triggers browser download of bundled ZIP archive
 */
export async function exportPhotosAsZip(
  photos: PhotoRecord[],
  zipName: string = `SumitTag_Batch_Export_${Date.now()}.zip`,
  onProgress?: (progress: number, label?: string) => void,
  options?: Partial<ZipBundleOptions>
): Promise<ZipBundleResult> {
  const result = await bundlePhotosToZip(photos, {
    ...options,
    zipName,
    onProgress,
  });

  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return result;
}
