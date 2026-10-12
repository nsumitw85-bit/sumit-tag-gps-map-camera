package com.sumittag.gpsmapcamera

import android.app.Application
import com.sumittag.gpsmapcamera.data.AppDatabase

/**
 * Sumit Tag - GPS Map Camera
 * Base Application class for singleton resource initialization
 */
class SumitTagApp : Application() {

    override fun onCreate() {
        super.onCreate()
        // Initialize Room AppDatabase eagerly
        AppDatabase.getInstance(this)
    }
}
