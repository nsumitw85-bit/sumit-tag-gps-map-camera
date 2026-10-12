# Proguard / R8 configuration for Sumit Tag - GPS Map Camera

# Preserve Room Database Entities and DAOs
-keep class androidx.room.** { *; }
-dontwarn androidx.room.**
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao interface * { *; }
-keep class com.sumittag.gpsmapcamera.data.** { *; }

# Preserve Google Play Services Location and Tasks
-keep class com.google.android.gms.location.** { *; }
-dontwarn com.google.android.gms.location.**

# Preserve CameraX classes and lifecycles
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# Preserve Kotlin Coroutines and Reflection
-keepnames class kotlinx.coroutines.** { *; }
-keepclassmembers class * {
    @kotlinx.coroutines.InternalCoroutinesApi *;
}

# Preserve JavascriptInterface for Android WebView / MediaStore Bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.sumittag.gpsmapcamera.storage.AndroidMediaStoreBridge { *; }

# Preserve Watermark and Export Model Classes
-keep class com.sumittag.gpsmapcamera.watermark.WatermarkMetadata { *; }
-keep class com.sumittag.gpsmapcamera.location.LocationFix { *; }
-keep class com.sumittag.gpsmapcamera.location.ResolvedAddress { *; }
