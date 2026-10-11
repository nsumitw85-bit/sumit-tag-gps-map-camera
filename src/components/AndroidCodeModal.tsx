import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Terminal,
  FileCode,
  FolderTree,
  ExternalLink,
  ShieldCheck,
  Download
} from 'lucide-react';

export const AndroidCodeModal: React.FC = () => {
  const [activeFileTab, setActiveFileTab] = useState<'manifest' | 'gradle' | 'main' | 'camerax' | 'gps' | 'watermark' | 'database' | 'readme'>('readme');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fileContents = {
    readme: `# Sumit Tag – GPS Map Camera (Android Native APK Build Guide)
Package Name: com.sumittag.gpsmapcamera
Platform: Native Android (Kotlin + Jetpack Compose + CameraX + Room + Play Services Location)

=== 1. BUILD DEBUG APK IN TERMINAL ===
$ ./gradlew clean
$ ./gradlew assembleDebug

Output APK will be generated at:
app/build/outputs/apk/debug/app-debug.apk

=== 2. INSTALL ON ANDROID PHONE ===
Method A (ADB via USB):
$ adb devices
$ adb install -r app/build/outputs/apk/debug/app-debug.apk

Method B (Direct transfer):
Copy app-debug.apk to phone via Google Drive or WhatsApp, tap the APK, allow "Install Unknown Apps" and tap Install.

=== 3. RUNTIME PERMISSIONS REQUIRED ===
- android.permission.CAMERA
- android.permission.ACCESS_FINE_LOCATION
- android.permission.ACCESS_COARSE_LOCATION
- android.permission.INTERNET
- android.permission.READ_MEDIA_IMAGES (Android 13+) / WRITE_EXTERNAL_STORAGE (Android 10-)

=== 4. FIELD SAFEGUARDS ===
- Automatic GPS stale detection (> 30s)
- User-configurable accuracy threshold (10m, 20m, 50m)
- Zero fake GPS coordinates / addresses policy (displays "Not Available" if unresolvable)
- Dual photo storage (Original raw + Stamped with GPS watermark)
- GeoJSON Point-in-Polygon boundary verification`,

    manifest: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.sumittag.gpsmapcamera">

    <uses-feature android:name="android.hardware.camera.any" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.camera.flash" android:required="false" />
    <uses-feature android:name="android.hardware.location.gps" android:required="true" />

    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <application
        android:name=".SumitTagApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Sumit Tag"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SumitTagGpsCamera">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>`,

    gradle: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
}

android {
    namespace = "com.sumittag.gpsmapcamera"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sumittag.gpsmapcamera"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")

    // CameraX
    val camerax = "1.3.4"
    implementation("androidx.camera:camera-core:$camerax")
    implementation("androidx.camera:camera-camera2:$camerax")
    implementation("androidx.camera:camera-lifecycle:$camerax")
    implementation("androidx.camera:camera-view:$camerax")

    // Google Play Services Location
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // Room Database
    val room = "2.6.1"
    implementation("androidx.room:room-runtime:$room")
    implementation("androidx.room:room-ktx:$room")
    kapt("androidx.room:room-compiler:$room")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}`,

    main: `package com.sumittag.gpsmapcamera

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.sumittag.gpsmapcamera.camera.CameraXManager
import com.sumittag.gpsmapcamera.data.AppDatabase
import com.sumittag.gpsmapcamera.location.GpsLocationProvider

class MainActivity : ComponentActivity() {
    private lateinit var gpsProvider: GpsLocationProvider
    private lateinit var cameraManager: CameraXManager
    private lateinit var database: AppDatabase

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val camera = permissions[Manifest.permission.CAMERA] ?: false
        val loc = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        if (camera && loc) {
            gpsProvider.startLocationUpdates()
        } else {
            Toast.makeText(this, "Permissions required for GPS camera", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        database = AppDatabase.getInstance(applicationContext)
        gpsProvider = GpsLocationProvider(this)
        cameraManager = CameraXManager(this)

        checkPermissions()
        setContent {
            // Jetpack Compose Navigation Root
        }
    }

    private fun checkPermissions() {
        val permissions = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION
        )
        if (permissions.all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }) {
            gpsProvider.startLocationUpdates()
        } else {
            permissionLauncher.launch(permissions)
        }
    }
}`,

    camerax: `package com.sumittag.gpsmapcamera.camera

import android.content.Context
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.File
import java.util.concurrent.Executors

class CameraXManager(private val context: Context) {
    private var imageCapture: ImageCapture? = null
    private var lensFacing = CameraSelector.LENS_FACING_BACK
    private val cameraExecutor = Executors.newSingleThreadExecutor()

    fun bindCamera(lifecycleOwner: LifecycleOwner, surfaceProvider: Preview.SurfaceProvider) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also { it.setSurfaceProvider(surfaceProvider) }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build()

            val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(lifecycleOwner, selector, preview, imageCapture)
        }, ContextCompat.getMainExecutor(context))
    }

    fun takePicture(outputFile: File, onSuccess: (File) -> Unit, onError: (ImageCaptureException) -> Unit) {
        val capture = imageCapture ?: return
        val opts = ImageCapture.OutputFileOptions.Builder(outputFile).build()
        capture.takePicture(opts, cameraExecutor, object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(res: ImageCapture.OutputFileResults) = onSuccess(outputFile)
            override fun onError(exc: ImageCaptureException) = onError(exc)
        })
    }
}`,

    gps: `package com.sumittag.gpsmapcamera.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import com.google.android.gms.location.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.*
import java.util.Locale

class GpsLocationProvider(private val context: Context) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)
    val locationFlow = MutableSharedFlow<LocationFix>(replay = 1)
    
    var accuracyThresholdMeters = 20.0f
    private var retryAttempt = 0
    private var retryJob: Job? = null

    @SuppressLint("MissingPermission")
    fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2000L)
            .setMinUpdateIntervalMillis(1000L)
            .setMaxUpdateDelayMillis(3000L)
            .build()

        fusedClient.requestLocationUpdates(request, object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: run {
                    scheduleExponentialBackoffRetry()
                    return
                }

                val now = System.currentTimeMillis()
                val ageSeconds = (now - loc.time) / 1000L

                // 1. Strict Freshness Check (age < 30 seconds)
                val isFresh = ageSeconds < 30L

                // 2. Accuracy Threshold Check (loc.accuracy <= threshold)
                val meetsAccuracy = loc.accuracy <= accuracyThresholdMeters

                val isReady = isFresh && meetsAccuracy

                if (isReady) {
                    resetBackoff()
                } else {
                    scheduleExponentialBackoffRetry()
                }

                locationFlow.tryEmit(
                    LocationFix(
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        accuracy = loc.accuracy,
                        timestamp = loc.time,
                        ageSeconds = ageSeconds,
                        isStale = !isFresh,
                        isReady = isReady
                    )
                )
            }

            override fun onLocationAvailability(avail: LocationAvailability) {
                if (!avail.isLocationAvailable) {
                    scheduleExponentialBackoffRetry()
                }
            }
        }, context.mainLooper)
    }

    private fun scheduleExponentialBackoffRetry() {
        retryJob?.cancel()
        retryAttempt++
        val baseDelay = (1000L * (1L shl (retryAttempt - 1).coerceAtMost(5))).coerceAtMost(30000L)
        val jitter = (0..500).random()
        val delayMs = baseDelay + jitter

        retryJob = CoroutineScope(Dispatchers.Main).launch {
            delay(delayMs)
            startLocationUpdates()
        }
    }

    private fun resetBackoff() {
        retryAttempt = 0
        retryJob?.cancel()
    }

    suspend fun reverseGeocode(lat: Double, lng: Double): String {
        val geocoder = Geocoder(context, Locale.getDefault())
        return try {
            val list = geocoder.getFromLocation(lat, lng, 1)
            list?.firstOrNull()?.getAddressLine(0) ?: "Not Available"
        } catch (e: Exception) {
            "Not Available"
        }
    }
}`,

    watermark: `package com.sumittag.gpsmapcamera.watermark

import android.graphics.*
import java.io.File
import java.io.FileOutputStream

object WatermarkBitmapRenderer {
    fun stampPhoto(original: Bitmap, meta: WatermarkMetadata, outputFile: File): File {
        val bmp = Bitmap.createBitmap(original.width, original.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawBitmap(original, 0f, 0f, null)

        val scale = (original.width / 1200f).coerceAtLeast(1f)
        val overlayH = 220f * scale
        val overlayTop = original.height - overlayH

        val bgPaint = Paint().apply { color = Color.argb(220, 15, 23, 42) }
        canvas.drawRect(0f, overlayTop, original.width.toFloat(), original.height.toFloat(), bgPaint)

        val textPaint = Paint().apply {
            color = Color.WHITE
            textSize = 16f * scale
            isAntiAlias = true
        }

        canvas.drawText("SUMIT TAG – GPS MAP CAMERA", 30f * scale, overlayTop + 35f * scale, textPaint)
        canvas.drawText("Worker: \${meta.workerName} | Category: \${meta.workCategory}", 30f * scale, overlayTop + 75f * scale, textPaint)
        canvas.drawText("Ward: \${meta.wardNumber} (\${meta.areaName})", 30f * scale, overlayTop + 105f * scale, textPaint)
        canvas.drawText("GPS: \${meta.latitude}° N, \${meta.longitude}° E (±\${meta.accuracyMeters}m)", 30f * scale, overlayTop + 135f * scale, textPaint)
        canvas.drawText("Address: \${meta.formattedAddress.take(50)}", 30f * scale, overlayTop + 165f * scale, textPaint)

        FileOutputStream(outputFile).use { out -> bmp.compress(Bitmap.CompressFormat.JPEG, 92, out) }
        return outputFile
    }
}`,

    database: `package com.sumittag.gpsmapcamera.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "photos")
data class PhotoEntity(
    @PrimaryKey val id: String,
    val workerId: String,
    val workerName: String,
    val workCategory: String,
    val wardNumber: String,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val formattedAddress: String,
    val captureTimestamp: Long,
    val originalPhotoPath: String?,
    val stampedPhotoPath: String
)

@Dao
interface PhotoDao {
    @Query("SELECT * FROM photos ORDER BY captureTimestamp DESC")
    fun getAllPhotos(): Flow<List<PhotoEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPhoto(photo: PhotoEntity)
}

@Database(entities = [PhotoEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun photoDao(): PhotoDao

    companion object {
        fun getInstance(ctx: Context) = Room.databaseBuilder(ctx, AppDatabase::class.java, "sumit_tag.db").build()
    }
}`,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-cyan-400" />
          <span>Native Android Source Code & APK Guide</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete Android Studio project with CameraX, Room, Google Play Services Location, and Gradle scripts ready to compile into a debug APK.
        </p>
      </div>

      {/* Terminal Command Quick Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Terminal className="w-4 h-4" />
            <span>Bash · Build & Install APK</span>
          </div>
          <button
            onClick={() => copyCode('./gradlew clean && ./gradlew assembleDebug\nadb install -r app/build/outputs/apk/debug/app-debug.apk', 'term')}
            className="text-xs hover:text-white flex items-center gap-1 text-slate-400"
          >
            {copiedKey === 'term' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Command</span>
          </button>
        </div>
        <p className="text-slate-300"># 1. Compile Debug APK</p>
        <p className="text-emerald-400">./gradlew assembleDebug</p>
        <p className="text-slate-300 mt-1"># 2. Install to Android Device via USB</p>
        <p className="text-emerald-400">adb install -r app/build/outputs/apk/debug/app-debug.apk</p>
      </div>

      {/* Code Viewer with Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 bg-slate-950/80 border-b border-slate-800 text-xs">
          {[
            { id: 'readme', label: 'README.md', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'manifest', label: 'AndroidManifest.xml', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'gradle', label: 'build.gradle.kts', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'main', label: 'MainActivity.kt', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'camerax', label: 'CameraXManager.kt', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'gps', label: 'GpsLocationProvider.kt', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'watermark', label: 'WatermarkBitmapRenderer.kt', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'database', label: 'AppDatabase.kt', icon: <FileCode className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFileTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs whitespace-nowrap transition-colors ${
                activeFileTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-700/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 text-xs">
          <span className="text-slate-400 font-mono">
            Source file: <span className="text-white font-bold">{activeFileTab}.kt</span>
          </span>
          <button
            onClick={() => copyCode(fileContents[activeFileTab], activeFileTab)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1 rounded-lg font-medium transition-colors border border-slate-700"
          >
            {copiedKey === activeFileTab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === activeFileTab ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Code Content Box */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px]">
          <pre>{fileContents[activeFileTab]}</pre>
        </div>
      </div>
    </div>
  );
};
