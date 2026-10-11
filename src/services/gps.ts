import { AddressInfo, GpsData, GpsStatus, Ward, WardVerificationMethod } from '../types';

export interface LocationClientOptions {
  accuracyThreshold?: number;
  maxLocationAgeSeconds?: number;
  initialBackoffDelayMs?: number;
  maxBackoffDelayMs?: number;
  backoffMultiplier?: number;
}

/**
 * FusedLocationProviderClient
 *
 * Implements Android-grade high-accuracy location tracking with:
 * 1. Strict freshness verification (age < 30 seconds). Stale fixes are never marked as 'GPS Ready'.
 * 2. Accuracy threshold enforcement (accuracy <= gpsAccuracyThreshold). Inaccurate fixes are flagged as 'GPS Accuracy Low'.
 * 3. Exponential backoff retry mechanism with jitter for location unavailability, satellite acquisition delays, and timeouts.
 */
export class FusedLocationProviderClient {
  private watchId: number | null = null;
  private currentGps: GpsData | null = null;
  private listeners: ((gps: GpsData | null, error?: string | null) => void)[] = [];
  private lastError: string | null = null;
  private currentStatus: GpsStatus = 'Acquiring GPS...';

  // Strict thresholds
  private accuracyThreshold: number = 20; // Default: 20 meters
  private readonly maxLocationAgeSeconds: number = 30; // Max allowable age: 30 seconds

  // Exponential backoff configuration
  private retryAttempt: number = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly initialBackoffDelayMs: number = 1000; // 1s
  private readonly maxBackoffDelayMs: number = 30000; // 30s max backoff
  private readonly backoffMultiplier: number = 2; // 1s, 2s, 4s, 8s, 16s, 30s
  private isWatching: boolean = false;

  constructor(options?: LocationClientOptions) {
    if (options?.accuracyThreshold !== undefined) {
      this.accuracyThreshold = options.accuracyThreshold;
    }
  }

  /**
   * Set the maximum acceptable GPS accuracy in meters.
   * Updates current GPS readiness immediately.
   */
  public setAccuracyThreshold(meters: number): void {
    this.accuracyThreshold = Math.max(1, meters);
    if (this.currentGps) {
      this.recalculateReadiness(this.currentGps);
      if (this.currentGps.isReady) {
        this.currentStatus = 'GPS Ready';
        this.lastError = null;
        this.resetBackoff();
      } else {
        this.currentStatus = this.currentGps.status || 'GPS Accuracy Low';
      }
      this.notify(this.currentGps, this.lastError);
    }
  }

  public getAccuracyThreshold(): number {
    return this.accuracyThreshold;
  }

  public getStatus(): GpsStatus {
    return this.currentStatus;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getRetryAttempt(): number {
    return this.retryAttempt;
  }

  /**
   * Returns the last location fix.
   * If requireFreshAndAccurate is true, ONLY returns locations that are:
   * 1. Fresh (age < 30 seconds)
   * 2. Within the accuracy threshold (accuracy <= gpsAccuracyThreshold)
   * Returns null if no valid fresh location is available.
   */
  public getLastLocation(requireFreshAndAccurate: boolean = true): GpsData | null {
    if (!this.currentGps) return null;

    this.recalculateReadiness(this.currentGps);

    if (requireFreshAndAccurate) {
      if (
        this.currentGps.isStale ||
        this.currentGps.ageSeconds >= this.maxLocationAgeSeconds ||
        !this.currentGps.isReady ||
        this.currentGps.accuracy > this.accuracyThreshold
      ) {
        return null;
      }
    }

    return this.currentGps;
  }

  /**
   * Begin location updates and register a listener.
   */
  public requestLocationUpdates(
    onUpdate?: (gps: GpsData | null, error?: string | null) => void,
    options?: { accuracyThreshold?: number }
  ): void {
    if (options?.accuracyThreshold) {
      this.accuracyThreshold = options.accuracyThreshold;
    }

    if (onUpdate && !this.listeners.includes(onUpdate)) {
      this.listeners.push(onUpdate);
      if (this.currentGps || this.lastError) {
        onUpdate(this.currentGps, this.lastError);
      }
    }

    if (this.isWatching) return;

    if (!('geolocation' in navigator)) {
      this.lastError = 'Geolocation API is not supported by this device or browser.';
      this.currentStatus = 'Location Unavailable';
      this.notify(null, this.lastError);
      return;
    }

    this.isWatching = true;
    this.currentStatus = 'Acquiring GPS...';

    // Start with an immediate fresh location fix request
    this.requestFreshFix();

    // Start continuous hardware watch
    const watchOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0, // Force fresh satellite readings, bypass browser cache
    };

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handleSuccess(pos),
        (err) => this.handleError(err),
        watchOptions
      );
    } catch (e: any) {
      this.handleError({
        code: 2,
        message: e?.message || 'Failed to start geolocation watch',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    }
  }

  /**
   * Stop watching location and clear backoff retries.
   */
  public removeLocationUpdates(callback?: (gps: GpsData | null, error?: string | null) => void): void {
    if (callback) {
      this.listeners = this.listeners.filter((l) => l !== callback);
      if (this.listeners.length > 0) return;
    }

    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.clearRetryTimer();
    this.isWatching = false;
    this.listeners = [];
  }

  /**
   * Actively requests a fresh GPS position from the hardware.
   * Resolves only when fresh (age < 30s) and accurate (accuracy <= threshold).
   */
  public getCurrentLocation(options?: {
    timeout?: number;
    accuracyThreshold?: number;
    maxAgeSeconds?: number;
  }): Promise<GpsData> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        const err = new Error('Geolocation API not supported');
        this.lastError = err.message;
        this.currentStatus = 'Location Unavailable';
        reject(err);
        return;
      }

      const threshold = options?.accuracyThreshold ?? this.accuracyThreshold;
      const maxAge = options?.maxAgeSeconds ?? this.maxLocationAgeSeconds;
      const timeoutMs = options?.timeout ?? 12000;

      const posOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 1. Strict validation of location data sufficiency
          if (
            !position ||
            !position.coords ||
            typeof position.coords.latitude !== 'number' ||
            isNaN(position.coords.latitude) ||
            typeof position.coords.longitude !== 'number' ||
            isNaN(position.coords.longitude) ||
            typeof position.coords.accuracy !== 'number' ||
            isNaN(position.coords.accuracy) ||
            position.coords.accuracy <= 0
          ) {
            const insufficientMsg = 'Insufficient location data returned by location services.';
            this.scheduleBackoffRetry(insufficientMsg, 'Location Unavailable');
            reject(new Error(insufficientMsg));
            return;
          }

          const now = Date.now();
          const ageSeconds = Math.max(0, Math.round((now - position.timestamp) / 1000));
          const accuracy = Math.round(position.coords.accuracy * 10) / 10;
          const isFresh = ageSeconds < maxAge;
          const isStale = !isFresh;
          const isAccurate = accuracy <= threshold;

          const gpsData = this.buildGpsData(position, ageSeconds, isStale, isAccurate);
          this.currentGps = gpsData;

          if (isStale) {
            const staleMsg = `GPS fix is stale (${ageSeconds}s old, required < ${maxAge}s).`;
            this.scheduleBackoffRetry(staleMsg, 'Acquiring GPS...');
            reject(new Error(staleMsg));
            return;
          }

          if (!isAccurate) {
            const accMsg = `GPS accuracy (±${Math.round(accuracy)}m) exceeds threshold of ±${threshold}m.`;
            this.scheduleBackoffRetry(accMsg, 'GPS Accuracy Low');
            reject(new Error(accMsg));
            return;
          }

          // Valid fresh (<30s) and accurate fix: ONLY now update state to 'GPS Ready'
          this.resetBackoff();
          this.lastError = null;
          this.currentStatus = 'GPS Ready';
          this.notify(gpsData, null);
          resolve(gpsData);
        },
        (error) => {
          this.handleError(error);
          reject(new Error(this.lastError || error.message));
        },
        posOptions
      );
    });
  }

  // ==========================================================
  // INTERNAL HANDLERS & VALIDATORS
  // ==========================================================

  private requestFreshFix(): void {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => this.handleSuccess(pos),
      (err) => this.handleError(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  private handleSuccess(position: GeolocationPosition): void {
    // 1. Strict validation of location data sufficiency
    if (
      !position ||
      !position.coords ||
      typeof position.coords.latitude !== 'number' ||
      isNaN(position.coords.latitude) ||
      typeof position.coords.longitude !== 'number' ||
      isNaN(position.coords.longitude) ||
      typeof position.coords.accuracy !== 'number' ||
      isNaN(position.coords.accuracy) ||
      position.coords.accuracy <= 0 ||
      (position.coords.latitude === 0 && position.coords.longitude === 0)
    ) {
      const msg = 'Location services returned insufficient coordinate data.';
      this.scheduleBackoffRetry(msg, 'Location Unavailable');
      return;
    }

    const now = Date.now();
    const rawAgeMs = now - position.timestamp;
    const ageSeconds = Math.max(0, Math.round(rawAgeMs / 1000));
    const accuracy = Math.round(position.coords.accuracy * 10) / 10;

    // Strict checks: age must be strictly < 30 seconds, accuracy must meet configured threshold
    const isFresh = ageSeconds < this.maxLocationAgeSeconds;
    const isStale = !isFresh;
    const isAccurate = accuracy <= this.accuracyThreshold;

    const gpsData = this.buildGpsData(position, ageSeconds, isStale, isAccurate);
    this.currentGps = gpsData;

    // 2. Strict location age check: Stale fix (age >= 30s) -> apply exponential backoff retry
    if (isStale) {
      const msg = `Location fix is stale (${ageSeconds}s old, required < 30s). Acquiring fresh satellite fix...`;
      this.scheduleBackoffRetry(msg, 'Acquiring GPS...');
      return;
    }

    // 3. Strict accuracy check: Accuracy > threshold -> apply exponential backoff retry
    if (!isAccurate) {
      const msg = `GPS Accuracy Low (±${Math.round(accuracy)}m exceeds configured threshold of ±${this.accuracyThreshold}m). Please move to an open area.`;
      this.scheduleBackoffRetry(msg, 'GPS Accuracy Low');
      return;
    }

    // 4. Strict checks passed: Location fix is fresh (age < 30s) AND accurate (accuracy <= threshold)
    // ONLY now update state to 'GPS Ready'
    this.currentStatus = 'GPS Ready';
    this.lastError = null;
    this.resetBackoff();
    this.notify(gpsData, null);
  }

  private handleError(error: GeolocationPositionError): void {
    let msg = 'Unable to acquire GPS location.';
    let isFatalPermission = false;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.currentStatus = 'Location Permission Required';
        msg = 'Location permission was denied. Please allow location access in your device settings.';
        isFatalPermission = true;
        break;

      case error.POSITION_UNAVAILABLE:
        this.currentStatus = 'Location Unavailable';
        msg = 'GPS signal unavailable. Please move outdoors or enable device high-accuracy location.';
        break;

      case error.TIMEOUT:
        this.currentStatus = 'Location Unavailable';
        msg = 'GPS acquisition timed out while searching for satellites.';
        break;

      default:
        this.currentStatus = 'Location Unavailable';
        msg = error.message || 'GPS location error.';
    }

    if (isFatalPermission) {
      this.resetBackoff();
      this.lastError = msg;
      this.notify(this.currentGps, msg);
      return;
    }

    // Execute retry with exponential backoff
    this.scheduleBackoffRetry(msg, 'Location Unavailable');
  }

  /**
   * Schedules a retry with exponential backoff and jitter.
   */
  private scheduleBackoffRetry(
    baseMsg: string,
    targetStatus: GpsStatus = 'Location Unavailable'
  ): void {
    this.clearRetryTimer();
    this.retryAttempt++;

    // Calculate exponential delay: 1s, 2s, 4s, 8s, 16s, max 30s
    const exponentialMultiplier = Math.pow(this.backoffMultiplier, this.retryAttempt - 1);
    const baseDelay = Math.min(this.initialBackoffDelayMs * exponentialMultiplier, this.maxBackoffDelayMs);

    // Add 15% random jitter to avoid lockstep retry storms
    const jitter = Math.floor(Math.random() * (baseDelay * 0.15));
    const delayMs = baseDelay + jitter;
    const delaySec = (delayMs / 1000).toFixed(1);

    const retryMsg = `${baseMsg} Retrying in ${delaySec}s (attempt #${this.retryAttempt})...`;
    this.lastError = retryMsg;
    this.currentStatus = targetStatus;

    // Update state of current fix if it exists: ensure isReady is NEVER true when data is insufficient
    if (this.currentGps) {
      this.currentGps = {
        ...this.currentGps,
        isReady: false,
        status: targetStatus,
        verificationStatus: targetStatus === 'GPS Accuracy Low' ? 'low_accuracy' : 'stale_rejected',
      };
    }

    this.notify(this.currentGps, retryMsg);

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (this.isWatching) {
        this.requestFreshFix();
      }
    }, delayMs);
  }

  private resetBackoff(): void {
    this.retryAttempt = 0;
    this.clearRetryTimer();
  }

  private clearRetryTimer(): void {
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private recalculateReadiness(gps: GpsData): void {
    const now = Date.now();
    const ageSeconds = Math.max(0, Math.round((now - gps.timestamp) / 1000));
    gps.ageSeconds = ageSeconds;
    // Strict freshness check: age < 30 seconds
    gps.isStale = ageSeconds >= this.maxLocationAgeSeconds;

    const isAccurate =
      typeof gps.accuracy === 'number' &&
      !isNaN(gps.accuracy) &&
      gps.accuracy > 0 &&
      gps.accuracy <= this.accuracyThreshold;

    if (gps.isStale) {
      gps.isReady = false;
      gps.status = 'Acquiring GPS...';
      gps.verificationStatus = 'stale_rejected';
    } else if (!isAccurate) {
      gps.isReady = false;
      gps.status = 'GPS Accuracy Low';
      gps.verificationStatus = 'low_accuracy';
    } else {
      gps.isReady = true;
      gps.status = 'GPS Ready';
      gps.verificationStatus = 'verified_realtime';
    }
  }

  private buildGpsData(
    position: GeolocationPosition,
    ageSeconds: number,
    isStale: boolean,
    isAccurate: boolean
  ): GpsData {
    const isReady = !isStale && isAccurate;
    let status: GpsStatus = 'GPS Ready';
    if (isStale) status = 'Acquiring GPS...';
    else if (!isAccurate) status = 'GPS Accuracy Low';

    const verificationStatus = isReady
      ? 'verified_realtime'
      : isStale
      ? 'stale_rejected'
      : 'low_accuracy';

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: Math.round(position.coords.accuracy * 10) / 10,
      altitude: position.coords.altitude !== null ? Math.round(position.coords.altitude * 10) / 10 : null,
      speed: position.coords.speed !== null ? Math.round(position.coords.speed * 10) / 10 : null,
      heading: position.coords.heading,
      timestamp: position.timestamp,
      isStale,
      ageSeconds,
      isReady,
      status,
      provider: 'FusedLocationProviderClient',
      verificationStatus,
    };
  }

  private notify(gps: GpsData | null, error?: string | null): void {
    for (const listener of this.listeners) {
      try {
        listener(gps, error);
      } catch (e) {
        console.error('GPS listener error:', e);
      }
    }
  }
}

/**
 * GpsManager
 *
 * Backward-compatible extension of FusedLocationProviderClient ensuring
 * existing codebase references continue functioning seamlessly.
 */
export class GpsManager extends FusedLocationProviderClient {
  public startWatching(onUpdate?: (gps: GpsData | null, error?: string | null) => void): void {
    this.requestLocationUpdates(onUpdate);
  }

  public stopWatching(): void {
    this.removeLocationUpdates();
  }

  public getCurrentFix(): GpsData | null {
    // Returns current fix with updated freshness/readiness flags
    return this.getLastLocation(false);
  }

  public refreshGps(): Promise<GpsData> {
    return this.getCurrentLocation();
  }

  public removeListener(onUpdate: (gps: GpsData | null, error?: string | null) => void): void {
    this.removeLocationUpdates(onUpdate);
  }
}

// Singletons for application-wide use
export const gpsManager = new GpsManager();
export const fusedLocationProviderClient = gpsManager;

// ==========================================================
// GEOMETRIC & FORMATTING HELPERS
// ==========================================================

// Format coordinates to readable standard (e.g. 20.9250° N, 77.7560° E)
export function formatCoordinates(lat: number, lng: number): { latStr: string; lngStr: string; fullStr: string } {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const latAbs = Math.abs(lat).toFixed(5);
  const lngAbs = Math.abs(lng).toFixed(5);

  const latStr = `Lat: ${latAbs}° ${latDir}`;
  const lngStr = `Long: ${lngAbs}° ${lngDir}`;
  const fullStr = `${latAbs}° ${latDir}, ${lngAbs}° ${lngDir}`;

  return { latStr, lngStr, fullStr };
}

// Point-in-polygon ray casting algorithm to check if GPS coordinate falls within a GeoJSON Polygon or MultiPolygon
export function isPointInPolygon(point: [number, number], polygon: number[][][]): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (const ring of polygon) {
    // ring is array of [lng, lat] coordinates in GeoJSON format standard
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0]; // longitude
      const yi = ring[i][1]; // latitude
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
  }

  return inside;
}

export interface WardDetectionResult {
  ward: Ward | null;
  isVerified: boolean;
  method: WardVerificationMethod;
  matchedReason?: string;
  distanceMeters?: number;
}

// Haversine formula to compute geodesic distance between two coordinates in meters
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Multi-Tier Ward Detection Engine:
 * 1. Tier 1: Strict Point-in-Polygon GeoJSON Boundary Match
 * 2. Tier 2: Real Ward Center Coordinates & Radius Proximity Match
 * 3. Tier 3: Geocoded Postal Code & Locality Metadata Match
 * 4. Tier 4: Fallback - Returns unassigned / outside registered boundary (NEVER falsely defaults to Ward 01)
 */
export function detectWardFromCoordinates(
  lat: number,
  lng: number,
  wards: Ward[],
  geocodedAddress?: AddressInfo | null
): WardDetectionResult {
  if (!lat || !lng || !Array.isArray(wards) || wards.length === 0) {
    return {
      ward: null,
      isVerified: false,
      method: 'unassigned',
      matchedReason: 'No valid coordinates or registered wards available',
    };
  }

  // Tier 1: Check Polygon or MultiPolygon boundaries
  for (const ward of wards) {
    if (!ward.boundaryGeoJson) continue;

    try {
      const parsed = JSON.parse(ward.boundaryGeoJson);
      let geometry = parsed;
      if (parsed.type === 'FeatureCollection' && parsed.features && parsed.features.length > 0) {
        geometry = parsed.features[0].geometry;
      } else if (parsed.type === 'Feature' && parsed.geometry) {
        geometry = parsed.geometry;
      }

      if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
        if (isPointInPolygon([lat, lng], geometry.coordinates)) {
          return {
            ward,
            isVerified: true,
            method: 'boundary_verified',
            matchedReason: `Within spatial polygon boundary of ${ward.wardNumber}`,
          };
        }
      } else if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
        for (const poly of geometry.coordinates) {
          if (isPointInPolygon([lat, lng], poly)) {
            return {
              ward,
              isVerified: true,
              method: 'boundary_verified',
              matchedReason: `Within spatial multi-polygon boundary of ${ward.wardNumber}`,
            };
          }
        }
      }
    } catch (e) {
      console.warn(`Error parsing GeoJSON for ward ${ward.wardNumber}:`, e);
    }
  }

  // Tier 2: Proximity to Ward Reference Center
  let closestWard: Ward | null = null;
  let minDistance = Infinity;

  for (const ward of wards) {
    if (typeof ward.centerLat === 'number' && typeof ward.centerLng === 'number') {
      const dist = calculateHaversineDistance(lat, lng, ward.centerLat, ward.centerLng);
      const maxRadius = ward.radiusMeters || 2000;
      if (dist <= maxRadius && dist < minDistance) {
        minDistance = dist;
        closestWard = ward;
      }
    }
  }

  if (closestWard) {
    return {
      ward: closestWard,
      isVerified: true,
      method: 'proximity_verified',
      matchedReason: `Proximity match: ${Math.round(minDistance)}m from ${closestWard.wardNumber} center`,
      distanceMeters: Math.round(minDistance),
    };
  }

  // Tier 3: Locality & Postal Code Metadata Match
  if (geocodedAddress) {
    const cleanPin = geocodedAddress.postcode ? geocodedAddress.postcode.replace(/\D/g, '') : '';
    const locText = [
      geocodedAddress.locality,
      geocodedAddress.subLocality,
      geocodedAddress.road,
      geocodedAddress.formattedAddress,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    for (const ward of wards) {
      // 3A. PIN Code matching (with sanity check against city/district)
      const wardPin = ward.pinCode ? ward.pinCode.replace(/\D/g, '') : '';
      const pins = (ward.pinCodes || []).map((p) => p.replace(/\D/g, ''));
      if (cleanPin && (cleanPin === wardPin || pins.includes(cleanPin))) {
        const addrCity = (geocodedAddress.district || geocodedAddress.city || '').toLowerCase();
        const wardCity = (ward.district || '').toLowerCase();
        if (!addrCity || !wardCity || addrCity.includes(wardCity) || wardCity.includes(addrCity)) {
          return {
            ward,
            isVerified: true,
            method: 'locality_matched',
            matchedReason: `Matched PIN code ${cleanPin} to ${ward.wardNumber}`,
          };
        }
      }

      // 3B. Locality / Area Keywords matching
      if (ward.localityKeywords && ward.localityKeywords.length > 0) {
        for (const kw of ward.localityKeywords) {
          if (kw && kw.length > 2 && locText.includes(kw.toLowerCase())) {
            return {
              ward,
              isVerified: true,
              method: 'locality_matched',
              matchedReason: `Matched locality keyword "${kw}" to ${ward.wardNumber}`,
            };
          }
        }
      }
    }
  }

  // Tier 4: No Match - OUTSIDE REGISTERED WARDS
  return {
    ward: null,
    isVerified: false,
    method: 'unassigned',
    matchedReason: 'Location outside registered municipal ward boundaries',
  };
}
