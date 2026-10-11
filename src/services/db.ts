import { AppSettings, PhotoRecord, Ward, Worker, WorkCategory, AddressInfo } from '../types';
import { defaultCategories } from '../i18n/translations';

const DB_NAME = 'SumitTagGpsCameraDB';
const DB_VERSION = 1;

interface DBSchema {
  photos: PhotoRecord;
  workers: Worker;
  wards: Ward;
  categories: WorkCategory;
  settings: AppSettings;
  geocode_cache: { key: string; address: AddressInfo; timestamp: number };
}

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('captureTimestamp', 'captureTimestamp', { unique: false });
          photoStore.createIndex('wardNumber', 'wardNumber', { unique: false });
          photoStore.createIndex('workerId', 'workerId', { unique: false });
          photoStore.createIndex('workCategory', 'workCategory', { unique: false });
        }

        if (!db.objectStoreNames.contains('workers')) {
          const workerStore = db.createObjectStore('workers', { keyPath: 'id' });
          workerStore.createIndex('workerId', 'workerId', { unique: true });
        }

        if (!db.objectStoreNames.contains('wards')) {
          const wardStore = db.createObjectStore('wards', { keyPath: 'id' });
          wardStore.createIndex('wardNumber', 'wardNumber', { unique: true });
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('geocode_cache')) {
          db.createObjectStore('geocode_cache', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // Initial seeding of initial workers, wards, and categories if empty
  async initDefaultData(): Promise<void> {
    const db = await this.openDB();

    // Check categories
    const categoriesCount = await this.countStore('categories');
    if (categoriesCount === 0) {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      for (const cat of defaultCategories) {
        store.put(cat);
      }
    }

    // Check default wards
    const wardsCount = await this.countStore('wards');
    if (wardsCount === 0) {
      const defaultWards: Ward[] = [
        {
          id: 'ward-01',
          wardNumber: 'Ward 01',
          wardName: 'Shivaji Ward',
          areaName: 'Central Market & Bus Station',
          pinCode: '444601',
          pinCodes: ['444601'],
          localityKeywords: ['central market', 'bus station', 'market', 'shivaji'],
          centerLat: 20.9374,
          centerLng: 77.7796,
          radiusMeters: 1600,
          district: 'Amravati',
          state: 'Maharashtra',
          notes: 'High commercial density area with daily morning road sweeping priority.',
        },
        {
          id: 'ward-02',
          wardNumber: 'Ward 02',
          wardName: 'Ambedkar Ward',
          areaName: 'Railway Colony & Station Road',
          pinCode: '444601',
          pinCodes: ['444601'],
          localityKeywords: ['railway colony', 'station road', 'railway', 'ambedkar'],
          centerLat: 20.9250,
          centerLng: 77.7560,
          radiusMeters: 1500,
          district: 'Amravati',
          state: 'Maharashtra',
          notes: 'Daily drain desilting and garbage point clearance.',
        },
        {
          id: 'ward-03',
          wardNumber: 'Ward 03',
          wardName: 'Tilak Ward',
          areaName: 'Civil Lines & Administrative Zone',
          pinCode: '444602',
          pinCodes: ['444602'],
          localityKeywords: ['civil lines', 'administrative zone', 'collector office', 'tilak'],
          centerLat: 20.9420,
          centerLng: 77.7490,
          radiusMeters: 1800,
          district: 'Amravati',
          state: 'Maharashtra',
          notes: 'Government offices & residential quarters zone.',
        },
        {
          id: 'ward-04',
          wardNumber: 'Ward 04',
          wardName: 'Nehru Ward',
          areaName: 'Old Town & Vegetable Mandi',
          pinCode: '444603',
          pinCodes: ['444603'],
          localityKeywords: ['old town', 'vegetable mandi', 'mandi', 'nehru'],
          centerLat: 20.9290,
          centerLng: 77.7680,
          radiusMeters: 1600,
          district: 'Amravati',
          state: 'Maharashtra',
          notes: 'Dense market waste collection twice a day.',
        },
        {
          id: 'ward-05',
          wardNumber: 'Ward 05',
          wardName: 'Gandhi Ward',
          areaName: 'Subhash Nagar & Ring Road',
          pinCode: '444605',
          pinCodes: ['444605'],
          localityKeywords: ['subhash nagar', 'ring road', 'gandhi nagar', 'gandhi'],
          centerLat: 20.9150,
          centerLng: 77.7420,
          radiusMeters: 2000,
          district: 'Amravati',
          state: 'Maharashtra',
          notes: 'Industrial and outskirts waste transport route.',
        }
      ];

      const tx = db.transaction('wards', 'readwrite');
      const store = tx.objectStore('wards');
      for (const w of defaultWards) {
        store.put(w);
      }
    } else {
      // Migrate existing wards if center coordinates are missing
      const tx = db.transaction('wards', 'readwrite');
      const store = tx.objectStore('wards');
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const existingWards = (getAllReq.result || []) as Ward[];
        for (const w of existingWards) {
          if (!w.centerLat && w.id === 'ward-01') {
            w.centerLat = 20.9374;
            w.centerLng = 77.7796;
            w.radiusMeters = 1600;
            w.pinCodes = ['444601'];
            store.put(w);
          } else if (!w.centerLat && w.id === 'ward-02') {
            w.centerLat = 20.9250;
            w.centerLng = 77.7560;
            w.radiusMeters = 1500;
            w.pinCodes = ['444601'];
            store.put(w);
          } else if (!w.centerLat && w.id === 'ward-03') {
            w.centerLat = 20.9420;
            w.centerLng = 77.7490;
            w.radiusMeters = 1800;
            w.pinCodes = ['444602'];
            store.put(w);
          } else if (!w.centerLat && w.id === 'ward-04') {
            w.centerLat = 20.9290;
            w.centerLng = 77.7680;
            w.radiusMeters = 1600;
            w.pinCodes = ['444603'];
            store.put(w);
          } else if (!w.centerLat && w.id === 'ward-05') {
            w.centerLat = 20.9150;
            w.centerLng = 77.7420;
            w.radiusMeters = 2000;
            w.pinCodes = ['444605'];
            store.put(w);
          }
        }
      };
    }

    // Check default workers
    const workersCount = await this.countStore('workers');
    if (workersCount === 0) {
      const defaultWorkers: Worker[] = [
        {
          id: 'wrk-01',
          workerId: 'ST-SAN-101',
          fullName: 'Suresh Patil',
          mobile: '9822012345',
          designation: 'Sanitation Worker',
          wardId: 'ward-01',
          wardNumber: 'Ward 01',
          workCategory: 'Drain Cleaning',
          status: 'active',
          createdAt: new Date().toISOString()
        },
        {
          id: 'wrk-02',
          workerId: 'ST-SAN-102',
          fullName: 'Ramesh Jadhav',
          mobile: '9822054321',
          designation: 'Sanitation Worker',
          wardId: 'ward-02',
          wardNumber: 'Ward 02',
          workCategory: 'Road Sweeping',
          status: 'active',
          createdAt: new Date().toISOString()
        },
        {
          id: 'wrk-03',
          workerId: 'ST-SUP-201',
          fullName: 'Vijay Shinde',
          mobile: '9823098765',
          designation: 'Mukadam / Supervisor',
          wardId: 'ward-01',
          wardNumber: 'Ward 01',
          workCategory: 'Garbage Collection',
          status: 'active',
          createdAt: new Date().toISOString()
        },
        {
          id: 'wrk-04',
          workerId: 'ST-DRV-301',
          fullName: 'Ganesh More',
          mobile: '9890112233',
          designation: 'Waste Tipper Driver',
          wardId: 'ward-03',
          wardNumber: 'Ward 03',
          workCategory: 'Waste Transportation',
          status: 'active',
          createdAt: new Date().toISOString()
        }
      ];

      const tx = db.transaction('workers', 'readwrite');
      const store = tx.objectStore('workers');
      for (const wrk of defaultWorkers) {
        store.put(wrk);
      }
    }
  }

  private countStore(storeName: string): Promise<number> {
    return new Promise(async (resolve) => {
      try {
        const db = await this.openDB();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  // Photos
  async savePhoto(photo: PhotoRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const req = store.put(photo);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllPhotos(): Promise<PhotoRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly');
      const store = tx.objectStore('photos');
      const req = store.getAll();
      req.onsuccess = () => {
        // Return reverse sorted by captureTimestamp (newest first)
        const records = (req.result as PhotoRecord[]).sort((a, b) => b.captureTimestamp - a.captureTimestamp);
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deletePhoto(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Workers
  async getAllWorkers(): Promise<Worker[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readonly');
      const store = tx.objectStore('workers');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveWorker(worker: Worker): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readwrite');
      const store = tx.objectStore('workers');
      const req = store.put(worker);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteWorker(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readwrite');
      const store = tx.objectStore('workers');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Wards
  async getAllWards(): Promise<Ward[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('wards', 'readonly');
      const store = tx.objectStore('wards');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveWard(ward: Ward): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('wards', 'readwrite');
      const store = tx.objectStore('wards');
      const req = store.put(ward);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteWard(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('wards', 'readwrite');
      const store = tx.objectStore('wards');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Categories
  async getAllCategories(): Promise<WorkCategory[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readonly');
      const store = tx.objectStore('categories');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.length > 0 ? req.result : defaultCategories);
      req.onerror = () => resolve(defaultCategories);
    });
  }

  async saveCategory(cat: WorkCategory): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.put(cat);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      language: 'en',
      currentRole: 'supervisor',
      gpsAccuracyThreshold: 25, // meters
      watermarkStyle: 'detailed',
      watermarkFontSize: 'medium',
      watermarkOpacity: 0.85,
      watermarkPosition: 'bottom',
      defaultWorkCategoryId: 'cat-1',
      defaultWardId: 'ward-01',
      activeWorkerId: 'wrk-01',
      saveOriginalPhoto: true,
      saveStampedPhoto: true,
      autoSaveToGallery: true,
      photoQuality: 'high',
      enableGrid: false,
      enableSound: true,
      showCoordinates: true,
      showAddress: true,
      showPinCode: true,
      showWardNumber: true,
      showDateTime: true,
      showMapPreview: true,
      cameraFlash: 'off',
      cameraFacing: 'environment',
    };

    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('app_settings');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve({ ...defaultSettings, ...req.result.value });
          } else {
            resolve(defaultSettings);
          }
        };
        req.onerror = () => resolve(defaultSettings);
      });
    } catch {
      return defaultSettings;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: 'app_settings', value: settings });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Geocode Cache
  async getCachedAddress(cacheKey: string): Promise<AddressInfo | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction('geocode_cache', 'readonly');
        const store = tx.objectStore('geocode_cache');
        const req = store.get(cacheKey);
        req.onsuccess = () => {
          if (req.result && req.result.address) {
            resolve(req.result.address);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async setCachedAddress(cacheKey: string, address: AddressInfo): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction('geocode_cache', 'readwrite');
      const store = tx.objectStore('geocode_cache');
      store.put({ key: cacheKey, address, timestamp: Date.now() });
    } catch (e) {
      console.warn('Failed to cache address in IndexedDB', e);
    }
  }
}

export const dbService = new LocalDatabase();
