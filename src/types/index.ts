export type Language = 'en' | 'mr' | 'hi';

export type UserRole = 'worker' | 'supervisor' | 'admin';

export type WatermarkStyle = 'detailed' | 'compact' | 'map' | 'custom' | 'municipal_standard';

export type WardVerificationMethod =
  | 'boundary_verified'
  | 'proximity_verified'
  | 'locality_matched'
  | 'manually_selected'
  | 'unassigned';

export type AddressStatus =
  | 'Resolving Address'
  | 'Address Resolved'
  | 'Address Unavailable'
  | 'Address Verification Failed';

export type PinCodeStatus =
  | 'PIN Code Verified'
  | 'PIN Code Unverified'
  | 'PIN Code Unavailable';

export interface AddressInfo {
  country?: string;
  state?: string;
  district?: string;
  taluka?: string; // Sub-district / Taluka / Tehsil (e.g. Tivsa, Amravati)
  city?: string;
  villageOrTown?: string;
  locality?: string;
  subLocality?: string;
  road?: string;
  postcode?: string; // Verified or raw postal PIN code
  rawPostcode?: string;
  formattedAddress: string;
  isResolved: boolean;
  addressStatus: AddressStatus;
  pinCodeStatus: PinCodeStatus;
  pinCodeSource?: 'india_post_verified' | 'geocoder_verified' | 'unverified';
  resolvedAt?: string;
  requestId?: string;
  geocodingProvider?: string;
}

export type GpsStatus =
  | 'GPS Ready'
  | 'Acquiring GPS...'
  | 'GPS Accuracy Low'
  | 'Location Permission Required'
  | 'Location Unavailable';

export interface GpsData {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number; // epoch ms
  isStale: boolean;
  ageSeconds: number;
  isReady?: boolean;
  status?: GpsStatus;
  provider?: string; // 'FusedLocationProviderClient' | 'GPS Provider' | 'Network Provider'
  verificationStatus?: 'verified_realtime' | 'low_accuracy' | 'stale_rejected' | 'unverified';
}

export interface Ward {
  id: string;
  wardNumber: string; // e.g. "Ward 05"
  wardName: string;   // e.g. "Shivaji Ward"
  areaName: string;   // e.g. "Civil Lines"
  pinCode: string;
  district?: string;  // e.g. "Amravati"
  state?: string;     // e.g. "Maharashtra"
  notes?: string;
  boundaryGeoJson?: string; // GeoJSON Polygon or MultiPolygon string
  coordinatesCount?: number;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  pinCodes?: string[];
  localityKeywords?: string[];
}

export interface Worker {
  id: string;
  workerId: string; // e.g. "ST-WRK-104"
  fullName: string;
  mobile?: string;
  designation: string; // e.g. "Sanitation Worker", "Mukadam / Supervisor"
  wardId?: string;
  wardNumber?: string;
  workCategory: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface WorkCategory {
  id: string;
  nameEn: string;
  nameMr: string;
  nameHi: string;
  code: string;
}

export interface PhotoRecord {
  id: string; // UUID
  workerId: string;
  workerName: string;
  workCategory: string;
  wardNumber: string;
  wardName?: string;
  areaName?: string;
  district?: string;
  taluka?: string;
  villageOrTown?: string;
  state?: string;
  pinCode?: string;
  addressStatus?: AddressStatus;
  pinCodeStatus?: PinCodeStatus;
  wardVerificationMethod: WardVerificationMethod;
  locationProvider?: string;
  locationVerificationStatus?: 'verified_realtime' | 'low_accuracy' | 'stale_rejected' | 'unverified';
  latitude: number;
  longitude: number;
  gpsAccuracy: number;
  altitude?: number | null;
  speed?: number | null;
  locationTimestamp: number;
  captureTimestamp: number;
  formattedDate: string; // DD-MM-YYYY
  formattedTime: string; // HH:MM:SS
  timezone: string;
  address: AddressInfo;
  watermarkStyle: WatermarkStyle;
  originalImageDataUrl?: string; // Stored in IndexedDB or memory
  stampedImageDataUrl: string;   // Geotagged with watermark
  notes?: string;
  storagePathOriginal?: string;
  storagePathStamped?: string;
  fileSizeKb?: number;
  syncedToCloud?: boolean;
  autoSavedToGallery?: boolean;
  deviceSavedFilename?: string;
  deviceSavedOriginalFilename?: string;
}

export interface AppSettings {
  language: Language;
  currentRole: UserRole;
  gpsAccuracyThreshold: number; // e.g. 20 (meters)
  watermarkStyle: WatermarkStyle;
  watermarkFontSize: 'small' | 'medium' | 'large';
  watermarkOpacity: number; // 0.6 to 1.0
  watermarkPosition: 'bottom' | 'top';
  defaultWorkCategoryId: string;
  defaultWardId: string;
  activeWorkerId: string;
  saveOriginalPhoto: boolean;
  saveStampedPhoto: boolean;
  autoSaveToGallery: boolean; // Automatically save to phone's native gallery / storage
  photoQuality: 'standard' | 'high';
  enableGrid: boolean;
  enableSound: boolean;
  // Photo Stamp Visibility Settings (Group D)
  showCoordinates: boolean;
  showAddress: boolean;
  showPinCode: boolean;
  showWardNumber: boolean;
  showDateTime: boolean;
  showMapPreview: boolean;
  // Camera Settings (Group B)
  cameraFlash: 'auto' | 'on' | 'off';
  cameraFacing: 'environment' | 'user';
}
