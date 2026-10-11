import { AddressInfo } from '../types';
import { dbService } from './db';

export interface GeocodingProvider {
  name: string;
  reverseGeocode(lat: number, lng: number): Promise<AddressInfo>;
}

// Provider 1: OpenStreetMap Nominatim (High detail street & postal data)
class NominatimProvider implements GeocodingProvider {
  name = 'OpenStreetMap Nominatim';

  async reverseGeocode(lat: number, lng: number): Promise<AddressInfo> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SumitTag-GPSMapCamera/2.0 (Municipal Field Documentation)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}`);
      }

      const data = await response.json();
      const addr = data.address || {};

      const road = addr.road || addr.street || addr.lane || addr.path || addr.pedestrian || undefined;
      const subLocality = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || undefined;
      const locality = addr.city_district || addr.suburb || addr.village || addr.town || addr.city || undefined;
      const city = addr.city || addr.town || addr.village || addr.municipality || undefined;
      const district = addr.state_district || addr.county || addr.district || undefined;
      const state = addr.state || undefined;
      const country = addr.country || undefined;
      const postcode = addr.postcode || undefined;

      const parts: string[] = [];
      if (road) parts.push(road);
      if (subLocality && subLocality !== road) parts.push(subLocality);
      if (locality && locality !== subLocality) parts.push(locality);
      if (city && city !== locality) parts.push(city);
      if (district && district !== locality && district !== city) parts.push(district);
      if (state) parts.push(state);
      if (postcode) parts.push(`PIN: ${postcode}`);
      if (country) parts.push(country);

      const formattedAddress = parts.length > 0 ? parts.join(', ') : (data.display_name || `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);

      return {
        country,
        state,
        district: district || city,
        city,
        locality: locality || subLocality || city,
        subLocality,
        road,
        postcode,
        formattedAddress,
        isResolved: true,
        resolvedAt: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

// Provider 2: BigDataCloud Reverse Geocoding (Fast client API, no strict rate limit, global coverage)
class BigDataCloudProvider implements GeocodingProvider {
  name = 'BigDataCloud Client Geocoder';

  async reverseGeocode(lat: number, lng: number): Promise<AddressInfo> {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`BigDataCloud HTTP ${response.status}`);
      }

      const data = await response.json();
      const country = data.countryName || undefined;
      const state = data.principalSubdivision || undefined;
      const city = data.city || data.locality || undefined;
      const locality = data.locality || data.city || undefined;
      const postcode = data.postcode || undefined;

      // Extract district or sublocality from administrative hierarchy if available
      let district = city;
      let subLocality = locality;
      if (Array.isArray(data.localityInfo?.administrative)) {
        for (const admin of data.localityInfo.administrative) {
          if (admin.order === 5 || admin.order === 6) {
            district = admin.name || district;
          } else if (admin.order >= 7) {
            subLocality = admin.name || subLocality;
          }
        }
      }

      const parts: string[] = [];
      if (subLocality) parts.push(subLocality);
      if (locality && locality !== subLocality) parts.push(locality);
      if (city && city !== locality && city !== subLocality) parts.push(city);
      if (district && district !== city) parts.push(district);
      if (state) parts.push(state);
      if (postcode) parts.push(`PIN: ${postcode}`);
      if (country) parts.push(country);

      const formattedAddress = parts.length > 0 ? parts.join(', ') : `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;

      return {
        country,
        state,
        district: district || city,
        city,
        locality: locality || subLocality,
        subLocality,
        postcode,
        formattedAddress,
        isResolved: true,
        resolvedAt: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

class GeocodingService {
  private primaryProvider: GeocodingProvider = new NominatimProvider();
  private secondaryProvider: GeocodingProvider = new BigDataCloudProvider();
  private memoryCache = new Map<string, AddressInfo>();

  // Coordinate grid cache key (~11m resolution: 4 decimal places)
  private getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }

  async resolveAddress(lat: number, lng: number, forceRefresh = false): Promise<AddressInfo> {
    const cacheKey = this.getCacheKey(lat, lng);

    // 1. Fast in-memory check
    if (!forceRefresh && this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    // 2. Check local IndexedDB cache
    if (!forceRefresh) {
      try {
        const cached = await dbService.getCachedAddress(cacheKey);
        if (cached && cached.isResolved) {
          this.memoryCache.set(cacheKey, cached);
          return cached;
        }
      } catch {
        // Continue to online fetch
      }
    }

    // 3. Offline check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineAddress: AddressInfo = {
        formattedAddress: `Lat: ${lat.toFixed(5)}, Long: ${lng.toFixed(5)} (Offline)`,
        locality: 'Current GPS Position',
        isResolved: false,
      };
      return offlineAddress;
    }

    // 4. Try Primary Provider (Nominatim)
    try {
      const address = await this.primaryProvider.reverseGeocode(lat, lng);
      this.memoryCache.set(cacheKey, address);
      dbService.setCachedAddress(cacheKey, address).catch(() => {});
      return address;
    } catch (primaryErr) {
      console.warn('Primary geocoding provider failed, trying secondary provider:', primaryErr);
    }

    // 5. Try Secondary Provider (BigDataCloud)
    try {
      const address = await this.secondaryProvider.reverseGeocode(lat, lng);
      this.memoryCache.set(cacheKey, address);
      dbService.setCachedAddress(cacheKey, address).catch(() => {});
      return address;
    } catch (secondaryErr) {
      console.warn('Secondary geocoding provider failed:', secondaryErr);
    }

    // 6. Honest Fallback with Exact Coordinates (Never fake location!)
    const fallbackAddress: AddressInfo = {
      formattedAddress: `Lat: ${lat.toFixed(5)}, Long: ${lng.toFixed(5)} (Address Lookup Unavailable)`,
      locality: 'Current GPS Position',
      isResolved: false,
    };
    return fallbackAddress;
  }

  public clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}

export const geocodingService = new GeocodingService();
