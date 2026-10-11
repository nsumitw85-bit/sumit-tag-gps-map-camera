package com.sumittag.gpsmapcamera.storage

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.*

/**
 * Android MediaStore Gallery Saver
 *
 * Saves stamped geotagged photographs and original raw photographs directly
 * into the device's shared public MediaStore image collection under:
 * Pictures/Sumit Tag/
 *
 * Adheres strictly to Android scoped storage guidelines (Android 10+ / API 29+),
 * handles IS_PENDING transitions, sets correct MIME types (image/jpeg), and formats
 * unique timestamped filenames (e.g. SumitTag_20261011_131500.jpg).
 */
object MediaStoreGallerySaver {

    const val ALBUM_NAME = "Sumit Tag"
    const val RELATIVE_PATH = "Pictures/Sumit Tag/"
    const val MIME_TYPE_JPEG = "image/jpeg"

    /**
     * Formats standardized filename using capture time:
     * e.g. "SumitTag_20261011_131500.jpg" or "SumitTag_20261011_131500_original.jpg"
     */
    fun formatFileName(captureTimeMs: Long, isOriginal: Boolean = false): String {
        val sdf = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US)
        val timeString = sdf.format(Date(captureTimeMs))
        val suffix = if (isOriginal) "_original" else ""
        return "SumitTag_${timeString}${suffix}.jpg"
    }

    /**
     * Saves a Bitmap to MediaStore under "Pictures/Sumit Tag/"
     */
    fun saveBitmapToGallery(
        context: Context,
        bitmap: Bitmap,
        captureTimeMs: Long = System.currentTimeMillis(),
        isOriginal: Boolean = false,
        quality: Int = 92
    ): Uri? {
        val fileName = formatFileName(captureTimeMs, isOriginal)
        return saveToMediaStore(context, fileName, captureTimeMs) { outputStream ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        }
    }

    /**
     * Saves raw JPEG byte array directly to MediaStore under "Pictures/Sumit Tag/"
     */
    fun saveJpegBytesToGallery(
        context: Context,
        jpegBytes: ByteArray,
        captureTimeMs: Long = System.currentTimeMillis(),
        isOriginal: Boolean = false
    ): Uri? {
        val fileName = formatFileName(captureTimeMs, isOriginal)
        return saveToMediaStore(context, fileName, captureTimeMs) { outputStream ->
            outputStream.write(jpegBytes)
            outputStream.flush()
        }
    }

    /**
     * Internal implementation handling Scoped Storage (API 29+) and legacy storage (API <= 28)
     */
    private fun saveToMediaStore(
        context: Context,
        fileName: String,
        captureTimeMs: Long,
        writeBlock: (OutputStream) -> Unit
    ): Uri? {
        val resolver = context.contentResolver

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ (API 29+) Scoped Storage via MediaStore
            val contentValues = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, MIME_TYPE_JPEG)
                put(MediaStore.Images.Media.RELATIVE_PATH, RELATIVE_PATH)
                put(MediaStore.Images.Media.DATE_ADDED, captureTimeMs / 1000)
                put(MediaStore.Images.Media.DATE_TAKEN, captureTimeMs)
                // Set pending while writing data
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }

            val imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                ?: return null

            try {
                resolver.openOutputStream(imageUri)?.use { out ->
                    writeBlock(out)
                }

                // Mark image as no longer pending so gallery indexes it immediately
                contentValues.clear()
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                resolver.update(imageUri, contentValues, null, null)

                return imageUri
            } catch (e: Exception) {
                e.printStackTrace()
                // Clean up partial URI if failed
                try {
                    resolver.delete(imageUri, null, null)
                } catch (_: Exception) {}
                return null
            }
        } else {
            // Legacy Android 8.0 - 9.0 (API 26-28)
            val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
            val sumitTagDir = File(picturesDir, ALBUM_NAME)
            if (!sumitTagDir.exists()) {
                sumitTagDir.mkdirs()
            }

            val targetFile = File(sumitTagDir, fileName)
            try {
                FileOutputStream(targetFile).use { out ->
                    writeBlock(out)
                }

                // Notify Android MediaScanner so file appears instantly in Gallery / Google Photos
                var resultUri: Uri? = null
                MediaScannerConnection.scanFile(
                    context,
                    arrayOf(targetFile.absolutePath),
                    arrayOf(MIME_TYPE_JPEG)
                ) { _, uri ->
                    resultUri = uri
                }

                return resultUri ?: Uri.fromFile(targetFile)
            } catch (e: Exception) {
                e.printStackTrace()
                return null
            }
        }
    }
}
