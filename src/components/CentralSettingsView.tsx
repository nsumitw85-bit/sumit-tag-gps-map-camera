import React, { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  LayoutDashboard,
  Image as ImageIcon,
  Users,
  MapPin,
  Briefcase,
  Camera,
  Grid,
  Zap,
  RefreshCw,
  Sliders,
  Layers,
  Globe,
  HardDrive,
  FileText,
  Archive,
  Info,
  Shield,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  X,
  Share2,
  Download,
  Database
} from 'lucide-react';
import { AppSettings, GpsData, Language, UserRole, Ward, Worker, WorkCategory, WatermarkStyle } from '../types';
import { translations } from '../i18n/translations';
import { formatCoordinates } from '../services/gps';

interface CentralSettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  gps: GpsData | null;
  gpsError: string | null;
  onRefreshGps: () => void;
  workers: Worker[];
  wards: Ward[];
  categories: WorkCategory[];
  totalPhotosCount: number;
  onBackToCamera: () => void;
  onNavigateToScreen: (screen: 'dashboard' | 'gallery' | 'workers' | 'wards' | 'reports' | 'android') => void;
  onSaveCategory?: (cat: WorkCategory) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
}

export const CentralSettingsView: React.FC<CentralSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  gps,
  gpsError,
  onRefreshGps,
  workers,
  wards,
  categories,
  totalPhotosCount,
  onBackToCamera,
  onNavigateToScreen,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const t = translations[settings.language];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [backupExported, setBackupExported] = useState(false);

  // New Category Form State
  const [newCatEn, setNewCatEn] = useState('');
  const [newCatMr, setNewCatMr] = useState('');
  const [newCatHi, setNewCatHi] = useState('');

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const isAccuracyGood = gps
    ? gps.accuracy <= settings.gpsAccuracyThreshold && !gps.isStale && gps.ageSeconds < 30
    : false;

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefreshGps();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatEn.trim()) return;

    const newCategory: WorkCategory = {
      id: `cat-${Date.now()}`,
      nameEn: newCatEn.trim(),
      nameMr: newCatMr.trim() || newCatEn.trim(),
      nameHi: newCatHi.trim() || newCatEn.trim(),
      code: `MUNICIPAL-${categories.length + 1}`,
    };

    if (onSaveCategory) {
      await onSaveCategory(newCategory);
    }
    setNewCatEn('');
    setNewCatMr('');
    setNewCatHi('');
  };

  // Export JSON Database Backup
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      appName: 'Sumit Tag – GPS Map Camera',
      package: 'com.sumittag.gpsmapcamera',
      settings,
      workers,
      wards,
      categories,
      totalPhotosCount,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sumit-tag-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBackupExported(true);
    setTimeout(() => setBackupExported(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* ================================================== */}
      {/* TOP HEADER: Back to Camera & Quick Language Pills */}
      {/* ================================================== */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCamera}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-700/20 active:scale-95"
            aria-label="Back to Camera"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Camera</span>
          </button>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Settings</h1>
            <p className="text-[11px] text-slate-400">Sumit Tag – GPS Map Camera</p>
          </div>
        </div>

        {/* Quick Language Toggle */}
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => updateSetting('language', 'en')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${settings.language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            EN
          </button>
          <button
            onClick={() => updateSetting('language', 'mr')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${settings.language === 'mr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            मराठी
          </button>
          <button
            onClick={() => updateSetting('language', 'hi')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${settings.language === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            हिन्दी
          </button>
        </div>
      </header>

      {/* ================================================== */}
      {/* MAIN SETTINGS GROUPS (A through H) */}
      {/* ================================================== */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8 pb-16">

        {/* ================================================== */}
        {/* GROUP A: GENERAL */}
        {/* - Dashboard, Gallery, Workers, Ward Management, Work Categories */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <h2 className="text-base font-bold text-white">General & Navigation</h2>
                <p className="text-[11px] text-slate-400">Core municipal fieldwork modules</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Group A</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Dashboard */}
            <button
              onClick={() => onNavigateToScreen('dashboard')}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold block">{t.navDashboard}</span>
                  <span className="text-slate-400 text-[11px]">Operations & statistics</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </button>

            {/* Gallery */}
            <button
              onClick={() => onNavigateToScreen('gallery')}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold block">{t.navGallery}</span>
                  <span className="text-slate-400 text-[11px]">{totalPhotosCount} Geotagged photos</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </button>

            {/* Workers */}
            <button
              onClick={() => onNavigateToScreen('workers')}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold block">{t.navWorkers}</span>
                  <span className="text-slate-400 text-[11px]">{workers.length} Personnel registered</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>

            {/* Ward Management */}
            <button
              onClick={() => onNavigateToScreen('wards')}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold block">{t.navWards}</span>
                  <span className="text-slate-400 text-[11px]">{wards.length} Wards & GeoJSON</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </button>

            {/* Work Categories */}
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold block">Work Categories</span>
                  <span className="text-slate-400 text-[11px]">{categories.length} Categories configured</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </button>

            {/* PDF Reports */}
            <button
              onClick={() => onNavigateToScreen('reports')}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold block">{t.navReports}</span>
                  <span className="text-slate-400 text-[11px]">Generate A4 Municipal Report</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
            </button>

            {/* Android APK Code */}
            <button
              onClick={() => onNavigateToScreen('android')}
              className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold block">{t.navAndroidCode}</span>
                  <span className="text-slate-400 text-[11px]">Compile native APK with Gradle</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </button>
          </div>
        </section>

        {/* ================================================== */}
        {/* GROUP B: CAMERA SETTINGS */}
        {/* - Camera flash, Camera grid, Front / rear camera, Photo quality, Camera preferences */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                B
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Camera Settings</h2>
                <p className="text-[11px] text-slate-400">Viewfinder hardware & capture preferences</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Group B</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Front / Rear Camera Selector */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-400 font-semibold block">Front / Rear Camera Lens</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSetting('cameraFacing', 'environment')}
                  className={`py-2 px-3 rounded-xl font-bold transition-all border ${
                    settings.cameraFacing === 'environment'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Rear Camera
                </button>
                <button
                  onClick={() => updateSetting('cameraFacing', 'user')}
                  className={`py-2 px-3 rounded-xl font-bold transition-all border ${
                    settings.cameraFacing === 'user'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Front Camera
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Rear lens is standard for documenting fieldwork.</p>
            </div>

            {/* Camera Flash */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-slate-400 font-semibold block">Camera Flash / Torch</span>
              <div className="grid grid-cols-3 gap-2">
                {(['off', 'auto', 'on'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSetting('cameraFlash', mode)}
                    className={`py-2 px-2 rounded-xl font-bold uppercase transition-all border ${
                      settings.cameraFlash === mode
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Activates torch in low-light municipal drain inspections.</p>
            </div>

            {/* Camera Grid Toggle */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Camera Grid (Rule-of-Thirds)</span>
                <span className="text-slate-400 text-[11px]">Displays alignment lines on camera preview</span>
              </div>
              <button
                onClick={() => updateSetting('enableGrid', !settings.enableGrid)}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableGrid ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    settings.enableGrid ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Photo Quality */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Photo Quality</span>
                <span className="text-slate-400 text-[11px]">Full 1080p resolution photo output</span>
              </div>
              <select
                value={settings.photoQuality}
                onChange={(e) => updateSetting('photoQuality', e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none font-bold"
              >
                <option value="high">High Quality (Full 1080p)</option>
                <option value="standard">Standard Quality</option>
              </select>
            </div>

            {/* Camera Preferences (Shutter Sound & Feedback) */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between sm:col-span-2">
              <div>
                <span className="text-white font-bold block">Camera Capture Sound & Haptic Vibration</span>
                <span className="text-slate-400 text-[11px]">
                  Audio feedback and physical vibration confirmation on shutter click
                </span>
              </div>
              <button
                onClick={() => updateSetting('enableSound', !settings.enableSound)}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableSound ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    settings.enableSound ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* GROUP C: GPS AND LOCATION SETTINGS */}
        {/* - GPS status, Refresh GPS, GPS accuracy threshold, Location permissions, */}
        {/*   Latitude and longitude display, Address and PIN code settings, Map preview settings */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                C
              </div>
              <div>
                <h2 className="text-base font-bold text-white">GPS and Location Settings</h2>
                <p className="text-[11px] text-slate-400">Verifiable geographical coordinates & satellite calibration</p>
              </div>
            </div>
            {/* Refresh GPS Button */}
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh GPS'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* 1. GPS Status Card */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 text-[11px] block">GPS Status</span>
                <span className={`font-bold text-sm flex items-center gap-1.5 mt-0.5 ${gps && isAccuracyGood ? 'text-emerald-400' : gps ? 'text-amber-400' : 'text-rose-400'}`}>
                  {gps && isAccuracyGood ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{gps ? (gps.isStale ? 'Stale Fix (>30s)' : isAccuracyGood ? 'GPS Ready' : 'GPS Accuracy Low') : (gpsError || 'Waiting GPS...')}</span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Measured Accuracy</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                  {gps ? `±${Math.round(gps.accuracy)} meters` : '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Fix Timestamp & Age</span>
                <span className="font-mono text-slate-300 text-xs mt-0.5 block">
                  {gps ? (gps.isStale ? 'Stale fix (> 30s)' : `Active (${gps.ageSeconds}s ago)`) : 'Pending fix'}
                </span>
              </div>
            </div>

            {/* 2. Latitude and Longitude Display */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-white font-bold block">Latitude & Longitude Display</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 text-[10px] block">LATITUDE / LONGITUDE</span>
                  <span className="text-emerald-400 font-bold text-xs mt-0.5 block truncate">
                    {gps ? formatCoordinates(gps.latitude, gps.longitude).fullStr : 'Acquiring satellites...'}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 text-[10px] block">ALTITUDE & SPEED</span>
                  <span className="text-slate-200 font-bold text-xs mt-0.5 block">
                    Alt: {gps?.altitude !== null && gps?.altitude !== undefined ? `${gps.altitude} m` : 'N/A'} | Spd: {gps?.speed !== null && gps?.speed !== undefined ? `${gps.speed} m/s` : '0 m/s'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. GPS Accuracy Threshold Slider */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">{t.gpsThresholdLabel}</span>
                  <span className="text-slate-400 text-[11px]">Maximum permissible location inaccuracy before warning</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                  {settings.gpsAccuracyThreshold} meters
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={settings.gpsAccuracyThreshold}
                onChange={(e) => updateSetting('gpsAccuracyThreshold', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5m (Strict Survey)</span>
                <span>25m (Recommended Outdoor)</span>
                <span>100m (Relaxed Urban)</span>
              </div>
            </div>

            {/* 4. Location Permissions & GPS Calibration */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Location Permissions</span>
                <span className="text-slate-400 text-[11px]">High-accuracy Android FusedLocationProviderClient integration</span>
              </div>
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl font-bold border border-emerald-500/20 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Granted & Active</span>
              </span>
            </div>

            {/* 5. Address and PIN Code Settings */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-white font-bold block">Address and PIN Code Settings</span>
              <p className="text-slate-400 text-[11px]">
                Reverse geocodes real street, area, district, state, and postal PIN code from verified coordinates.
              </p>
              <div className="text-[11px] text-slate-300 font-mono bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                Live Geocoding: Dual-Provider (OpenStreetMap Nominatim & BigDataCloud) with automatic offline coordinate fallback.
              </div>
            </div>

            {/* 6. Map Preview Settings */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Map Preview on Watermark</span>
                <span className="text-slate-400 text-[11px]">Renders miniature vector map radar tile on the photo stamp</span>
              </div>
              <button
                onClick={() => updateSetting('showMapPreview', !settings.showMapPreview)}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.showMapPreview ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    settings.showMapPreview ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* GROUP D: PHOTO STAMP SETTINGS */}
        {/* - Detailed Stamp, Compact Stamp, Map Stamp, Custom Stamp */}
        {/* - Show/hide coordinates, address, PIN code, ward number, date/time */}
        {/* - Watermark position, font size, background transparency */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                D
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Photo Stamp Settings</h2>
                <p className="text-[11px] text-slate-400">Watermark layout styles, typography & field toggles</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Group D</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Style Selector: Detailed, Compact, Map, Custom */}
            <div>
              <span className="text-slate-400 font-semibold block mb-2">Watermark Template Layout</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'detailed', label: 'Detailed Stamp', desc: 'Full municipal audit' },
                  { id: 'compact', label: 'Compact Stamp', desc: 'Minimal bottom bar' },
                  { id: 'map', label: 'Map Stamp', desc: 'Vector map radar tile' },
                  { id: 'custom', label: 'Custom Stamp', desc: 'Selective field toggles' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateSetting('watermarkStyle', s.id as any)}
                    className={`py-2.5 px-3 rounded-2xl text-left transition-all border ${
                      settings.watermarkStyle === s.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-700/30'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <span className="font-bold block text-xs">{s.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${settings.watermarkStyle === s.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      {s.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Show / Hide Specific Stamp Fields */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-white font-bold block">Watermark Fields Visibility (Show / Hide)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'showCoordinates', label: 'GPS Coordinates (Latitude, Longitude & Accuracy)' },
                  { key: 'showAddress', label: 'Street Address, District & State' },
                  { key: 'showPinCode', label: 'Postal PIN Code' },
                  { key: 'showWardNumber', label: 'Ward Number & Verification Badge' },
                  { key: 'showDateTime', label: 'Date & Time (IST with AM/PM)' },
                  { key: 'showMapPreview', label: 'Location Map / Radar Graphic' },
                ].map((item) => {
                  const isChecked = (settings as any)[item.key];
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700/60 cursor-pointer hover:bg-slate-750 transition-colors"
                    >
                      <span className="text-slate-200 font-medium text-xs pr-2">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => updateSetting(item.key as any, e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Position, Font Size & Transparency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Position */}
              <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Watermark Position</span>
                <select
                  value={settings.watermarkPosition}
                  onChange={(e) => updateSetting('watermarkPosition', e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none font-bold"
                >
                  <option value="bottom">Bottom of Photo (Standard)</option>
                  <option value="top">Top of Photo</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Watermark Font Size</span>
                <select
                  value={settings.watermarkFontSize}
                  onChange={(e) => updateSetting('watermarkFontSize', e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none font-bold"
                >
                  <option value="small">Small (Compact text)</option>
                  <option value="medium">Medium (Standard Readable)</option>
                  <option value="large">Large (High-Visibility)</option>
                </select>
              </div>

              {/* Transparency Slider */}
              <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400 text-xs">
                  <span className="font-semibold">Background Opacity</span>
                  <span className="font-mono text-white font-bold">{Math.round(settings.watermarkOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={settings.watermarkOpacity}
                  onChange={(e) => updateSetting('watermarkOpacity', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer mt-1.5"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>50% Translucent</span>
                  <span>100% Solid</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* GROUP E: WORKER AND WORK SETTINGS */}
        {/* - Select Worker, Select Ward, Select Work Category */}
        {/* - Add or edit workers, Add or edit wards, Add or edit work categories */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                E
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Worker and Work Settings</h2>
                <p className="text-[11px] text-slate-400">Assignment selection & personnel management</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Group E</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Select Worker */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-semibold block">Select Active Worker</span>
              <select
                value={settings.activeWorkerId}
                onChange={(e) => updateSetting('activeWorkerId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none font-medium truncate"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.workerId})
                  </option>
                ))}
              </select>
              <button
                onClick={() => onNavigateToScreen('workers')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold pt-1 flex items-center gap-1"
              >
                <span>Add or edit workers</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Select Ward */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-semibold block">Select Default Ward</span>
              <select
                value={settings.defaultWardId}
                onChange={(e) => updateSetting('defaultWardId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none font-medium truncate"
              >
                <option value="">Auto-Detect by GPS Location</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.wardNumber} - {w.wardName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onNavigateToScreen('wards')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold pt-1 flex items-center gap-1"
              >
                <span>Add or edit wards</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Select Work Category */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-semibold block">Select Work Category</span>
              <select
                value={settings.defaultWorkCategoryId}
                onChange={(e) => updateSetting('defaultWorkCategoryId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none font-medium truncate"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {settings.language === 'mr' ? c.nameMr : settings.language === 'hi' ? c.nameHi : c.nameEn}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setCategoryModalOpen(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold pt-1 flex items-center gap-1"
              >
                <span>Add or edit work categories</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* GROUP F: LANGUAGE */}
        {/* - English, Marathi, Hindi */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold">
                F
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Language</h2>
                <p className="text-[11px] text-slate-400">Regional multilingual interface for field personnel</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Group F</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'en', label: 'English', sub: 'Default Standard' },
              { id: 'mr', label: 'मराठी', sub: 'महाराष्ट्र भाषा' },
              { id: 'hi', label: 'हिन्दी', sub: 'राजभाषा' },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => updateSetting('language', lang.id as Language)}
                className={`p-4 rounded-2xl text-left transition-all border flex items-center justify-between ${
                  settings.language === lang.id
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-700/30'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <div>
                  <span className="text-sm font-bold block">{lang.label}</span>
                  <span className={`text-[11px] block mt-0.5 ${settings.language === lang.id ? 'text-blue-200' : 'text-slate-400'}`}>
                    {lang.sub}
                  </span>
                </div>
                {settings.language === lang.id && (
                  <Check className="w-5 h-5 text-white" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ================================================== */}
        {/* GROUP G: STORAGE AND REPORTS */}
        {/* - Saved photographs, Original photographs, Stamped photographs, PDF reports, Export/sharing */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                G
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Storage and Reports</h2>
                <p className="text-[11px] text-slate-400">Scoped storage, dual-photo policies & export generators</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Group G</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Saved Photographs Count & Gallery Link */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block text-sm">Saved Photographs</span>
                <span className="text-slate-400 text-[11px]">
                  {totalPhotosCount} photographs stored in local IndexedDB device storage
                </span>
              </div>
              <button
                onClick={() => onNavigateToScreen('gallery')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-md active:scale-95 text-xs"
              >
                View Gallery →
              </button>
            </div>

            {/* Auto-Save to Phone Gallery Policy */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-800/80 transition-colors">
              <input
                type="checkbox"
                checked={settings.autoSaveToGallery}
                onChange={(e) => updateSetting('autoSaveToGallery', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white block">Automatically Save Photos to Phone's Gallery</span>
                  <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                    {settings.autoSaveToGallery ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Automatically writes captured photographs to shared device storage (<code className="text-blue-300">Pictures/Sumit Tag/</code>) using Android MediaStore scoped storage. No separate download button click required.
                </span>
              </div>
            </label>

            {/* Original Photographs Policy */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saveOriginalPhoto}
                onChange={(e) => updateSetting('saveOriginalPhoto', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 cursor-pointer"
              />
              <div>
                <span className="font-bold text-white block">Save Original (Raw) Photographs</span>
                <span className="text-slate-400 text-[11px]">
                  Preserves raw unmodified photograph separately as <code className="text-amber-300">SumitTag_YYYYMMDD_HHMMSS_original.jpg</code> for audit verification and non-repudiation.
                </span>
              </div>
            </label>

            {/* Stamped Photographs Policy */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saveStampedPhoto}
                onChange={(e) => updateSetting('saveStampedPhoto', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 cursor-pointer"
              />
              <div>
                <span className="font-bold text-white block">Save Stamped Geotagged Photographs</span>
                <span className="text-slate-400 text-[11px]">
                  Applies high-contrast watermark stamp with GPS coordinates, ward, locality, and timestamp.
                </span>
              </div>
            </label>

            {/* PDF Reports & Export Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => onNavigateToScreen('reports')}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl border border-slate-700 font-bold transition-all"
              >
                <FileText className="w-4 h-4 text-rose-400" />
                <span>Generate A4 PDF Reports</span>
              </button>
              <button
                onClick={() => onNavigateToScreen('gallery')}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl border border-slate-700 font-bold transition-all"
              >
                <Archive className="w-4 h-4 text-emerald-400" />
                <span>Batch Export to ZIP & Share</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* GROUP H: APPLICATION SETTINGS */}
        {/* - App information, Permissions, Privacy settings, Backup settings */}
        {/* ================================================== */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center font-bold">
                H
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Application Settings</h2>
                <p className="text-[11px] text-slate-400">App identity, permissions, privacy policy & backup</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">Group H</span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            {/* App Information */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">Sumit Tag – GPS Map Camera</span>
                <span className="text-xs font-mono bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                  Version 1.0.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Android Package: <code className="text-slate-200">com.sumittag.gpsmapcamera</code>
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Engineered for municipal sanitation workers, supervisors, and field contractors with verifiable location integrity.
              </p>
            </div>

            {/* Permissions */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-white font-bold block">Android Runtime Permissions</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">CAMERA</span>
                  <span className="text-emerald-400 font-bold">CAMERA_ANY (Active)</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">LOCATION</span>
                  <span className="text-emerald-400 font-bold">FINE_LOCATION (Active)</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">STORAGE</span>
                  <span className="text-emerald-400 font-bold">Scoped / IndexedDB</span>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-[11px] flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong className="block text-emerald-200 text-xs">Strict Data Integrity & Privacy Policy</strong>
                <span>All photos, GPS coordinates, and worker records remain 100% on this device. Never generates fake coordinates or alters location.</span>
              </div>
            </div>

            {/* Backup Settings */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-white font-bold block">Database Backup & Export</span>
                <span className="text-slate-400 text-[11px]">
                  Export a JSON snapshot of workers, wards, categories, and settings.
                </span>
              </div>
              <button
                onClick={handleExportBackup}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95 text-xs flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{backupExported ? 'Backup Downloaded!' : 'Export JSON Backup'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* BIG BOTTOM RETURN TO CAMERA BUTTON */}
        {/* ================================================== */}
        <div className="pt-2">
          <button
            onClick={onBackToCamera}
            className="w-full py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold rounded-2xl shadow-xl shadow-blue-700/30 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-98"
          >
            <Camera className="w-5 h-5" />
            <span>Return to Live Camera Preview</span>
          </button>
        </div>
      </main>

      {/* ================================================== */}
      {/* WORK CATEGORY MANAGER MODAL (Group A / E) */}
      {/* ================================================== */}
      {categoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-white font-bold text-sm">Work Categories Manager</h3>
                  <p className="text-[11px] text-slate-400">Configure municipal field categories</p>
                </div>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Category Form */}
            <form onSubmit={handleCreateCategory} className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <span className="text-white font-bold block">+ Add New Work Category</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="English (e.g. Tree Trimming)"
                  value={newCatEn}
                  onChange={(e) => setNewCatEn(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white placeholder-slate-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Marathi (उदा. झाडे छाटणी)"
                  value={newCatMr}
                  onChange={(e) => setNewCatMr(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white placeholder-slate-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Hindi (उदा. पेड़ छंटाई)"
                  value={newCatHi}
                  onChange={(e) => setNewCatHi(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white placeholder-slate-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newCatEn.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Category</span>
              </button>
            </form>

            {/* List Existing Categories */}
            <div className="space-y-2 text-xs">
              <span className="text-slate-400 font-semibold block">Configured Categories ({categories.length})</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-white font-bold block">{c.nameEn}</span>
                      <span className="text-slate-400 text-[10px]">
                        मराठी: {c.nameMr} • हिन्दी: {c.nameHi}
                      </span>
                    </div>
                    {onDeleteCategory && !c.id.startsWith('cat-1') && (
                      <button
                        onClick={() => onDeleteCategory(c.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setCategoryModalOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
