package com.sumittag.gpsmapcamera

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: false
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false

        if (cameraGranted && fineLocationGranted) {
            gpsProvider.startLocationUpdates()
        } else {
            Toast.makeText(
                this,
                "Camera & GPS permissions are required for municipal geotagging",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        database = AppDatabase.getInstance(applicationContext)
        gpsProvider = GpsLocationProvider(this)
        cameraManager = CameraXManager(this)

        checkAndRequestPermissions()

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    // Compose Application Root Navigation
                    // (Camera Screen, Gallery, Dashboard, Ward & Worker Management)
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        val ungranted = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (ungranted.isNotEmpty()) {
            permissionLauncher.launch(ungranted.toTypedArray())
        } else {
            gpsProvider.startLocationUpdates()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        gpsProvider.stopLocationUpdates()
    }
}
