import React, { useEffect, useState } from 'react';
import { AppSettings, GpsData, PhotoRecord, Ward, Worker, WorkCategory } from './types';
import { dbService } from './services/db';
import { gpsManager } from './services/gps';
import { CameraView } from './components/CameraView';
import { CentralSettingsView } from './components/CentralSettingsView';
import { Dashboard } from './components/Dashboard';
import { GalleryView } from './components/GalleryView';
import { WorkerManagement } from './components/WorkerManagement';
import { WardManagement } from './components/WardManagement';
import { PdfReportGeneratorModal } from './components/PdfReportGeneratorModal';
import { AndroidCodeModal } from './components/AndroidCodeModal';
import { ArrowLeft, Camera, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('camera');

  // Database State
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [categories, setCategories] = useState<WorkCategory[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    language: 'en',
    currentRole: 'supervisor',
    gpsAccuracyThreshold: 25,
    watermarkStyle: 'municipal_standard',
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
  });

  // Selected Photo for full inspector modal
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);

  // GPS State
  const [gps, setGps] = useState<GpsData | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Load Database Data on Mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        await dbService.initDefaultData();

        const [loadedPhotos, loadedWorkers, loadedWards, loadedCategories, loadedSettings] =
          await Promise.all([
            dbService.getAllPhotos(),
            dbService.getAllWorkers(),
            dbService.getAllWards(),
            dbService.getAllCategories(),
            dbService.getSettings(),
          ]);

        if (mounted) {
          setPhotos(loadedPhotos);
          setWorkers(loadedWorkers);
          setWards(loadedWards);
          setCategories(loadedCategories);
          setSettings(loadedSettings);
          setIsDbLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load database:', err);
        if (mounted) setIsDbLoaded(true);
      }
    }

    loadData();

    // Listen for MediaStore gallery scan index updates to synchronize in-app Gallery
    const handleGalleryScanned = async () => {
      try {
        const latestPhotos = await dbService.getAllPhotos();
        if (mounted) {
          setPhotos(latestPhotos);
        }
      } catch (err) {
        console.warn('Failed to refresh photos upon MediaStore scan:', err);
      }
    };
    window.addEventListener('mediastore:gallery_scanned', handleGalleryScanned);

    return () => {
      mounted = false;
      window.removeEventListener('mediastore:gallery_scanned', handleGalleryScanned);
    };
  }, []);

  // Synchronize configured accuracy threshold with FusedLocationProviderClient
  useEffect(() => {
    if (settings?.gpsAccuracyThreshold) {
      gpsManager.setAccuracyThreshold(settings.gpsAccuracyThreshold);
    }
  }, [settings?.gpsAccuracyThreshold]);

  // Helper function to evaluate strict freshness (age < 30s) and accuracy compliance
  const validateGpsFix = (gpsFix: GpsData | null, threshold: number): {
    isValidGpsReady: boolean;
    computedStatus: GpsData['status'];
    computedError: string | null;
  } => {
    if (!gpsFix) {
      return {
        isValidGpsReady: false,
        computedStatus: 'Acquiring GPS...',
        computedError: 'Acquiring GPS satellites...',
      };
    }

    const now = Date.now();
    const ageSeconds = Math.max(0, Math.round((now - gpsFix.timestamp) / 1000));
    const isFresh = ageSeconds < 30 && !gpsFix.isStale;
    const isAccurate =
      typeof gpsFix.accuracy === 'number' &&
      !isNaN(gpsFix.accuracy) &&
      gpsFix.accuracy > 0 &&
      gpsFix.accuracy <= threshold;

    if (!isFresh) {
      return {
        isValidGpsReady: false,
        computedStatus: 'Acquiring GPS...',
        computedError: `GPS fix is stale (${ageSeconds}s old, required < 30s). Acquiring fresh satellite fix...`,
      };
    }

    if (!isAccurate) {
      return {
        isValidGpsReady: false,
        computedStatus: 'GPS Accuracy Low',
        computedError: `GPS Accuracy Low (±${Math.round(gpsFix.accuracy)}m exceeds configured threshold of ±${threshold}m). Please move to an open area.`,
      };
    }

    return {
      isValidGpsReady: true,
      computedStatus: 'GPS Ready',
      computedError: null,
    };
  };

  // Initialize and watch GPS updates continuously with strict freshness and accuracy enforcement
  useEffect(() => {
    const handleGpsUpdate = (newGps: GpsData | null, error?: string | null) => {
      if (newGps) {
        const threshold = settings.gpsAccuracyThreshold || 25;
        const validation = validateGpsFix(newGps, threshold);

        const verifiedGps: GpsData = {
          ...newGps,
          ageSeconds: Math.max(0, Math.round((Date.now() - newGps.timestamp) / 1000)),
          isStale: !validation.isValidGpsReady && (newGps.isStale || (Date.now() - newGps.timestamp) / 1000 >= 30),
          isReady: validation.isValidGpsReady,
          status: validation.computedStatus,
          verificationStatus: validation.isValidGpsReady
            ? 'verified_realtime'
            : validation.computedStatus === 'GPS Accuracy Low'
            ? 'low_accuracy'
            : 'stale_rejected',
        };

        setGps(verifiedGps);
        setGpsError(validation.computedError || error || null);
      } else if (error) {
        setGps(null);
        setGpsError(error);
      }
    };

    gpsManager.startWatching(handleGpsUpdate);

    return () => {
      gpsManager.stopWatching();
    };
  }, [settings.gpsAccuracyThreshold]);

  // Periodic freshness check every 5 seconds to ensure active fixes that become >= 30s old immediately lose 'GPS Ready'
  useEffect(() => {
    const freshnessInterval = setInterval(() => {
      setGps((prevGps) => {
        if (!prevGps) return null;
        const now = Date.now();
        const ageSeconds = Math.max(0, Math.round((now - prevGps.timestamp) / 1000));
        const threshold = settings.gpsAccuracyThreshold || 25;

        // If location age exceeded 30 seconds or accuracy is low, revoke 'GPS Ready' immediately
        if (ageSeconds >= 30 || prevGps.accuracy > threshold) {
          const isStale = ageSeconds >= 30;
          return {
            ...prevGps,
            ageSeconds,
            isStale,
            isReady: false,
            status: isStale ? 'Acquiring GPS...' : 'GPS Accuracy Low',
            verificationStatus: isStale ? 'stale_rejected' : 'low_accuracy',
          };
        }

        // Fix is still fresh and accurate: keep updated age
        return {
          ...prevGps,
          ageSeconds,
        };
      });
    }, 5000);

    return () => clearInterval(freshnessInterval);
  }, [settings.gpsAccuracyThreshold]);

  // Manual GPS Refresh Trigger with strict validation
  const handleRefreshGps = async () => {
    try {
      setGpsError('Refreshing GPS satellites with FusedLocationProviderClient...');
      const freshGps = await gpsManager.refreshGps();
      const threshold = settings.gpsAccuracyThreshold || 25;
      const validation = validateGpsFix(freshGps, threshold);

      const verifiedFreshGps: GpsData = {
        ...freshGps,
        ageSeconds: Math.max(0, Math.round((Date.now() - freshGps.timestamp) / 1000)),
        isReady: validation.isValidGpsReady,
        status: validation.computedStatus,
        verificationStatus: validation.isValidGpsReady
          ? 'verified_realtime'
          : validation.computedStatus === 'GPS Accuracy Low'
          ? 'low_accuracy'
          : 'stale_rejected',
      };

      setGps(verifiedFreshGps);
      setGpsError(validation.computedError);
    } catch (e: any) {
      setGpsError(e.message || 'GPS refresh failed. Please check location permissions and clear sky view.');
    }
  };

  // Photo handlers
  const handlePhotoSaved = (newPhoto: PhotoRecord) => {
    setPhotos((prev) => [newPhoto, ...prev]);
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      await dbService.deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      if (selectedPhoto && selectedPhoto.id === id) {
        setSelectedPhoto(null);
      }
    } catch (e) {
      console.error('Delete photo failed:', e);
    }
  };

  const handleBatchDeletePhotos = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await dbService.deletePhoto(id);
      }
      setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)));
      if (selectedPhoto && ids.includes(selectedPhoto.id)) {
        setSelectedPhoto(null);
      }
    } catch (e) {
      console.error('Batch delete failed:', e);
    }
  };

  // Worker handlers
  const handleSaveWorker = async (worker: Worker) => {
    await dbService.saveWorker(worker);
    setWorkers((prev) => {
      const exists = prev.some((w) => w.id === worker.id);
      if (exists) {
        return prev.map((w) => (w.id === worker.id ? worker : w));
      }
      return [...prev, worker];
    });
  };

  const handleDeleteWorker = async (id: string) => {
    await dbService.deleteWorker(id);
    setWorkers((prev) => prev.filter((w) => w.id !== id));
  };

  const handleSetActiveWorker = (workerId: string) => {
    const nextSettings = { ...settings, activeWorkerId: workerId };
    setSettings(nextSettings);
    dbService.saveSettings(nextSettings);
  };

  // Ward handlers
  const handleSaveWard = async (ward: Ward) => {
    await dbService.saveWard(ward);
    setWards((prev) => {
      const exists = prev.some((w) => w.id === ward.id);
      if (exists) {
        return prev.map((w) => (w.id === ward.id ? ward : w));
      }
      return [...prev, ward];
    });
  };

  const handleDeleteWard = async (id: string) => {
    await dbService.deleteWard(id);
    setWards((prev) => prev.filter((w) => w.id !== id));
  };

  // Category handlers
  const handleSaveCategory = async (cat: WorkCategory) => {
    await dbService.saveCategory(cat);
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === cat.id);
      if (exists) return prev.map((c) => (c.id === cat.id ? cat : c));
      return [...prev, cat];
    });
  };

  const handleDeleteCategory = async (id: string) => {
    await dbService.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Settings update handler
  const handleUpdateSettings = async (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    await dbService.saveSettings(nextSettings);
  };

  if (!isDbLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-lg animate-pulse mb-3">
          ST
        </div>
        <h2 className="text-white font-bold text-base">Sumit Tag – GPS Map Camera</h2>
        <p className="text-slate-400 text-xs mt-1">Initializing municipal offline database...</p>
      </div>
    );
  }

  // 1. CLEAN CAMERA SCREEN: Main edge-to-edge viewfinder without top tabs
  if (activeTab === 'camera') {
    return (
      <CameraView
        gps={gps}
        gpsError={gpsError}
        onRefreshGps={handleRefreshGps}
        workers={workers}
        wards={wards}
        categories={categories}
        settings={settings}
        onPhotoSaved={handlePhotoSaved}
        onNavigateToGallery={() => setActiveTab('gallery')}
        onOpenSettings={() => setActiveTab('settings')}
        onUpdateSettings={handleUpdateSettings}
      />
    );
  }

  // 2. CENTRAL SETTINGS SCREEN: All 8 groups (A-H) and navigation
  if (activeTab === 'settings') {
    return (
      <CentralSettingsView
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        gps={gps}
        gpsError={gpsError}
        onRefreshGps={handleRefreshGps}
        workers={workers}
        wards={wards}
        categories={categories}
        totalPhotosCount={photos.length}
        onBackToCamera={() => setActiveTab('camera')}
        onNavigateToScreen={(screen) => setActiveTab(screen)}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    );
  }

  // 3. SECONDARY MODULE SCREENS: Dashboard, Gallery, Workers, Wards, Reports, Android Code
  // With clean sub-header to return to Camera or Settings
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Sub-screen Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('camera')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Settings</span>
          </button>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-white capitalize">{activeTab}</span>
          <span className="text-[10px] text-slate-400 block font-mono">Sumit Tag</span>
        </div>
      </header>

      {/* Secondary Screens Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            photos={photos}
            workers={workers}
            wards={wards}
            gps={gps}
            gpsError={gpsError}
            onRefreshGps={handleRefreshGps}
            settings={settings}
            setActiveTab={setActiveTab}
            onSelectPhoto={(photo) => {
              setSelectedPhoto(photo);
              setActiveTab('gallery');
            }}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            photos={photos}
            workers={workers}
            wards={wards}
            categories={categories}
            settings={settings}
            selectedPhoto={selectedPhoto}
            setSelectedPhoto={setSelectedPhoto}
            onDeletePhoto={handleDeletePhoto}
            onBatchDeletePhotos={handleBatchDeletePhotos}
          />
        )}

        {activeTab === 'workers' && (
          <WorkerManagement
            workers={workers}
            wards={wards}
            categories={categories}
            settings={settings}
            onSaveWorker={handleSaveWorker}
            onDeleteWorker={handleDeleteWorker}
            onSetActiveWorker={handleSetActiveWorker}
          />
        )}

        {activeTab === 'wards' && (
          <WardManagement
            wards={wards}
            settings={settings}
            onSaveWard={handleSaveWard}
            onDeleteWard={handleDeleteWard}
          />
        )}

        {activeTab === 'reports' && (
          <PdfReportGeneratorModal
            photos={photos}
            workers={workers}
            wards={wards}
            settings={settings}
          />
        )}

        {activeTab === 'android' && <AndroidCodeModal />}
      </main>
    </div>
  );
}
