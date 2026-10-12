# Sumit Tag – GPS Map Camera

Professional Android GPS Map Camera application designed for municipal sanitation work, field inspections, geotagged evidence, and supervisor auditing.

- **Application ID / Package Name:** `com.sumittag.gpsmapcamera`
- **Application Name:** `Sumit Tag – GPS Map Camera`
- **Target Platform:** Android (API 26 to API 35+)

---

## Architecture Overview

This project is built using a clean, production-grade hybrid Android architecture:
1. **Native Android Engine (`android-project/`)**:
   - Written in Kotlin and configured with modern Android Gradle Plugin (AGP 8.4) & Gradle 8.6.
   - **CameraX Manager (`CameraXManager.kt`)**: Native hardware camera access with front/rear switching.
   - **High-Precision GPS Location Provider (`GpsLocationProvider.kt`)**: `FusedLocationProviderClient` with accuracy threshold enforcement and reverse geocoding.
   - **Native MediaStore Integration (`MediaStoreGallerySaver.kt` & `AndroidMediaStoreBridge.kt`)**: Saves captured photos automatically to `Pictures/Sumit Tag/` using `MediaStore.Images.Media` with `IS_PENDING` flags and index scans.
   - **Local Database (`AppDatabase.kt`)**: Embedded storage for offline geotag records.
   - **PDF Report Generator (`PdfReportGenerator.kt`)**: Native municipal fieldwork report generation.
   - **WebView Host (`MainActivity.kt`)**: Securely renders the local app asset bundle (`file:///android_asset/www/index.html`) with bidirectional JavaScript bridge interface (`AndroidMediaStore`).

2. **Web Frontend (`src/`)**:
   - React 19 + TypeScript + Vite + Tailwind CSS.
   - Live camera viewfinder, real-time GPS coordinates, address geocoding, ward boundary verification, worker management, watermarking, multi-photo gallery, and ZIP audit manifest export.

---

## How to Build the Android APK

### Option 1: Automated Build via GitHub Actions (Recommended)

Every push or pull request to the `main` or `master` branch automatically builds the Android APK in a clean Ubuntu runner with JDK 17 and Android SDK.

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare Sumit Tag Android APK build"
   git push origin main
   ```
2. **Go to GitHub Actions**:
   - Navigate to your repository on GitHub.
   - Click the **Actions** tab.
   - Select the **Build Android APK** workflow.
3. **Download the APK**:
   - Once the workflow completes (green checkmark), scroll down to the **Artifacts** section at the bottom of the summary page.
   - Click **sumit-tag-debug-apk** to download the ZIP file containing `app-debug.apk`.

---

### Option 2: Local Build Using Android Studio / Command Line

#### Prerequisites
- **Node.js**: v18 or v20
- **JDK**: Java Development Kit 17
- **Android SDK**: Android API 34/35 build-tools

#### Build Steps
1. **Install web dependencies and compile assets**:
   ```bash
   npm ci --legacy-peer-deps
   npm run build
   ```

2. **Sync compiled web assets to Android project**:
   ```bash
   mkdir -p android-project/app/src/main/assets/www
   cp -r dist/* android-project/app/src/main/assets/www/
   ```

3. **Compile the Debug APK using Gradle**:
   ```bash
   cd android-project
   chmod +x gradlew
   ./gradlew assembleDebug --stacktrace
   ```

4. **Locate the Output APK**:
   The generated APK will be located at:
   ```
   android-project/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## How to Install the APK on Your Android Phone

1. **Download `app-debug.apk`** onto your phone (from the GitHub Actions artifact or via Google Drive/USB).
2. **Open the downloaded APK**:
   - Tap on the `.apk` file in your phone's notification bar or File Manager.
3. **Allow Installation from Unknown Sources**:
   - If prompted with *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** and toggle **Allow from this source**.
4. **Complete Installation**:
   - Tap **Install**.
   - Tap **Open** to launch **Sumit Tag – GPS Map Camera**.
5. **Permissions**:
   - Grant **Camera** and **Location (Precise / While using the app)** when prompted.
   - Captured photos will automatically appear in your phone's native Gallery under the `Sumit Tag` album.
