package com.sumittag.gpsmapcamera.storage

import android.content.Context
import android.util.Base64
import android.webkit.JavascriptInterface

/**
 * Android JavaScriptInterface Bridge for MediaStore.Images.Media
 *
 * Exposes native MediaStore scoped storage capabilities to web/hybrid wrappers
 * under `window.AndroidMediaStore`.
 */
class AndroidMediaStoreBridge(private val context: Context) {

    @JavascriptInterface
    fun isAvailable(): Boolean {
        return true
    }

    /**
     * Inserts image into MediaStore under Pictures/Sumit Tag/
     * Marks IS_PENDING = 1 during stream writing, then IS_PENDING = 0 and
     * initiates gallery scan index updates via MediaScannerConnection.
     */
    @JavascriptInterface
    fun insertImageWithPending(
        base64Data: String,
        fileName: String,
        relativePath: String,
        mimeType: String,
        captureTimeMs: Long,
        lat: Double,
        lng: Double,
        description: String
    ): String {
        return try {
            val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val uri = MediaStoreGallerySaver.saveJpegBytesToGallery(
                context = context,
                jpegBytes = imageBytes,
                captureTimeMs = if (captureTimeMs > 0) captureTimeMs else System.currentTimeMillis(),
                isOriginal = fileName.contains("_original")
            )
            uri?.toString() ?: ""
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }

    @JavascriptInterface
    fun scanMediaFile(filePathOrUri: String): Boolean {
        return try {
            MediaStoreGallerySaver.scanMediaFile(context, filePathOrUri)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
