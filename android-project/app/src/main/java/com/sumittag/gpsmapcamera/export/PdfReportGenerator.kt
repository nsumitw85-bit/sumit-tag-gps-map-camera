package com.sumittag.gpsmapcamera.export

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import com.sumittag.gpsmapcamera.data.PhotoEntity
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

object PdfReportGenerator {

    fun generateA4MunicipalReport(
        context: Context,
        photos: List<PhotoEntity>,
        outputFile: File
    ): File {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // Standard A4 portrait in points

        var currentPageNum = 1
        var page = pdfDocument.startPage(pageInfo)
        var canvas = page.canvas

        val paint = Paint().apply { isAntiAlias = true }
        var currentY = 30f

        // Draw Header Banner
        paint.color = Color.parseColor("#1E40AF")
        canvas.drawRect(0f, 0f, 595f, 60f, paint)

        paint.color = Color.WHITE
        paint.textSize = 18f
        paint.isFakeBoldText = true
        canvas.drawText("SUMIT TAG – GPS MAP CAMERA", 20f, 35f, paint)

        paint.textSize = 10f
        paint.isFakeBoldText = false
        canvas.drawText("Municipal Sanitation Geotagged Field Report (A4)", 20f, 50f, paint)

        currentY = 80f

        val sdf = SimpleDateFormat("dd-MM-yyyy HH:mm:ss", Locale.getDefault())

        photos.take(2).forEachIndexed { index, photo ->
            // Card background
            paint.color = Color.parseColor("#F8FAFC")
            canvas.drawRoundRect(20f, currentY, 575f, currentY + 340f, 8f, 8f, paint)

            // Draw Photo
            val photoFile = File(photo.stampedPhotoPath)
            if (photoFile.exists()) {
                val bmp = BitmapFactory.decodeFile(photoFile.absolutePath)
                if (bmp != null) {
                    canvas.drawBitmap(bmp, null, android.graphics.RectF(30f, currentY + 15f, 290f, currentY + 210f), null)
                }
            }

            // Draw Metadata Text
            paint.color = Color.parseColor("#0F172A")
            paint.textSize = 12f
            paint.isFakeBoldText = true
            canvas.drawText("Record #${index + 1}: ${photo.workCategory}", 305f, currentY + 30f, paint)

            paint.textSize = 9.5f
            paint.isFakeBoldText = false
            canvas.drawText("Worker: ${photo.workerName} (${photo.workerId})", 305f, currentY + 50f, paint)
            canvas.drawText("Ward: ${photo.wardNumber} - ${photo.areaName ?: "Area"}", 305f, currentY + 68f, paint)
            canvas.drawText("GPS: ${photo.latitude}° N, ${photo.longitude}° E", 305f, currentY + 86f, paint)
            canvas.drawText("Accuracy: ±${photo.accuracyMeters} m", 305f, currentY + 104f, paint)
            canvas.drawText("Date/Time: ${sdf.format(Date(photo.captureTimestamp))}", 305f, currentY + 122f, paint)
            canvas.drawText("Address: ${photo.formattedAddress.take(40)}", 305f, currentY + 140f, paint)

            currentY += 360f
        }

        // Municipal Signatures
        paint.color = Color.parseColor("#64748B")
        paint.textSize = 9f
        paint.isFakeBoldText = true
        canvas.drawLine(20f, 790f, 575f, 790f, paint)
        canvas.drawText("PREPARED BY (MUKADAM)", 40f, 810f, paint)
        canvas.drawText("VERIFIED BY (INSPECTOR)", 230f, 810f, paint)
        canvas.drawText("APPROVED BY (ENGINEER)", 420f, 810f, paint)

        pdfDocument.finishPage(page)

        FileOutputStream(outputFile).use { out ->
            pdfDocument.writeTo(out)
        }
        pdfDocument.close()

        return outputFile
    }
}
