import React from 'react';
import {
  Camera,
  Image as ImageIcon,
  Users,
  MapPin,
  FileText,
  Settings,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Share2
} from 'lucide-react';
import { AppSettings, GpsData, PhotoRecord, Ward, Worker } from '../types';
import { translations } from '../i18n/translations';
import { formatCoordinates } from '../services/gps';

interface DashboardProps {
  photos: PhotoRecord[];
  workers: Worker[];
  wards: Ward[];
  gps: GpsData | null;
  gpsError: string | null;
  onRefreshGps: () => void;
  settings: AppSettings;
  setActiveTab: (tab: string) => void;
  onSelectPhoto: (photo: PhotoRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  photos,
  workers,
  wards,
  gps,
  gpsError,
  onRefreshGps,
  settings,
  setActiveTab,
  onSelectPhoto,
}) => {
  const t = translations[settings.language];

  // Calculate statistics
  const totalPhotos = photos.length;

  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayPhotos = photos.filter((p) => {
    const photoDateStr = new Date(p.captureTimestamp).toISOString().slice(0, 10);
    return photoDateStr === todayStr;
  }).length;

  const verifiedPhotosCount = photos.filter((p) => p.wardVerificationMethod === 'boundary_verified').length;
  const recentPhotos = photos.slice(0, 6);

  const isAccuracyGood = gps ? gps.accuracy <= settings.gpsAccuracyThreshold : false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 rounded-3xl p-6 border border-blue-700/50 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t.tagline}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t.appName} – {t.appSubtitle}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl mt-1">
              Verifiable geographic location capture for sanitation & municipal fieldwork. Stamped dual photo storage, ward boundary checks, and automated reports.
            </p>
          </div>

          {/* Big Quick Capture Button */}
          <button
            onClick={() => setActiveTab('camera')}
            className="flex items-center gap-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95"
          >
            <Camera className="w-5 h-5" />
            <span>{t.quickCapture}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Photos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.totalPhotos}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">{totalPhotos}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>{verifiedPhotosCount} boundary verified</span>
            </div>
          </div>
        </div>

        {/* Today's Photos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.todayPhotos}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">{todayPhotos}</div>
            <div className="text-xs text-emerald-400 mt-1">Captured today</div>
          </div>
        </div>

        {/* Total Workers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.workersTitle}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">{workers.length}</div>
            <div className="text-xs text-slate-400 mt-1">Sanitation personnel</div>
          </div>
        </div>

        {/* Total Wards */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.wardsTitle}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">{wards.length}</div>
            <div className="text-xs text-slate-400 mt-1">Municipal divisions</div>
          </div>
        </div>
      </div>

      {/* GPS Status & Live Hardware Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <h2 className="text-base font-bold text-white">{t.systemStatus}</h2>
          </div>
          <button
            onClick={onRefreshGps}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.refreshGps}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Coordinates */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium">GPS Coordinates</div>
            <div className="text-sm font-mono font-bold text-white mt-1">
              {gps ? formatCoordinates(gps.latitude, gps.longitude).fullStr : 'Waiting for GPS Fix...'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {gps ? `Updated ${gps.ageSeconds}s ago` : gpsError || 'Turn on location'}
            </div>
          </div>

          {/* Accuracy Status */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium">Measured Accuracy</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-mono font-bold text-white">
                {gps ? `±${gps.accuracy} m` : '--'}
              </span>
              {gps && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  isAccuracyGood ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isAccuracyGood ? 'Verified (< ' + settings.gpsAccuracyThreshold + 'm)' : 'Low Accuracy'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Threshold setting: {settings.gpsAccuracyThreshold} meters
            </div>
          </div>

          {/* Altitude & Speed */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium">Altitude & Movement</div>
            <div className="text-sm font-mono font-bold text-white mt-1">
              Alt: {gps?.altitude !== null && gps?.altitude !== undefined ? `${gps.altitude} m` : 'N/A'} | Spd: {gps?.speed !== null && gps?.speed !== undefined ? `${gps.speed} m/s` : '0 m/s'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              High Accuracy satellite sensor
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('gallery')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col items-center text-center group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-white">{t.navGallery}</span>
          <span className="text-xs text-slate-400 mt-0.5">View all photos</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col items-center text-center group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-white">{t.navReports}</span>
          <span className="text-xs text-slate-400 mt-0.5">Generate A4 PDF</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col items-center text-center group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-white">{t.navWorkers}</span>
          <span className="text-xs text-slate-400 mt-0.5">Manage personnel</span>
        </button>

        <button
          onClick={() => setActiveTab('android')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col items-center text-center group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Smartphone className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-white">{t.navAndroidCode}</span>
          <span className="text-xs text-slate-400 mt-0.5">Build native APK</span>
        </button>
      </div>

      {/* Recent Geotagged Photos */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            <span>{t.recentGeotags}</span>
          </h2>
          <button
            onClick={() => setActiveTab('gallery')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            <span>{t.viewAll}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPhotos.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{t.noPhotosFound}</p>
            <button
              onClick={() => setActiveTab('camera')}
              className="mt-3 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl"
            >
              {t.takeFirstPhoto}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className="group relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500 cursor-pointer transition-all flex flex-col"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                  <img
                    src={photo.stampedImageDataUrl || photo.originalImageDataUrl}
                    alt={photo.workCategory}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-mono bg-slate-950/80 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {photo.wardNumber}
                  </span>
                </div>
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-white truncate">{photo.workCategory}</div>
                    <div className="text-[10px] text-slate-400 truncate">{photo.workerName}</div>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1">
                    {photo.formattedDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
