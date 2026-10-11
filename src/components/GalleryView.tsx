import React, { useState } from 'react';
import {
  Search,
  Filter,
  Calendar,
  User,
  MapPin,
  Briefcase,
  Share2,
  Download,
  Trash2,
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Layers,
  ChevronDown,
  Info,
  CheckSquare,
  Square,
  Archive,
  Loader2,
  Check
} from 'lucide-react';
import { AppSettings, PhotoRecord, Ward, Worker, WorkCategory } from '../types';
import { translations } from '../i18n/translations';
import { formatCoordinates } from '../services/gps';
import { exportPhotosAsZip } from '../services/zipExport';

interface GalleryViewProps {
  photos: PhotoRecord[];
  workers: Worker[];
  wards: Ward[];
  categories: WorkCategory[];
  settings: AppSettings;
  selectedPhoto: PhotoRecord | null;
  setSelectedPhoto: (photo: PhotoRecord | null) => void;
  onDeletePhoto: (id: string) => void;
  onBatchDeletePhotos?: (ids: string[]) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  workers,
  wards,
  categories,
  settings,
  selectedPhoto,
  setSelectedPhoto,
  onDeletePhoto,
  onBatchDeletePhotos,
}) => {
  const t = translations[settings.language];

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWorkerId, setFilterWorkerId] = useState('all');
  const [filterWardId, setFilterWardId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Multi-Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipProgressLabel, setZipProgressLabel] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportIncludeStamped, setExportIncludeStamped] = useState(true);
  const [exportIncludeOriginal, setExportIncludeOriginal] = useState(true);
  const [exportIncludeCsv, setExportIncludeCsv] = useState(true);
  const [exportIncludeJson, setExportIncludeJson] = useState(true);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  // Photo viewer modal state
  const [viewVersion, setViewVersion] = useState<'stamped' | 'original'>('stamped');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter application
  const filteredPhotos = photos.filter((p) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.workerName.toLowerCase().includes(q) ||
        p.wardNumber.toLowerCase().includes(q) ||
        (p.areaName && p.areaName.toLowerCase().includes(q)) ||
        p.workCategory.toLowerCase().includes(q) ||
        (p.address?.formattedAddress && p.address.formattedAddress.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Worker filter
    if (filterWorkerId !== 'all') {
      const targetWorker = workers.find((w) => w.id === filterWorkerId);
      if (targetWorker && p.workerId !== targetWorker.workerId && p.workerName !== targetWorker.fullName) {
        return false;
      }
    }

    // Ward filter
    if (filterWardId !== 'all') {
      const targetWard = wards.find((w) => w.id === filterWardId);
      if (targetWard && !p.wardNumber.includes(targetWard.wardNumber)) {
        return false;
      }
    }

    // Category filter
    if (filterCategory !== 'all' && p.workCategory !== filterCategory) {
      return false;
    }

    // Verification filter
    if (filterVerification === 'verified' && p.wardVerificationMethod !== 'boundary_verified') {
      return false;
    }
    if (filterVerification === 'manual' && p.wardVerificationMethod !== 'manually_selected') {
      return false;
    }

    // Date filter
    if (filterDate) {
      const [fYear, fMonth, fDay] = filterDate.split('-');
      const targetFormatted = `${fDay}-${fMonth}-${fYear}`;
      if (p.formattedDate !== targetFormatted) {
        return false;
      }
    }

    return true;
  });

  // Toggle selection for a single photo
  const toggleSelectPhoto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all currently filtered photos
  const handleSelectAll = () => {
    const allFilteredIds = filteredPhotos.map((p) => p.id);
    setSelectedPhotoIds(new Set(allFilteredIds));
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedPhotoIds(new Set());
  };

  // Toggle selection mode on/off
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedPhotoIds(new Set());
    } else {
      setIsSelectionMode(true);
    }
  };

  // Open Export Modal
  const handleOpenExportModal = () => {
    const targetPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));
    if (targetPhotos.length === 0) {
      alert('Please select at least one photograph to export.');
      return;
    }
    setShowExportModal(true);
  };

  // Execute Batch Export with JSZip utility
  const handleExecuteBatchExport = async () => {
    const targetPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));
    if (targetPhotos.length === 0) return;

    if (!exportIncludeStamped && !exportIncludeOriginal) {
      alert('Please select at least one photo type (Stamped or Original) to export.');
      return;
    }

    setIsExportingZip(true);
    setZipProgress(0);
    setZipProgressLabel('Initializing ZIP archive...');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `SumitTag_Batch_Export_${timestamp}.zip`;

      await exportPhotosAsZip(
        targetPhotos,
        filename,
        (progress, label) => {
          setZipProgress(progress);
          if (label) setZipProgressLabel(label);
        },
        {
          includeStamped: exportIncludeStamped,
          includeOriginal: exportIncludeOriginal,
          includeCsvManifest: exportIncludeCsv,
          includeJsonMetadata: exportIncludeJson,
        }
      );

      // Keep open briefly then close
      setTimeout(() => {
        setShowExportModal(false);
        setIsExportingZip(false);
      }, 800);
    } catch (err: any) {
      console.error('ZIP export error:', err);
      alert('Failed to create ZIP export: ' + (err.message || 'Unknown error'));
      setIsExportingZip(false);
    }
  };

  // Batch Delete execution
  const handleConfirmBatchDelete = () => {
    if (onBatchDeletePhotos) {
      onBatchDeletePhotos(Array.from(selectedPhotoIds));
    } else {
      // Fallback
      selectedPhotoIds.forEach((id) => onDeletePhoto(id));
    }
    setSelectedPhotoIds(new Set());
    setShowBatchDeleteModal(false);
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareWhatsApp = (photo: PhotoRecord) => {
    const text = encodeURIComponent(
      `*SUMIT TAG – GPS MAP CAMERA*\n` +
      `Worker: ${photo.workerName}\n` +
      `Category: ${photo.workCategory}\n` +
      `Ward: ${photo.wardNumber} (${photo.areaName || ''})\n` +
      `GPS: ${photo.latitude.toFixed(5)}° N, ${photo.longitude.toFixed(5)}° E (±${photo.gpsAccuracy}m)\n` +
      `Date/Time: ${photo.formattedDate} ${photo.formattedTime}\n` +
      `Address: ${photo.address?.formattedAddress || 'N/A'}\n` +
      `Maps link: https://maps.google.com/?q=${photo.latitude},${photo.longitude}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareNative = async (photo: PhotoRecord) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sumit Tag - ${photo.workCategory} (${photo.wardNumber})`,
          text: `Geotagged Work Photo by ${photo.workerName} at ${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)} on ${photo.formattedDate}`,
          url: `https://maps.google.com/?q=${photo.latitude},${photo.longitude}`,
        });
      } catch {
        // User cancelled share
      }
    } else {
      shareWhatsApp(photo);
    }
  };

  const hasSelectedPhotos = selectedPhotoIds.size > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header, Search & Multi-Select Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t.navGallery}</h1>
            <span className="text-xs font-mono font-normal bg-blue-600/30 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/30">
              {filteredPhotos.length} / {photos.length} photos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hierarchical municipal album: <code className="text-slate-300">Sumit Tag/YYYY/MM/Ward_XX/</code>
          </p>
        </div>

        {/* Action Controls & Search */}
        <div className="flex items-center gap-2">
          {/* Multi-Select Toggle Button */}
          <button
            onClick={toggleSelectionMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              isSelectionMode || hasSelectedPhotos
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-700/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            {isSelectionMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            <span>{isSelectionMode ? t.deselectAll : t.selectMode}</span>
          </button>

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky / Active Batch Action Bar when photos are selected or selection mode is on */}
      {(isSelectionMode || hasSelectedPhotos) && (
        <div className="sticky top-14 z-30 bg-blue-950/90 backdrop-blur-md border border-blue-700/60 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-400/40">
              {selectedPhotoIds.size}
            </div>
            <div>
              <span className="text-white font-bold text-xs">
                {selectedPhotoIds.size} {t.selectedCount}
              </span>
              <span className="text-[11px] text-blue-300 block">
                {selectedPhotoIds.size === filteredPhotos.length
                  ? 'All filtered photos selected'
                  : `Out of ${filteredPhotos.length} filtered photos`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 text-xs font-semibold border border-blue-700/50"
            >
              {t.selectAll} ({filteredPhotos.length})
            </button>

            {/* Clear Selection */}
            {hasSelectedPhotos && (
              <button
                onClick={handleDeselectAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
              >
                {t.deselectAll}
              </button>
            )}

            {/* BATCH EXPORT (ZIP) BUTTON */}
            <button
              onClick={handleOpenExportModal}
              disabled={!hasSelectedPhotos || isExportingZip}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !hasSelectedPhotos || isExportingZip
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/30'
              }`}
            >
              {isExportingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {t.exportingZip} ({zipProgress}%)
                  </span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>{t.batchExportZip}</span>
                </>
              )}
            </button>

            {/* Delete Selected Button */}
            {hasSelectedPhotos && (
              <button
                onClick={() => setShowBatchDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold border border-rose-500/40 transition-colors"
                title={t.batchDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.batchDelete}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
        {/* Worker */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
            <User className="w-3 h-3 text-blue-400" />
            <span>Worker</span>
          </label>
          <select
            value={filterWorkerId}
            onChange={(e) => setFilterWorkerId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none truncate"
          >
            <option value="all">All Workers</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Ward */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-400" />
            <span>Ward</span>
          </label>
          <select
            value={filterWardId}
            onChange={(e) => setFilterWardId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none truncate"
          >
            <option value="all">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.wardNumber} - {w.wardName}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-blue-400" />
            <span>Category</span>
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none truncate"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={settings.language === 'mr' ? c.nameMr : settings.language === 'hi' ? c.nameHi : c.nameEn}>
                {settings.language === 'mr' ? c.nameMr : settings.language === 'hi' ? c.nameHi : c.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Verification Status */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            <span>GPS Status</span>
          </label>
          <select
            value={filterVerification}
            onChange={(e) => setFilterVerification(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none"
          >
            <option value="all">All Verification</option>
            <option value="verified">Boundary Verified</option>
            <option value="manual">Manually Selected</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col col-span-2 sm:col-span-1">
          <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span>Date</span>
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 outline-none text-xs"
          />
        </div>
      </div>

      {/* Grid of Photo Cards */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-white font-bold text-base mb-1">{t.noPhotosFound}</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Try adjusting your search query, dates, or active filters above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => {
            const isSelected = selectedPhotoIds.has(photo.id);

            return (
              <div
                key={photo.id}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelectPhoto(photo.id);
                  } else {
                    setSelectedPhoto(photo);
                    setViewVersion('stamped');
                  }
                }}
                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all cursor-pointer shadow-lg group flex flex-col relative ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500 shadow-blue-900/40'
                    : 'border-slate-800 hover:border-blue-500/80'
                }`}
              >
                {/* Thumbnail with overlay badges */}
                <div className="relative aspect-[4/3] bg-black overflow-hidden">
                  <img
                    src={photo.stampedImageDataUrl || photo.originalImageDataUrl}
                    alt={photo.workCategory}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Multi-Select Checkbox Trigger (Top-Right) */}
                  <div
                    onClick={(e) => toggleSelectPhoto(photo.id, e)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-md transition-transform hover:scale-110"
                    title={isSelected ? 'Deselect photo' : 'Select photo'}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-white text-white shadow-lg shadow-blue-700/60'
                          : 'bg-slate-950/70 border-white/40 text-transparent hover:border-white'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                  </div>

                  {/* Top Ward Pill */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/10">
                      {photo.wardNumber}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md ${
                      photo.wardVerificationMethod === 'boundary_verified'
                        ? 'bg-emerald-500/80 text-white'
                        : 'bg-amber-500/80 text-slate-950'
                    }`}>
                      {photo.wardVerificationMethod === 'boundary_verified' ? '✓ VERIFIED' : 'ℹ MANUAL'}
                    </span>
                  </div>

                  {/* Accuracy Pill */}
                  <span className="absolute bottom-2 right-2 bg-slate-950/85 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-md border border-emerald-500/30">
                    ±{photo.gpsAccuracy}m
                  </span>
                </div>

                {/* Information Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-white font-bold text-sm tracking-tight leading-snug line-clamp-1">
                        {photo.workCategory}
                      </h3>
                    </div>
                    <div className="text-xs text-blue-400 font-medium mt-0.5">
                      {photo.workerName}
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{photo.address?.formattedAddress || 'Address Not Available'}</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span>{photo.formattedDate}</span>
                      <span>{photo.formattedTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Batch Export Modal (JSZip Bundling for Original & Stamped Photos) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Bundle & Export to ZIP</h3>
                  <p className="text-xs text-slate-400">
                    Bundling {selectedPhotoIds.size} records into a single ZIP archive
                  </p>
                </div>
              </div>
              {!isExportingZip && (
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selection Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Stamped Photos</span>
                <span className="text-white font-bold text-base mt-0.5 block">
                  {photos.filter((p) => selectedPhotoIds.has(p.id) && Boolean(p.stampedImageDataUrl)).length} Files
                </span>
                <span className="text-[10px] text-blue-400">With location watermark</span>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Original Photos</span>
                <span className="text-white font-bold text-base mt-0.5 block">
                  {photos.filter((p) => selectedPhotoIds.has(p.id) && Boolean(p.originalImageDataUrl)).length} Files
                </span>
                <span className="text-[10px] text-amber-400">Raw unwatermarked frames</span>
              </div>
            </div>

            {/* Content Checkboxes */}
            <div className="space-y-2 text-xs">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Archive Contents
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={exportIncludeStamped}
                  onChange={(e) => setExportIncludeStamped(e.target.checked)}
                  disabled={isExportingZip}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600"
                />
                <div>
                  <span className="text-white font-medium block">Include Stamped Photos</span>
                  <span className="text-slate-400 text-[11px]">Placed in <code className="text-blue-300">Sumit_Tag_Export/Stamped/</code></span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={exportIncludeOriginal}
                  onChange={(e) => setExportIncludeOriginal(e.target.checked)}
                  disabled={isExportingZip}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600"
                />
                <div>
                  <span className="text-white font-medium block">Include Original Photos</span>
                  <span className="text-slate-400 text-[11px]">Placed in <code className="text-amber-300">Sumit_Tag_Export/Original/</code></span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={exportIncludeCsv}
                  onChange={(e) => setExportIncludeCsv(e.target.checked)}
                  disabled={isExportingZip}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600"
                />
                <div>
                  <span className="text-white font-medium block">Include Municipal CSV Audit Manifest</span>
                  <span className="text-slate-400 text-[11px]"><code className="text-emerald-300">MUNICIPAL_GEOTAG_MANIFEST.csv</code> with GPS data & timestamps</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={exportIncludeJson}
                  onChange={(e) => setExportIncludeJson(e.target.checked)}
                  disabled={isExportingZip}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600"
                />
                <div>
                  <span className="text-white font-medium block">Include JSON Metadata Record</span>
                  <span className="text-slate-400 text-[11px]"><code className="text-cyan-300">photos_metadata.json</code> for database backup or GIS import</span>
                </div>
              </label>
            </div>

            {/* Packaging Progress Status */}
            {isExportingZip && (
              <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>{zipProgressLabel || 'Packaging files...'}</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{zipProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${zipProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={isExportingZip}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchExport}
                disabled={isExportingZip}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-700/30 disabled:opacity-50"
              >
                {isExportingZip ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Packaging ZIP...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download ZIP Archive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-white font-bold text-base">{t.batchDelete}</h3>
            </div>
            <p className="text-xs text-slate-300">
              {t.confirmBatchDelete}
            </p>
            <p className="text-xs font-mono text-rose-400">
              Total to delete: {selectedPhotoIds.size} photographs
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Inspector Full Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-bold text-base sm:text-lg">{selectedPhoto.workCategory}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedPhoto.wardVerificationMethod === 'boundary_verified'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedPhoto.wardVerificationMethod === 'boundary_verified' ? '✓ BOUNDARY VERIFIED' : 'ℹ MANUALLY SELECTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Worker: <span className="text-slate-200 font-medium">{selectedPhoto.workerName}</span> ({selectedPhoto.workerId})
                </p>
              </div>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Version Switcher (Stamped vs Original) */}
            {selectedPhoto.originalImageDataUrl && (
              <div className="flex items-center justify-center gap-2">
                <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700/60 text-xs">
                  <button
                    onClick={() => setViewVersion('stamped')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      viewVersion === 'stamped' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Stamped Photo (With Watermark)
                  </button>
                  <button
                    onClick={() => setViewVersion('original')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      viewVersion === 'original' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Original Photo (Raw)
                  </button>
                </div>
              </div>
            )}

            {/* Photo View Box */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-[4/3] max-h-[50vh] flex items-center justify-center">
              <img
                src={viewVersion === 'original' && selectedPhoto.originalImageDataUrl ? selectedPhoto.originalImageDataUrl : selectedPhoto.stampedImageDataUrl}
                alt="Selected photograph"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Detailed Metadata Grid */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 font-medium">Ward:</span>{' '}
                  <span className="text-white font-semibold">{selectedPhoto.wardNumber} - {selectedPhoto.areaName || 'Area'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Date & Time:</span>{' '}
                  <span className="text-white font-mono">{selectedPhoto.formattedDate} {selectedPhoto.formattedTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">GPS Coordinates:</span>{' '}
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatCoordinates(selectedPhoto.latitude, selectedPhoto.longitude).fullStr}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Accuracy:</span>{' '}
                  <span className="text-white font-mono">±{selectedPhoto.gpsAccuracy}m</span>
                  {selectedPhoto.altitude !== null && selectedPhoto.altitude !== undefined && (
                    <span className="text-slate-400 font-mono ml-2">Alt: {selectedPhoto.altitude}m</span>
                  )}
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="text-slate-400 font-medium">Address:</span>{' '}
                  <span className="text-slate-200">{selectedPhoto.address?.formattedAddress || 'Not Available'}</span>
                </div>
                {selectedPhoto.notes && (
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-slate-400 font-medium">Notes:</span>{' '}
                    <span className="text-amber-200 italic">{selectedPhoto.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons: Open Maps, Share, Download, Delete */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://maps.google.com/?q=${selectedPhoto.latitude},${selectedPhoto.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t.viewOnMap}</span>
                </a>

                <button
                  onClick={() => shareNative(selectedPhoto)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t.sharePhoto}</span>
                </button>

                <button
                  onClick={() => downloadImage(selectedPhoto.stampedImageDataUrl, `SumitTag_${selectedPhoto.wardNumber}_stamped.jpg`)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.downloadStamped}</span>
                </button>

                {selectedPhoto.originalImageDataUrl && (
                  <button
                    onClick={() => downloadImage(selectedPhoto.originalImageDataUrl!, `SumitTag_${selectedPhoto.wardNumber}_raw.jpg`)}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.downloadOriginal}</span>
                  </button>
                )}
              </div>

              {/* Delete Button */}
              <div>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-xl text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.deletePhoto}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-rose-500/20 p-1.5 rounded-xl border border-rose-500/30">
                    <span className="text-[11px] text-rose-300 font-medium px-1">Confirm delete?</span>
                    <button
                      onClick={() => {
                        onDeletePhoto(selectedPhoto.id);
                        setSelectedPhoto(null);
                        setShowDeleteConfirm(false);
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded-lg text-xs font-bold"
                    >
                      {t.delete}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-slate-400 hover:text-white px-2 py-1 text-xs"
                    >
                      {t.cancel}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
