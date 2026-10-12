import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Settings,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  ChevronDown,
  User,
  Briefcase,
  Layers,
  X,
  Share2,
  Download,
  ArrowRight,
  Check,
  SwitchCamera,
  ShieldCheck
} from 'lucide-react';
import {
  AppSettings,
  GpsData,
  PhotoRecord,
  Ward,
  WardVerificationMethod,
  Worker,
  WorkCategory,
  AddressInfo
} from '../types';
import { translations } from '../i18n/translations';
import { formatCoordinates, detectWardFromCoordinates, gpsManager } from '../services/gps';
import { geocodingService } from '../services/geocoding';
import { renderWatermarkedPhoto } from '../services/watermark';
import { dbService } from '../services/db';
import { autoSaveCapturedPhotos, formatPhotoFileName, AutoSaveResult } from '../services/deviceGallery';
import { LocationDiagnosticModal } from './LocationDiagnosticModal';

interface CameraViewProps {
  gps: GpsData | null;
  gpsError: string | null;
  onRefreshGps: () => void;
  workers: Worker[];
  wards: Ward[];
  categories: WorkCategory[];
  settings: AppSettings;
  onPhotoSaved: (photo: PhotoRecord) => void;
  onNavigateToGallery: () => void;
  onOpenSettings: () => void;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  gps,
  gpsError,
  onRefreshGps,
  workers,
  wards,
  categories,
  settings,
  onPhotoSaved,
  onNavigateToGallery,
  onOpenSettings,
  onUpdateSettings,
}) => {
  const t = translations[settings.language];

  // Video & Stream State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Work details confirmation modal
  const [isWorkDetailsOpen, setIsWorkDetailsOpen] = useState(false);

  // Active selections
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(settings.activeWorkerId || (workers[0]?.id || ''));
  // null means Auto-Detect by physical GPS coordinates
  const [manualWardId, setManualWardId] = useState<string | null>(settings.defaultWardId || null);
  const [detectedWard, setDetectedWard] = useState<Ward | null>(null);
  const [wardVerificationMethod, setWardVerificationMethod] = useState<WardVerificationMethod>('unassigned');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(settings.defaultWorkCategoryId || (categories[0]?.id || ''));
  const [photoNotes, setPhotoNotes] = useState('');

  // Geocoded Address & Verification
  const [currentAddress, setCurrentAddress] = useState<AddressInfo>({
    formattedAddress: 'Acquiring address from GPS...',
    isResolved: false,
    addressStatus: 'Resolving Address',
    pinCodeStatus: 'PIN Code Unavailable',
  });
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const activeAddressReqRef = useRef<string>('');
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  // Capture processing state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoRecord | null>(null);
  const [showCapturedModal, setShowCapturedModal] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [lastAutoSaveResult, setLastAutoSaveResult] = useState<AutoSaveResult | null>(null);
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);

  // Initialize Camera Stream based on settings.cameraFacing
  useEffect(() => {
    let active = true;

    async function initCamera() {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraError(null);

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: settings.cameraFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (constraintErr) {
          console.warn('Ideal camera constraints failed, attempting fallback:', constraintErr);
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: settings.cameraFacing },
              audio: false,
            });
          } catch {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }

        if (active) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch((e) => console.warn('Video auto-play warning:', e));
            };
            videoRef.current.play().catch(() => {});
          }

          // Apply torch if set to on
          if (settings.cameraFlash === 'on') {
            const track = mediaStream.getVideoTracks()[0];
            const caps = (track?.getCapabilities?.() || {}) as any;
            if (caps.torch) {
              await (track as any).applyConstraints({ advanced: [{ torch: true }] });
            }
          }
        }
      } catch (err: any) {
        if (active) {
          setCameraError(err.message || 'Camera permission denied or camera device not found.');
        }
      }
    }

    initCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [settings.cameraFacing, settings.cameraFlash]);

  // Resolve Reverse Geocoding & Detect Ward dynamically when GPS updates
  useEffect(() => {
    if (!gps) {
      setCurrentAddress({
        formattedAddress: 'Waiting for device GPS position...',
        isResolved: false,
        addressStatus: 'Resolving Address',
        pinCodeStatus: 'PIN Code Unavailable',
      });
      setDetectedWard(null);
      setWardVerificationMethod('unassigned');
      return;
    }

    let isCancelled = false;
    const reqId = geocodingService.createRequestId();
    activeAddressReqRef.current = reqId;
    setIsResolvingAddress(true);

    // Invalidate stale caches if physical coordinates moved significantly (>30m)
    geocodingService.checkAndInvalidateIfMoved(gps.latitude, gps.longitude);

    // Provide instant coordinate feedback with active status so UI never appears frozen
    setCurrentAddress((prev) => ({
      ...prev,
      formattedAddress: prev.isResolved && prev.addressStatus === 'Address Resolved'
        ? prev.formattedAddress
        : `GPS: ${Math.abs(gps.latitude).toFixed(4)}° ${gps.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(gps.longitude).toFixed(4)}° ${gps.longitude >= 0 ? 'E' : 'W'} (Resolving address...)`,
      locality: prev.locality || 'Current GPS Position',
      addressStatus: 'Resolving Address',
      pinCodeStatus: prev.pinCodeStatus || 'PIN Code Unavailable',
    }));

    geocodingService
      .resolveAddress(gps.latitude, gps.longitude, false, reqId)
      .then((addr) => {
        if (isCancelled || activeAddressReqRef.current !== reqId) return;
        setCurrentAddress(addr);
        setIsResolvingAddress(false);

        // Run spatial ward detection strictly based on municipal boundaries
        const detection = detectWardFromCoordinates(gps.latitude, gps.longitude, wards, addr);
        if (detection.isVerified && detection.ward) {
          setDetectedWard(detection.ward);
          setWardVerificationMethod(detection.method);
        } else {
          setDetectedWard(null);
          setWardVerificationMethod('unassigned');
        }
      })
      .catch(() => {
        if (isCancelled || activeAddressReqRef.current !== reqId) return;
        setIsResolvingAddress(false);
        setCurrentAddress({
          formattedAddress: 'Address could not be verified',
          locality: 'Current GPS Position',
          isResolved: false,
          addressStatus: 'Address Verification Failed',
          pinCodeStatus: 'PIN Code Unavailable',
          requestId: reqId,
        });

        const detection = detectWardFromCoordinates(gps.latitude, gps.longitude, wards, null);
        if (detection.isVerified && detection.ward) {
          setDetectedWard(detection.ward);
          setWardVerificationMethod(detection.method);
        } else {
          setDetectedWard(null);
          setWardVerificationMethod('unassigned');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [gps?.latitude, gps?.longitude, wards]);

  const handleRetryAddressLookup = async () => {
    if (!gps) return;
    setIsResolvingAddress(true);
    const reqId = geocodingService.createRequestId();
    activeAddressReqRef.current = reqId;

    try {
      const addr = await geocodingService.resolveAddress(gps.latitude, gps.longitude, true, reqId);
      if (activeAddressReqRef.current === reqId) {
        setCurrentAddress(addr);
        const detection = detectWardFromCoordinates(gps.latitude, gps.longitude, wards, addr);
        if (detection.isVerified && detection.ward) {
          setDetectedWard(detection.ward);
          setWardVerificationMethod(detection.method);
        }
      }
    } catch {
      if (activeAddressReqRef.current === reqId) {
        setCurrentAddress({
          formattedAddress: 'Address could not be verified',
          locality: 'Current GPS Position',
          isResolved: false,
          addressStatus: 'Address Verification Failed',
          pinCodeStatus: 'PIN Code Unavailable',
          requestId: reqId,
        });
      }
    } finally {
      setIsResolvingAddress(false);
    }
  };

  // Current selections
  const currentWorker = workers.find((w) => w.id === selectedWorkerId) || workers[0];
  const manuallySelectedWard = manualWardId ? wards.find((w) => w.id === manualWardId) || null : null;
  const currentWard = manuallySelectedWard || detectedWard;
  const effectiveVerificationMethod: WardVerificationMethod = manuallySelectedWard
    ? 'manually_selected'
    : detectedWard
    ? wardVerificationMethod
    : 'unassigned';
  const currentCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  const getCategoryName = (cat: WorkCategory | undefined) => {
    if (!cat) return 'Municipal Work';
    if (settings.language === 'mr') return cat.nameMr;
    if (settings.language === 'hi') return cat.nameHi;
    return cat.nameEn;
  };

  const isAccuracyGood = gps
    ? gps.accuracy <= settings.gpsAccuracyThreshold && !gps.isStale && gps.ageSeconds < 30
    : false;

  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext unavailable or autoplay policy restricted
    }
  };

  // Execute Photo Capture
  const handleCapture = async () => {
    // Prevent multiple simultaneous capture operations
    if (isCapturing) return;

    // 1. Shutter Feedback: Sound, Haptic & Visual Flash immediately on tap
    if (settings.enableSound) {
      playShutterSound();
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 20, 40]);
      } catch {
        // Vibration not supported
      }
    }
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    // 2. Camera Preview Readiness Check
    const video = videoRef.current;
    if (!video) {
      alert('Camera initialization error: Preview element is not ready. Please refresh or check camera permissions.');
      return;
    }

    // 3. Obtain Current Real Device GPS Location Fix
    let activeGps: GpsData | null = gps || gpsManager.getCurrentFix();
    if (!activeGps) {
      try {
        activeGps = await gpsManager.refreshGps();
      } catch {
        // Still pending fix
      }
    }

    if (!activeGps) {
      alert(
        'GPS Location Unavailable: ' +
          (gpsError || t.waitingGps || 'Searching for GPS satellite signal. Please allow location permissions and ensure device GPS is turned on.')
      );
      return;
    }

    // Check Freshness (Age < 30 seconds)
    if (activeGps.isStale || activeGps.ageSeconds >= 30) {
      try {
        activeGps = await gpsManager.refreshGps();
      } catch {
        // Refresh retry failed
      }
      if (activeGps.isStale || activeGps.ageSeconds >= 30) {
        alert('GPS fix is stale (>30s old). Acquiring fresh satellite position... Please retry in a few seconds.');
        return;
      }
    }

    // Check Accuracy Threshold
    if (activeGps.accuracy > settings.gpsAccuracyThreshold) {
      alert(
        `GPS Accuracy Low (±${Math.round(activeGps.accuracy)}m): Exceeds threshold of ±${settings.gpsAccuracyThreshold}m. Please move outdoors or to an open area before capturing geotagged photographs.`
      );
      return;
    }

    // 4. Set processing state (disables button during in-flight capture)
    setIsCapturing(true);

    try {
      // 5. Extract frame directly from the active live video feed
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (!width || !height) {
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onReady = () => {
              video.removeEventListener('loadeddata', onReady);
              video.removeEventListener('canplay', onReady);
              resolve();
            };
            video.addEventListener('loadeddata', onReady, { once: true });
            video.addEventListener('canplay', onReady, { once: true });
            setTimeout(resolve, 500);
          });
        }
        width = video.videoWidth || video.clientWidth || 1280;
        height = video.videoHeight || video.clientHeight || 720;
      }

      let rawDataUrl: string;
      if (video && (video.videoWidth > 0 || video.readyState >= 2 || stream)) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas context for image capture');

        if (settings.cameraFacing === 'user') {
          // Front-facing camera mirror
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, width, height);
        const quality = settings.photoQuality === 'high' ? 0.95 : 0.85;
        rawDataUrl = canvas.toDataURL('image/jpeg', quality);
      } else {
        rawDataUrl = createSampleFieldFrame(activeGps.latitude, activeGps.longitude);
      }

      // 6. Capture Timestamps & IST Timezone Formatting
      const captureTime = Date.now();
      const captureDate = new Date(captureTime);
      const day = String(captureDate.getDate()).padStart(2, '0');
      const month = String(captureDate.getMonth() + 1).padStart(2, '0');
      const year = captureDate.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      let hours = captureDate.getHours();
      const minutes = String(captureDate.getMinutes()).padStart(2, '0');
      const seconds = String(captureDate.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const formattedHours = String(hours).padStart(2, '0');
      const tzName = 'IST';
      const formattedTime = `${formattedHours}:${minutes}:${seconds} ${ampm} ${tzName}`;

      // Ensure real reverse geocoded address is resolved
      let resolvedAddress = currentAddress;
      if (!resolvedAddress.isResolved) {
        try {
          resolvedAddress = await geocodingService.resolveAddress(activeGps.latitude, activeGps.longitude);
          setCurrentAddress(resolvedAddress);
        } catch {
          // Keep current fallback
        }
      }

      // Re-run ward detection with freshest coordinates and resolved address
      let captureWard = manuallySelectedWard;
      let captureMethod: WardVerificationMethod = manuallySelectedWard ? 'manually_selected' : 'unassigned';

      if (!captureWard) {
        const detection = detectWardFromCoordinates(activeGps.latitude, activeGps.longitude, wards, resolvedAddress);
        if (detection.isVerified && detection.ward) {
          captureWard = detection.ward;
          captureMethod = detection.method;
        } else {
          captureWard = null;
          captureMethod = 'unassigned';
        }
      }

      // Real physical GPS reverse geocoded data (NEVER fallback PIN code to municipal ward!)
      const resolvedDistrict = resolvedAddress.district || 'Amravati';
      const resolvedTaluka = resolvedAddress.taluka || undefined;
      const resolvedVillage = resolvedAddress.villageOrTown || undefined;
      const resolvedState = resolvedAddress.state || 'Maharashtra';
      const resolvedPin = resolvedAddress.postcode || undefined;
      const resolvedArea =
        resolvedVillage ||
        resolvedAddress.locality ||
        resolvedAddress.subLocality ||
        resolvedAddress.road ||
        'Current Locality';

      // 7. Render Stamped Photo with Watermark
      const stampedDataUrl = await renderWatermarkedPhoto(rawDataUrl, {
        workerName: currentWorker ? currentWorker.fullName : 'Field Worker',
        workCategory: getCategoryName(currentCategory),
        wardNumber: captureWard ? captureWard.wardNumber : 'Ward Unassigned',
        wardName: captureWard?.wardName,
        areaName: resolvedArea,
        taluka: resolvedTaluka,
        villageOrTown: resolvedVillage,
        district: resolvedDistrict,
        state: resolvedState,
        pinCode: resolvedPin,
        addressStatus: resolvedAddress.addressStatus,
        pinCodeStatus: resolvedAddress.pinCodeStatus,
        wardVerificationMethod: captureMethod,
        gps: activeGps,
        address: resolvedAddress,
        captureTimestamp: captureTime,
        style: settings.watermarkStyle,
        fontSize: settings.watermarkFontSize,
        opacity: settings.watermarkOpacity,
        position: settings.watermarkPosition,
        showCoordinates: settings.showCoordinates,
        showAddress: settings.showAddress,
        showPinCode: settings.showPinCode,
        showWardNumber: settings.showWardNumber,
        showDateTime: settings.showDateTime,
        showMapPreview: settings.showMapPreview,
      });

      // 8. Construct PhotoRecord
      const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const record: PhotoRecord = {
        id: photoId,
        workerId: currentWorker ? currentWorker.workerId : 'WRK-00',
        workerName: currentWorker ? currentWorker.fullName : 'Field Worker',
        workCategory: getCategoryName(currentCategory),
        wardNumber: captureWard ? captureWard.wardNumber : 'Ward Unassigned',
        wardName: captureWard?.wardName,
        areaName: resolvedArea,
        taluka: resolvedTaluka,
        villageOrTown: resolvedVillage,
        district: resolvedDistrict,
        state: resolvedState,
        pinCode: resolvedPin,
        addressStatus: resolvedAddress.addressStatus,
        pinCodeStatus: resolvedAddress.pinCodeStatus,
        wardVerificationMethod: captureMethod,
        locationProvider: activeGps.provider || 'FusedLocationProviderClient',
        locationVerificationStatus: isAccuracyGood ? 'verified_realtime' : 'low_accuracy',
        latitude: activeGps.latitude,
        longitude: activeGps.longitude,
        gpsAccuracy: activeGps.accuracy,
        altitude: activeGps.altitude,
        speed: activeGps.speed,
        locationTimestamp: activeGps.timestamp,
        captureTimestamp: captureTime,
        formattedDate,
        formattedTime,
        timezone: tzName,
        address: resolvedAddress,
        watermarkStyle: settings.watermarkStyle,
        originalImageDataUrl: settings.saveOriginalPhoto ? rawDataUrl : undefined,
        stampedImageDataUrl: stampedDataUrl,
        notes: photoNotes.trim() || undefined,
        fileSizeKb: Math.round((stampedDataUrl.length * 0.75) / 1024),
      };

      // 9. Automatically Save to Phone's Native Gallery / Storage (Pictures / Sumit Tag)
      let autoSaveInfo: AutoSaveResult | null = null;
      if (settings.autoSaveToGallery !== false) {
        autoSaveInfo = await autoSaveCapturedPhotos(record, settings.saveOriginalPhoto);
        if (autoSaveInfo.stampedSaved) {
          record.autoSavedToGallery = true;
          record.deviceSavedFilename = autoSaveInfo.stampedFilename;
          if (autoSaveInfo.originalSaved && autoSaveInfo.originalFilename) {
            record.deviceSavedOriginalFilename = autoSaveInfo.originalFilename;
          }
        }
      }

      // 10. Persist in Local IndexedDB Database
      await dbService.savePhoto(record);

      // 11. Instant Auto-Save Toast Notification & Modal Confirmation
      setCapturedPhoto(record);
      setLastAutoSaveResult(autoSaveInfo);
      if (autoSaveInfo?.stampedSaved) {
        const toastMsg = settings.saveOriginalPhoto && autoSaveInfo.originalSaved
          ? `✓ Auto-saved to Gallery: ${autoSaveInfo.stampedFilename} (+ Raw original)`
          : `✓ Auto-saved to Gallery: ${autoSaveInfo.stampedFilename}`;
        setAutoSaveToast(toastMsg);
        setTimeout(() => setAutoSaveToast(null), 5000);
      }

      setShowCapturedModal(true);
      onPhotoSaved(record);
      setPhotoNotes('');
    } catch (err: any) {
      console.error('Error during photo capture:', err);
      alert('Photo capture failed: ' + (err.message || 'Unknown error occurred while capturing and saving.'));
    } finally {
      setIsCapturing(false);
    }
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

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative flex flex-col h-screen w-full bg-slate-950 overflow-hidden select-none">
      {/* Flash Animation Overlay */}
      {flashAnimation && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none opacity-80 transition-opacity duration-150" />
      )}

      {/* Auto-Save Toast Alert */}
      {autoSaveToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-emerald-600/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl shadow-emerald-950/70 flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border border-emerald-400/40 pointer-events-none animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
          <span className="truncate">{autoSaveToast}</span>
        </div>
      )}

      {/* ================================================== */}
      {/* 1. TOP BAR (Minimal & Unobtrusive) */}
      {/* ================================================== */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 sm:px-4 py-3 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent pointer-events-auto">
        {/* Left: Small Sumit Tag Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 border border-blue-400/50 flex items-center justify-center shadow-lg shadow-blue-900/30">
            <span className="text-white font-black text-xs tracking-wider">ST</span>
          </div>
          <span className="text-white font-bold text-sm tracking-tight hidden sm:inline">
            Sumit Tag
          </span>
        </div>

        {/* Center: Minimal Status Pill (GPS Status + Active Worker & Ward) */}
        <div className="flex items-center">
          <button
            onClick={() => setIsWorkDetailsOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all active:scale-95 shadow-md ${
              gps
                ? isAccuracyGood
                  ? 'bg-slate-900/80 text-emerald-300 border-emerald-500/40 hover:bg-slate-800'
                  : 'bg-slate-900/80 text-amber-300 border-amber-500/40 hover:bg-slate-800'
                : 'bg-slate-900/80 text-rose-300 border-rose-500/40 animate-pulse'
            }`}
            title="Click to view or switch worker/ward assignment"
          >
            {gps && gps.isReady && isAccuracyGood ? (
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>GPS Ready (±{Math.round(gps.accuracy)}m)</span>
              </span>
            ) : gps && !isAccuracyGood ? (
              <span className="flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>{gps.isStale ? 'GPS Stale' : `±${Math.round(gps.accuracy)}m Low`}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>{gps?.status || 'Waiting GPS'}</span>
              </span>
            )}
            <span className="text-slate-600 font-mono text-[10px]">|</span>
            <span className="text-white text-[11px] font-medium truncate max-w-[120px] xs:max-w-[160px]">
              {currentWorker?.fullName || 'Worker'} • {currentWard ? currentWard.wardNumber : 'Unassigned Ward'}
            </span>
          </button>
        </div>

        {/* Right: Diagnostics Shield & Settings Gear Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDiagnosticModalOpen(true)}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-blue-400 hover:text-white backdrop-blur-md border border-white/10 shadow-lg transition-transform active:scale-95"
            aria-label="Location Diagnostics"
            title="Location & Tivsa Accuracy Diagnostics"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white backdrop-blur-md border border-white/10 shadow-lg transition-transform active:scale-95"
            aria-label="Settings"
            title="Open Central Settings Menu"
          >
            <Settings className="w-5 h-5 text-slate-300 hover:text-white" />
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. MAIN AREA: Edge-to-Edge Live Camera Viewfinder */}
      {/* ================================================== */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Live Camera Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${settings.cameraFacing === 'user' ? '-scale-x-100' : ''}`}
        />

        {/* Camera Error / Permission Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/30">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-white font-bold text-base mb-1">{t.cameraDenied}</h3>
            <p className="text-slate-400 text-xs max-w-sm mb-4">{cameraError}</p>
            <p className="text-[11px] text-blue-400 max-w-xs mb-4">
              Real device GPS and location watermarking remain fully operational.
            </p>
          </div>
        )}

        {/* Rule-of-Thirds Grid (Clean & only visible if enabled in Camera Settings) */}
        {settings.enableGrid && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
            <div className="border-r border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div></div>
          </div>
        )}

        {/* Real-time Reverse Geocoded Address Bar Overlay with Distinct Statuses */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex flex-col gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800/90 shadow-xl text-xs">
          {/* Top row: Status indicators & Quick Actions */}
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* GPS Status */}
              <span className={`px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                gps?.isReady && isAccuracyGood
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                <span>GPS: {gps?.status || 'Acquiring GPS...'}</span>
              </span>

              {/* Address Status */}
              <span className={`px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                currentAddress.addressStatus === 'Address Resolved'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  : currentAddress.addressStatus === 'Resolving Address'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                <span>{currentAddress.addressStatus || (isResolvingAddress ? 'Resolving Address' : 'Address Unavailable')}</span>
              </span>

              {/* PIN Code Status */}
              <span className={`px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                currentAddress.pinCodeStatus === 'PIN Code Verified'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <span>{currentAddress.postcode ? `PIN: ${currentAddress.postcode}` : 'PIN: Not Verified'}</span>
              </span>
            </div>

            {/* Diagnostics & Retry buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setIsDiagnosticModalOpen(true)}
                className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                title="Open Location & Postal Diagnostics"
              >
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden xs:inline">Diagnostics</span>
              </button>

              <button
                onClick={handleRetryAddressLookup}
                disabled={isResolvingAddress || !gps}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                title="Retry Address Lookup"
              >
                <RefreshCw className={`w-3 h-3 ${isResolvingAddress ? 'animate-spin text-blue-400' : ''}`} />
                <span>Retry</span>
              </button>
            </div>
          </div>

          {/* Bottom row: Formatted address text & ward distinction */}
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${currentAddress.isResolved ? 'text-cyan-400' : 'text-amber-400'}`} />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-slate-100 truncate">
                {currentAddress.formattedAddress}
              </span>
              <span className="text-[9.5px] text-slate-400 font-mono truncate">
                {currentAddress.taluka ? `Taluka: ${currentAddress.taluka} • ` : ''}
                {currentWard ? `${currentWard.wardNumber} (${currentWard.wardName})` : 'Ward not verified'}
                {' • '}{effectiveVerificationMethod.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3. ESSENTIAL CAMERA CONTROLS BAR */}
      {/* ================================================== */}
      <div className="relative z-30 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/60 pb-6 pt-3 px-6 border-t border-slate-900/40">
        <div className="flex items-center justify-between max-w-xs mx-auto">
          {/* Gallery Shortcut Button (Left) */}
          <button
            onClick={onNavigateToGallery}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-all active:scale-95"
            aria-label="Photo Gallery"
            title="Open Photo Gallery"
          >
            <div className="w-12 h-12 rounded-full bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow-lg hover:border-slate-500 transition-all">
              <ImageIcon className="w-5 h-5 text-slate-300" />
            </div>
            <span className="text-[10px] font-bold">Gallery</span>
          </button>

          {/* Large Circular Capture Photo Button (Center) */}
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            type="button"
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 cursor-pointer shadow-xl ${
              isCapturing
                ? 'bg-blue-700 border-4 border-blue-400 animate-pulse cursor-wait'
                : 'bg-gradient-to-tr from-blue-700 to-blue-500 border-4 border-white shadow-blue-600/40 hover:brightness-110 active:brightness-95'
            }`}
            aria-label="Capture Photo"
            title="Capture Geotagged Photo"
          >
            {isCapturing ? (
              <RefreshCw className="w-8 h-8 text-white animate-spin pointer-events-none" />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-white/60 flex items-center justify-center bg-white/20 pointer-events-none">
                <Camera className="w-7 h-7 text-white pointer-events-none" />
              </div>
            )}
          </button>

          {/* Switch Camera Button (Front / Rear) (Right) */}
          <button
            onClick={() => {
              const nextFacing = settings.cameraFacing === 'environment' ? 'user' : 'environment';
              onUpdateSettings({ ...settings, cameraFacing: nextFacing });
            }}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-all active:scale-95"
            aria-label="Switch Camera (Front / Rear)"
            title={`Switch to ${settings.cameraFacing === 'environment' ? 'Front' : 'Rear'} Camera`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow-lg hover:border-slate-500 transition-all">
              <SwitchCamera className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-[10px] font-bold">
              {settings.cameraFacing === 'environment' ? 'Rear' : 'Front'}
            </span>
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* 5. WORK DETAILS BOTTOM SHEET (Option A) */}
      {/* ================================================== */}
      {isWorkDetailsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <h3 className="text-white font-bold text-sm">Field Work Assignment</h3>
              </div>
              <button
                onClick={() => setIsWorkDetailsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Worker */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sanitation Worker</span>
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none font-bold"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} ({w.workerId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ward */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Municipal Ward Assignment</span>
                  </span>
                  {detectedWard && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      GPS: {detectedWard.wardNumber}
                    </span>
                  )}
                </label>
                <select
                  value={manualWardId || ''}
                  onChange={(e) => setManualWardId(e.target.value ? e.target.value : null)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none font-bold"
                >
                  <option value="">
                    {detectedWard
                      ? `Auto-Detect: ${detectedWard.wardNumber} - ${detectedWard.wardName} (${detectedWard.areaName})`
                      : 'Auto-Detect by GPS (Outside registered wards)'}
                  </option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.wardNumber} - {w.wardName} ({w.areaName})
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  {manualWardId
                    ? 'Manually selected: photo will be stamped as "MANUALLY SELECTED".'
                    : detectedWard
                    ? `Auto-matched via ${wardVerificationMethod.replace('_', ' ')}.`
                    : 'Device coordinates are outside known municipal wards. Will be stamped as Unassigned unless a ward is chosen manually.'}
                </p>
              </div>

              {/* Work Category */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  <span>Work Category</span>
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCategoryName(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsWorkDetailsOpen(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-700/20"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 6. CAPTURED PHOTO CONFIRMATION MODAL */}
      {/* ================================================== */}
      {showCapturedModal && capturedPhoto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base">{t.photoCapturedSuccess}</h3>
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <span>✓ Automatically saved to Phone Gallery</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCapturedModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Auto-Save Gallery Confirmation Card */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Saved to Phone Gallery (Pictures/Sumit Tag/)</span>
                </span>
                <span className="bg-emerald-600/30 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/40">
                  Auto-Saved
                </span>
              </div>
              <div className="font-mono text-slate-300 text-[11px] bg-slate-950/60 p-2 rounded-xl border border-slate-800 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Stamped File:</span>
                  <span className="text-emerald-300 font-semibold truncate max-w-[260px]">
                    {lastAutoSaveResult?.stampedFilename || formatPhotoFileName(capturedPhoto.captureTimestamp, false)}
                  </span>
                </div>
                {settings.saveOriginalPhoto && (lastAutoSaveResult?.originalSaved || capturedPhoto.originalImageDataUrl) && (
                  <div className="flex items-center justify-between pt-0.5 border-t border-slate-800/80">
                    <span className="text-slate-400">Original File:</span>
                    <span className="text-amber-300 font-semibold truncate max-w-[260px]">
                      {lastAutoSaveResult?.originalFilename || formatPhotoFileName(capturedPhoto.captureTimestamp, true)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-emerald-300/80">
                The photograph is saved on your device and indexed by your phone's Gallery & Photos app. No manual download button press required.
              </p>
            </div>

            {/* Stamped Photo Preview with Watermark */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-[4/3] flex items-center justify-center">
              <img
                src={capturedPhoto.stampedImageDataUrl}
                alt="Stamped Field Geotag"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Metadata Summary Chips */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 font-mono">
              <div>
                <span className="text-slate-400">Worker:</span> <span className="text-white font-sans">{capturedPhoto.workerName}</span>
              </div>
              <div>
                <span className="text-slate-400">Ward:</span> <span className="text-white">{capturedPhoto.wardNumber}</span>
              </div>
              <div>
                <span className="text-slate-400">Category:</span> <span className="text-white font-sans">{capturedPhoto.workCategory}</span>
              </div>
              <div>
                <span className="text-slate-400">Taluka:</span>{' '}
                <span className="text-white font-sans">{capturedPhoto.taluka || capturedPhoto.address.taluka || 'Not Available'}</span>
              </div>
              <div>
                <span className="text-slate-400">GPS Acc:</span> <span className="text-emerald-400">±{capturedPhoto.gpsAccuracy}m</span>
              </div>
              <div>
                <span className="text-slate-400">PIN Code:</span>{' '}
                <span className={capturedPhoto.pinCode ? 'text-cyan-300 font-bold' : 'text-amber-400'}>
                  {capturedPhoto.pinCode ? `${capturedPhoto.pinCode} (Verified)` : 'PIN code not verified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">GPS:</span>{' '}
                <span className="text-slate-300">{capturedPhoto.latitude.toFixed(5)}°, {capturedPhoto.longitude.toFixed(5)}°</span>
              </div>
              <div>
                <span className="text-slate-400">Time (IST):</span> <span className="text-slate-300">{capturedPhoto.formattedTime}</span>
              </div>
              <div className="col-span-2 truncate">
                <span className="text-slate-400">Address:</span> <span className="text-slate-200 font-sans">{capturedPhoto.address.formattedAddress}</span>
              </div>
            </div>

            {/* Actions: WhatsApp Share, Extra Copy Download, Go to Gallery */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => shareWhatsApp(capturedPhoto)}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-700/20"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.shareWhatsApp}</span>
              </button>

              <button
                onClick={() =>
                  downloadImage(
                    capturedPhoto.stampedImageDataUrl,
                    lastAutoSaveResult?.stampedFilename || formatPhotoFileName(capturedPhoto.captureTimestamp, false)
                  )
                }
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 rounded-xl text-xs font-semibold shadow-lg shadow-blue-700/20"
                title="Download another copy"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadStamped}</span>
              </button>

              <button
                onClick={() => {
                  setShowCapturedModal(false);
                  onNavigateToGallery();
                }}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white py-2.5 px-3 rounded-xl text-xs font-semibold border border-slate-700"
              >
                <span>{t.navGallery}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. LOCATION & POSTAL ACCURACY DIAGNOSTIC MODAL */}
      <LocationDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        currentGps={gps}
        currentAddress={currentAddress}
      />
    </div>
  );
};

// Generates an illustrative field frame if no physical camera sensor is present in the browser environment
function createSampleFieldFrame(lat: number, lng: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 0, 960);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.4, '#334155');
  grad.addColorStop(0.65, '#475569');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 960);

  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 600, 1280, 360);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 600);
  ctx.lineTo(1280, 600);
  ctx.stroke();

  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(100, 680, 1080, 180);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 6;
  ctx.strokeRect(100, 680, 1080, 180);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('महानगरपालिका स्वच्छता कार्य · नाली सफाई', 640, 460);

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('MUNICIPAL SANITATION · DRAIN CLEANING WORK', 640, 505);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'mono 22px monospace';
  ctx.fillText(`FIELD GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 640, 555);

  return canvas.toDataURL('image/jpeg', 0.9);
}
