package com.sumittag.gpsmapcamera.watermark

import android.graphics.*
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

data class WatermarkMetadata(
    val workerName: String,
    val workCategory: String,
    val wardNumber: String,
    val wardName: String?,
    val areaName: String?,
    val isBoundaryVerified: Boolean,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val altitudeMeters: Double?,
    val formattedAddress: String,
    val pinCode: String?,
    val captureTimeMs: Long
)

object WatermarkBitmapRenderer {

    fun stampPhoto(
        originalBitmap: Bitmap,
        meta: WatermarkMetadata,
        outputFile: File,
        opacityAlpha: Int = 220
    ): File {
        val width = originalBitmap.width
        val height = originalBitmap.height

        val resultBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(resultBitmap)

        // Draw original
        canvas.drawBitmap(originalBitmap, 0f, 0f, null)

        val scale = (width / 1200f).coerceAtLeast(1f)
        val baseTextSize = 16f * scale
        val padding = 24f * scale
        val overlayHeight = 220f * scale
        val overlayTop = height - overlayHeight

        // Background Underlay
        val bgPaint = Paint().apply {
            color = Color.argb(opacityAlpha, 15, 23, 42) // Dark Slate #0f172a
            style = Paint.Style.FILL
        }
        canvas.drawRect(0f, overlayTop, width.toFloat(), height.toFloat(), bgPaint)

        // Accent Line
        val accentPaint = Paint().apply {
            color = Color.parseColor("#2563EB") // Royal Blue
            strokeWidth = 4f * scale
        }
        canvas.drawLine(0f, overlayTop, width.toFloat(), overlayTop, accentPaint)

        // App Title
        val titlePaint = Paint().apply {
            color = Color.WHITE
            textSize = baseTextSize * 1.3f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }
        canvas.drawText("SUMIT TAG – GPS MAP CAMERA", padding + 40f * scale, overlayTop + padding + 18f * scale, titlePaint)

        // "ST" Badge
        val badgePaint = Paint().apply {
            color = Color.parseColor("#1E40AF")
            style = Paint.Style.FILL
            isAntiAlias = true
        }
        val badgeSize = 34f * scale
        val badgeRect = RectF(padding, overlayTop + padding - 4f * scale, padding + badgeSize, overlayTop + padding + badgeSize - 4f * scale)
        canvas.drawRoundRect(badgeRect, 6f * scale, 6f * scale, badgePaint)

        val badgeTextPaint = Paint().apply {
            color = Color.WHITE
            textSize = 15f * scale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }
        canvas.drawText("ST", badgeRect.centerX(), badgeRect.centerY() + 5f * scale, badgeTextPaint)

        // Date/Time
        val sdfDate = SimpleDateFormat("dd-MM-yyyy", Locale.getDefault())
        val sdfTime = SimpleDateFormat("HH:mm:ss z", Locale.getDefault())
        val dateStr = sdfDate.format(Date(meta.captureTimeMs))
        val timeStr = sdfTime.format(Date(meta.captureTimeMs))

        // Content Rows
        val labelPaint = Paint().apply {
            color = Color.parseColor("#93C5FD")
            textSize = baseTextSize * 0.95f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }

        val valuePaint = Paint().apply {
            color = Color.WHITE
            textSize = baseTextSize
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
            isAntiAlias = true
        }

        var textY = overlayTop + padding + 45f * scale
        val lineHeight = baseTextSize * 1.45f
        val col2X = width * 0.5f

        // Row 1
        canvas.drawText("Worker: ${meta.workerName}", padding, textY, valuePaint)
        canvas.drawText("Category: ${meta.workCategory}", col2X, textY, valuePaint)

        // Row 2
        textY += lineHeight
        val wardBadge = if (meta.isBoundaryVerified) "[Verified Boundary]" else "[Manually Selected]"
        canvas.drawText("Ward: ${meta.wardNumber} ($wardBadge)", padding, textY, valuePaint)
        canvas.drawText("Area: ${meta.areaName ?: "Not Available"}", col2X, textY, valuePaint)

        // Row 3
        textY += lineHeight
        val latDir = if (meta.latitude >= 0) "N" else "S"
        val lngDir = if (meta.longitude >= 0) "E" else "W"
        canvas.drawText("GPS: %.5f° %s, %.5f° %s".format(Math.abs(meta.latitude), latDir, Math.abs(meta.longitude), lngDir), padding, textY, valuePaint)
        canvas.drawText("Accuracy: ±%.1f m".format(meta.accuracyMeters), col2X, textY, valuePaint)

        // Row 4
        textY += lineHeight
        canvas.drawText("Address: ${meta.formattedAddress.take(45)}...", padding, textY, valuePaint)
        canvas.drawText("PIN: ${meta.pinCode ?: "Not Available"}", col2X, textY, valuePaint)

        // Row 5
        textY += lineHeight
        canvas.drawText("Capture Time: $dateStr  $timeStr", padding, textY, valuePaint)

        // Save output to File
        FileOutputStream(outputFile).use { out ->
            resultBitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
        }

        return outputFile
    }

    fun renderStampedBitmap(
        originalBitmap: Bitmap,
        meta: WatermarkMetadata,
        opacityAlpha: Int = 220
    ): Bitmap {
        val width = originalBitmap.width
        val height = originalBitmap.height

        val resultBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(resultBitmap)

        // Draw original
        canvas.drawBitmap(originalBitmap, 0f, 0f, null)

        val scale = (width / 1200f).coerceAtLeast(1f)
        val baseTextSize = 16f * scale
        val padding = 24f * scale
        val overlayHeight = 220f * scale
        val overlayTop = height - overlayHeight

        // Background Underlay
        val bgPaint = Paint().apply {
            color = Color.argb(opacityAlpha, 15, 23, 42)
            style = Paint.Style.FILL
        }
        canvas.drawRect(0f, overlayTop, width.toFloat(), height.toFloat(), bgPaint)

        // Accent Line
        val accentPaint = Paint().apply {
            color = Color.parseColor("#2563EB")
            strokeWidth = 4f * scale
        }
        canvas.drawLine(0f, overlayTop, width.toFloat(), overlayTop, accentPaint)

        // App Title
        val titlePaint = Paint().apply {
            color = Color.WHITE
            textSize = baseTextSize * 1.3f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }
        canvas.drawText("SUMIT TAG – GPS MAP CAMERA", padding + 40f * scale, overlayTop + padding + 18f * scale, titlePaint)

        // "ST" Badge
        val badgePaint = Paint().apply {
            color = Color.parseColor("#1E40AF")
            style = Paint.Style.FILL
            isAntiAlias = true
        }
        val badgeSize = 34f * scale
        val badgeRect = RectF(padding, overlayTop + padding - 4f * scale, padding + badgeSize, overlayTop + padding + badgeSize - 4f * scale)
        canvas.drawRoundRect(badgeRect, 6f * scale, 6f * scale, badgePaint)

        val badgeTextPaint = Paint().apply {
            color = Color.WHITE
            textSize = 15f * scale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }
        canvas.drawText("ST", badgeRect.centerX(), badgeRect.centerY() + 5f * scale, badgeTextPaint)

        // Date/Time
        val sdfDate = SimpleDateFormat("dd-MM-yyyy", Locale.getDefault())
        val sdfTime = SimpleDateFormat("HH:mm:ss z", Locale.getDefault())
        val dateStr = sdfDate.format(Date(meta.captureTimeMs))
        val timeStr = sdfTime.format(Date(meta.captureTimeMs))

        // Content Rows
        val valuePaint = Paint().apply {
            color = Color.WHITE
            textSize = baseTextSize
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
            isAntiAlias = true
        }

        var textY = overlayTop + padding + 45f * scale
        val lineHeight = baseTextSize * 1.45f
        val col2X = width * 0.5f

        // Row 1
        canvas.drawText("Worker: ${meta.workerName}", padding, textY, valuePaint)
        canvas.drawText("Category: ${meta.workCategory}", col2X, textY, valuePaint)

        // Row 2
        textY += lineHeight
        val wardBadge = if (meta.isBoundaryVerified) "[Verified Boundary]" else "[Manually Selected]"
        canvas.drawText("Ward: ${meta.wardNumber} ($wardBadge)", padding, textY, valuePaint)
        canvas.drawText("Area: ${meta.areaName ?: "Not Available"}", col2X, textY, valuePaint)

        // Row 3
        textY += lineHeight
        val latDir = if (meta.latitude >= 0) "N" else "S"
        val lngDir = if (meta.longitude >= 0) "E" else "W"
        canvas.drawText("GPS: %.5f° %s, %.5f° %s".format(Math.abs(meta.latitude), latDir, Math.abs(meta.longitude), lngDir), padding, textY, valuePaint)
        canvas.drawText("Accuracy: ±%.1f m".format(meta.accuracyMeters), col2X, textY, valuePaint)

        // Row 4
        textY += lineHeight
        canvas.drawText("Address: ${meta.formattedAddress.take(45)}...", padding, textY, valuePaint)
        canvas.drawText("PIN: ${meta.pinCode ?: "Not Available"}", col2X, textY, valuePaint)

        // Row 5
        textY += lineHeight
        canvas.drawText("Capture Time: $dateStr  $timeStr", padding, textY, valuePaint)

        return resultBitmap
    }

    /**
     * Stamped photograph and saves automatically to Android MediaStore Pictures/Sumit Tag/
     * If saveOriginal is true, also saves raw unwatermarked bitmap separately.
     */
    fun stampAndSaveToGallery(
        context: android.content.Context,
        originalBitmap: Bitmap,
        meta: WatermarkMetadata,
        saveOriginal: Boolean = true
    ): Pair<android.net.Uri?, android.net.Uri?> {
        val stampedBitmap = renderStampedBitmap(originalBitmap, meta)
        val stampedUri = com.sumittag.gpsmapcamera.storage.MediaStoreGallerySaver.saveBitmapToGallery(
            context = context,
            bitmap = stampedBitmap,
            captureTimeMs = meta.captureTimeMs,
            isOriginal = false
        )

        var originalUri: android.net.Uri? = null
        if (saveOriginal) {
            originalUri = com.sumittag.gpsmapcamera.storage.MediaStoreGallerySaver.saveBitmapToGallery(
                context = context,
                bitmap = originalBitmap,
                captureTimeMs = meta.captureTimeMs,
                isOriginal = true
            )
        }

        return Pair(stampedUri, originalUri)
    }
}
