import { AddressInfo, GpsData, WardVerificationMethod, WatermarkStyle } from '../types';
import { formatCoordinates } from './gps';

export interface WatermarkRenderOptions {
  workerName: string;
  workCategory: string;
  wardNumber: string;
  wardName?: string;
  areaName?: string;
  taluka?: string;
  villageOrTown?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  addressStatus?: string;
  pinCodeStatus?: string;
  wardVerificationMethod: WardVerificationMethod;
  gps: GpsData;
  address: AddressInfo;
  captureTimestamp: number;
  style: WatermarkStyle;
  fontSize: 'small' | 'medium' | 'large';
  opacity: number;
  position: 'bottom' | 'top';
  showCoordinates?: boolean;
  showAddress?: boolean;
  showPinCode?: boolean;
  showWardNumber?: boolean;
  showDateTime?: boolean;
  showMapPreview?: boolean;
}

export async function renderWatermarkedPhoto(
  originalImageSrc: string,
  options: WatermarkRenderOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2d canvas context'));
          return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const scale = Math.max(1, width / 1200); // Scale factor for high-res photos

        // 1. Draw base photo
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Draw Top Branding Header (as requested in ASCII layout)
        drawTopBrandingHeader(ctx, width, scale);

        // 3. Prepare watermark layout dimensions
        let baseFontPx = 14 * scale;
        if (options.fontSize === 'small') baseFontPx = 12 * scale;
        if (options.fontSize === 'large') baseFontPx = 16 * scale;

        const padX = 24 * scale;
        const padY = 16 * scale;
        const lineHeight = baseFontPx * 1.5;

        // Date and 12-hour AM/PM Time formatting with Timezone (e.g. 10:15:32 PM IST)
        const captureDate = new Date(options.captureTimestamp);
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
        const tzName = 'IST'; // Standard Indian Standard Time
        const formattedTime = `${formattedHours}:${minutes}:${seconds} ${ampm} ${tzName}`;

        const { latStr, lngStr } = formatCoordinates(options.gps.latitude, options.gps.longitude);
        const accuracyStr = `${Math.round(options.gps.accuracy)} METERS`;

        // Resolve District, State, Taluka, PIN, Locality dynamically from real physical GPS location
        const resolvedDistrict =
          options.address.district ||
          options.address.city ||
          options.district ||
          'Not Available';

        const resolvedTaluka =
          options.address.taluka ||
          options.taluka ||
          undefined;

        const resolvedVillage =
          options.address.villageOrTown ||
          options.villageOrTown ||
          undefined;

        const resolvedState =
          options.address.state ||
          options.state ||
          'Not Available';

        // Strictest PIN handling: Only show PIN if actually verified from real coordinates!
        const resolvedPin = options.address.postcode || undefined;
        const pinStatus = options.address.pinCodeStatus || (resolvedPin ? 'PIN Code Verified' : 'PIN Code Unverified');
        const addrStatus = options.address.addressStatus || (options.address.isResolved ? 'Address Resolved' : 'Address Unavailable');

        const resolvedArea =
          resolvedVillage ||
          options.address.locality ||
          options.address.subLocality ||
          options.address.road ||
          options.areaName ||
          'Current Locality';

        // Clean Ward format e.g. "05", "Ward 05", or "Unassigned"
        let cleanWardNumber = options.wardNumber || 'Unassigned';
        if (cleanWardNumber === 'Ward Unassigned' || cleanWardNumber.toLowerCase() === 'unassigned' || !cleanWardNumber) {
          cleanWardNumber = 'Unassigned';
        } else {
          cleanWardNumber = cleanWardNumber.replace(/^Ward\s*/i, '');
        }

        // Ward display with official verification distinction
        let wardDisplay = 'Ward not verified';
        if (options.wardVerificationMethod === 'boundary_verified') {
          wardDisplay = `Ward ${cleanWardNumber} (Verified Boundary)`;
        } else if (options.wardVerificationMethod === 'proximity_verified') {
          wardDisplay = `Ward ${cleanWardNumber} (Proximity Verified)`;
        } else if (options.wardVerificationMethod === 'manually_selected') {
          wardDisplay = `Ward ${cleanWardNumber} [Manually Selected]`;
        }

        // PIN display with verification status
        const pinDisplay = resolvedPin
          ? `${resolvedPin} [${pinStatus === 'PIN Code Verified' ? 'Verified' : 'Unverified'}]`
          : 'PIN code not verified';

        // Calculate overlay height to fit all verified fieldwork lines
        const overlayHeight = Math.max(270 * scale, lineHeight * 10 + padY * 2);
        const overlayY = options.position === 'top' ? 0 : height - overlayHeight;

        ctx.save();

        // 4. Draw Background Box
        ctx.fillStyle = `rgba(10, 15, 30, ${options.opacity})`;
        ctx.fillRect(0, overlayY, width, overlayHeight);

        // Demarcation Horizontal Divider line ├──────────────────────────────────┤
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, options.position === 'top' ? overlayHeight - 3 * scale : overlayY, width, 3.5 * scale);

        // 5. Header Bar inside bottom overlay: "SUMIT TAG – GPS MAP CAMERA" + Verification Badge
        const headerY = overlayY + padY + baseFontPx * 0.85;
        const badgeX = padX;
        const badgeY = overlayY + padY - 4 * scale;
        const badgeSize = 32 * scale;

        // "ST" Logo Badge
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 6 * scale);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(14 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ST', badgeX + badgeSize / 2, badgeY + badgeSize / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(baseFontPx * 1.2)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText('SUMIT TAG – GPS MAP CAMERA', badgeX + badgeSize + 12 * scale, headerY);

        // Verification Pill Badge on Right
        let verifyText = 'ℹ MANUALLY SELECTED';
        let pillBg = 'rgba(234, 179, 8, 0.25)';
        let pillBorder = '#eab308';
        let pillTextColor = '#fde047';

        if (options.wardVerificationMethod === 'boundary_verified') {
          verifyText = '✓ BOUNDARY VERIFIED';
          pillBg = 'rgba(16, 185, 129, 0.25)';
          pillBorder = '#10b981';
          pillTextColor = '#34d399';
        } else if (options.wardVerificationMethod === 'proximity_verified') {
          verifyText = '✓ PROXIMITY VERIFIED';
          pillBg = 'rgba(16, 185, 129, 0.25)';
          pillBorder = '#10b981';
          pillTextColor = '#34d399';
        } else if (options.wardVerificationMethod === 'unassigned') {
          verifyText = '⚠ WARD NOT VERIFIED';
          pillBg = 'rgba(239, 68, 68, 0.25)';
          pillBorder = '#ef4444';
          pillTextColor = '#fca5a5';
        }

        const pillFont = `bold ${Math.round(baseFontPx * 0.72)}px sans-serif`;
        ctx.font = pillFont;
        const textMetric = ctx.measureText(verifyText);
        const pillWidth = Math.max(160 * scale, textMetric.width + 18 * scale);
        const pillHeight = 22 * scale;
        const pillX = width - padX - pillWidth;
        const pillY = overlayY + padY - 3 * scale;

        ctx.fillStyle = pillBg;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 4 * scale);
        ctx.fill();
        ctx.strokeStyle = pillBorder;
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        ctx.fillStyle = pillTextColor;
        ctx.textAlign = 'center';
        ctx.fillText(verifyText, pillX + pillWidth / 2, pillY + pillHeight * 0.72);
        ctx.textAlign = 'left';

        // Thin separator under header
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(padX, headerY + 10 * scale, width - padX * 2, 1 * scale);

        // 6. Draw Metadata Columns (matching exact template)
        const contentStartY = headerY + 22 * scale;

        // Column 3: Location Map on the right (if enabled)
        const includeMap = options.showMapPreview !== false;
        const mapBoxW = includeMap ? 165 * scale : 0;
        const mapBoxH = overlayHeight - (contentStartY - overlayY) - padY;
        const mapX = width - padX - mapBoxW;
        const mapY = contentStartY;

        // Content Area between left padding and Map Box
        const availableW = includeMap ? mapX - padX - 16 * scale : width - padX * 2;
        const col1X = padX;
        const col2X = padX + availableW * 0.52;

        // Column 1 (Left):
        let y1 = contentStartY + lineHeight * 0.85;
        drawAsciiLabelValue(ctx, 'WORKER:', options.workerName, col1X, y1, baseFontPx);
        y1 += lineHeight;
        drawAsciiLabelValue(ctx, 'WORK:', options.workCategory, col1X, y1, baseFontPx);

        if (options.showWardNumber !== false) {
          y1 += lineHeight;
          drawAsciiLabelValue(ctx, 'WARD:', wardDisplay, col1X, y1, baseFontPx);
        }

        y1 += lineHeight;
        drawAsciiLabelValue(ctx, 'AREA:', resolvedArea, col1X, y1, baseFontPx);

        if (resolvedTaluka) {
          y1 += lineHeight;
          drawAsciiLabelValue(ctx, 'TALUKA:', resolvedTaluka, col1X, y1, baseFontPx);
        }

        if (options.showAddress !== false) {
          y1 += lineHeight;
          drawAsciiLabelValue(ctx, 'DISTRICT:', resolvedDistrict, col1X, y1, baseFontPx);
          y1 += lineHeight;
          drawAsciiLabelValue(ctx, 'STATE:', resolvedState, col1X, y1, baseFontPx);
        }

        if (options.showPinCode !== false) {
          y1 += lineHeight;
          drawAsciiLabelValue(ctx, 'PIN CODE:', pinDisplay, col1X, y1, baseFontPx);
        }

        // Column 2 (Middle/Right):
        let y2 = contentStartY + lineHeight * 0.85;
        if (options.showCoordinates !== false) {
          drawAsciiLabelValue(ctx, 'LAT:', `${Math.abs(options.gps.latitude).toFixed(5)}° ${options.gps.latitude >= 0 ? 'N' : 'S'}`, col2X, y2, baseFontPx);
          y2 += lineHeight;
          drawAsciiLabelValue(ctx, 'LNG:', `${Math.abs(options.gps.longitude).toFixed(5)}° ${options.gps.longitude >= 0 ? 'E' : 'W'}`, col2X, y2, baseFontPx);
          y2 += lineHeight;
          drawAsciiLabelValue(ctx, 'GPS ACCURACY:', accuracyStr, col2X, y2, baseFontPx);
          y2 += lineHeight;
        }

        if (options.showDateTime !== false) {
          drawAsciiLabelValue(ctx, 'DATE:', formattedDate, col2X, y2, baseFontPx);
          y2 += lineHeight;
          drawAsciiLabelValue(ctx, 'TIME:', formattedTime, col2X, y2, baseFontPx);
          y2 += lineHeight;
        }

        // Status indicators
        drawAsciiLabelValue(ctx, 'ADDR STATUS:', addrStatus, col2X, y2, baseFontPx);
        y2 += lineHeight;
        drawAsciiLabelValue(ctx, 'PIN STATUS:', pinStatus, col2X, y2, baseFontPx);
        y2 += lineHeight;

        // Address snippet below
        if (options.showAddress !== false) {
          let displayAddr = options.address.formattedAddress;
          if (!displayAddr || displayAddr === 'Acquiring address from GPS...' || displayAddr.startsWith('Waiting')) {
            displayAddr = 'Address could not be verified';
          }
          drawAsciiLabelValue(ctx, 'ADDR:', truncateText(ctx, displayAddr, availableW * 0.44), col2X, y2, baseFontPx);
        }

        // 7. Draw [LOCATION MAP] Box (if enabled)
        if (includeMap) {
          drawLocationMapBox(ctx, mapX, mapY, mapBoxW, mapBoxH, options.gps.latitude, options.gps.longitude, scale);
        }

        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load source image for watermarking'));
    };

    img.src = originalImageSrc;
  });
}

// Draw Top Centered Branding Box
function drawTopBrandingHeader(ctx: CanvasRenderingContext2D, width: number, scale: number) {
  ctx.save();
  const boxW = 280 * scale;
  const boxH = 46 * scale;
  const boxX = (width - boxW) / 2;
  const boxY = 16 * scale;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 10 * scale);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();

  // Top Text: SUMIT TAG
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(15 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('SUMIT TAG', width / 2, boxY + 20 * scale);

  // Subtitle: GPS MAP CAMERA
  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${Math.round(10.5 * scale)}px sans-serif`;
  ctx.fillText('GPS MAP CAMERA', width / 2, boxY + 36 * scale);

  ctx.restore();
}

function drawAsciiLabelValue(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  fontSize: number
) {
  ctx.save();
  // Uppercase Label in bright cyan/light-blue
  ctx.fillStyle = '#93c5fd';
  ctx.font = `bold ${Math.round(fontSize * 0.9)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(label, x, y);

  const labelWidth = ctx.measureText(label).width;

  // Value in crisp white
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${Math.round(fontSize * 0.95)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(` ${value}`, x + labelWidth, y);
  ctx.restore();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 3 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

// Draw [LOCATION MAP] Card matching the user's diagram
function drawLocationMapBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lat: number,
  lng: number,
  scale: number
) {
  ctx.save();

  // Frame Background
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8 * scale);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();

  // Header Bar: [LOCATION MAP]
  const titleH = 20 * scale;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(x, y, w, titleH, [8 * scale, 8 * scale, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('LOCATION MAP', x + w / 2, y + 14 * scale);

  // Map viewport area
  const mapCenterY = y + titleH + (h - titleH) / 2 - 8 * scale;
  const mapCenterX = x + w / 2;

  // Coordinate Radar Grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1 * scale;
  const step = 18 * scale;
  for (let gx = x + step; gx < x + w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, y + titleH);
    ctx.lineTo(gx, y + h - 18 * scale);
    ctx.stroke();
  }
  for (let gy = y + titleH + step; gy < y + h - 18 * scale; gy += step) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }

  // Radar Accuracy Rings
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.arc(mapCenterX, mapCenterY, 30 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mapCenterX, mapCenterY, 15 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Compass Rose Indicator (North marker)
  ctx.fillStyle = '#ef4444';
  ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
  ctx.fillText('N', mapCenterX, mapCenterY - 33 * scale);

  // Red Location Pin at Center
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(mapCenterX, mapCenterY - 7 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(mapCenterX - 7 * scale, mapCenterY - 5 * scale);
  ctx.lineTo(mapCenterX, mapCenterY + 4 * scale);
  ctx.lineTo(mapCenterX + 7 * scale, mapCenterY - 5 * scale);
  ctx.fill();

  // Pin Inner White Center Dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mapCenterX, mapCenterY - 7 * scale, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Bottom Coordinate Bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 1, y + h - 18 * scale, w - 2, 17 * scale);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `mono ${Math.round(8 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, mapCenterX, y + h - 6 * scale);

  ctx.restore();
}
