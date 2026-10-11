# Sumit Tag – GPS Map Camera (Android Native Project)

**Package Name:** `com.sumittag.gpsmapcamera`  
**Purpose:** Geotagged work photo capture for sanitation workers, municipal supervisors, and field employees with verifiable location info.

---

## 1. Project Folder Structure

```
android-project/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/com/sumittag/gpsmapcamera/
│       │   │   ├── MainActivity.kt
│       │   │   ├── SumitTagApp.kt
│       │   │   ├── camera/
│       │   │   │   └── CameraXManager.kt
│       │   │   ├── location/
│       │   │   │   └── GpsLocationProvider.kt
│       │   │   ├── watermark/
│       │   │   │   └── WatermarkBitmapRenderer.kt
│       │   │   ├── data/
│       │   │   │   └── AppDatabase.kt
│       │   │   └── export/
│       │   │       └── PdfReportGenerator.kt
│       │   └── res/
│       │       ├── values/
│       │       │   ├── strings.xml
│       │       │   └── themes.xml
│       │       └── xml/
│       │           └── file_paths.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/wrapper/
```

---

## 2. Prerequisites

1. **Android Studio**: Android Studio Iguana, Jellyfish, or newer.
2. **JDK**: Java Development Kit 17.
3. **Android SDK**: Compile SDK 35, Min SDK 26 (Android 8.0+).
4. **Physical Android Device** with GPS and Camera hardware for real outdoor testing.

---

## 3. How to Build the Debug APK

Open a terminal in the root directory:

```bash
# 1. Clean the build
./gradlew clean

# 2. Build Debug APK
./gradlew assembleDebug

# Output APK path:
# app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. How to Install the APK on an Android Phone

### Method A: Via USB & ADB (Developer Mode)
1. Enable **Developer Options** and **USB Debugging** on your phone.
2. Connect your phone via USB cable.
3. Verify connection:
   ```bash
   adb devices
   ```
4. Install APK directly:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

### Method B: Direct Phone Transfer (WhatsApp / Google Drive)
1. Copy `app-debug.apk` to phone via USB or Google Drive.
2. On phone, tap `app-debug.apk`.
3. Allow "Install unknown apps" from files/browser if prompted.
4. Tap **Install** and open **Sumit Tag**.

---

## 5. Required Runtime Permissions
- `android.permission.CAMERA`: Live viewfinder and photo capture.
- `android.permission.ACCESS_FINE_LOCATION`: Real satellite GPS coordinates & accuracy.
- `android.permission.ACCESS_COARSE_LOCATION`: Cell/WiFi fallback location.
- `android.permission.INTERNET`: Reverse geocoding of street addresses.
- `android.permission.READ_MEDIA_IMAGES` / `WRITE_EXTERNAL_STORAGE`: Dual photo storage in `Pictures/Sumit Tag/`.

---

## 6. Real-World Fieldwork Safeguards & Features
- **Stale GPS Check:** Alerts if GPS fix is older than 30 seconds.
- **Accuracy Threshold:** User-configurable (10m, 20m, 50m).
- **No Fabricated Data:** If GPS or address is unavailable, displays "Not Available" — never invents false coordinates.
- **Dual Photo Storage:** Stores both original untouched photo and stamped photo in scoped storage.
- **Multi-Selection & Batch ZIP Export:** Select multiple stamped photos in the gallery and batch export as a single `.zip` file with an embedded audit CSV manifest (`MUNICIPAL_GEOTAG_MANIFEST.csv`).
- **GeoJSON Boundary Verification:** Ray-casting point-in-polygon verification for official municipal boundaries.
