package com.sumittag.gpsmapcamera

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.sumittag.gpsmapcamera.camera.CameraXManager
import com.sumittag.gpsmapcamera.data.AppDatabase
import com.sumittag.gpsmapcamera.location.GpsLocationProvider
import com.sumittag.gpsmapcamera.storage.AndroidMediaStoreBridge

class MainActivity : ComponentActivity() {

    private lateinit var gpsProvider: GpsLocationProvider
    private lateinit var cameraManager: CameraXManager
    private lateinit var database: AppDatabase
    private var webView: WebView? = null

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

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        database = AppDatabase.getInstance(applicationContext)
        gpsProvider = GpsLocationProvider(this)
        cameraManager = CameraXManager(this)

        checkAndRequestPermissions()

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { context ->
                            WebView(context).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                webView = this

                                settings.apply {
                                    javaScriptEnabled = true
                                    domStorageEnabled = true
                                    databaseEnabled = true
                                    allowFileAccess = true
                                    allowContentAccess = true
                                    setGeolocationEnabled(true)
                                    mediaPlaybackRequiresUserGesture = false
                                }

                                webChromeClient = object : WebChromeClient() {
                                    override fun onGeolocationPermissionsShowPrompt(
                                        origin: String?,
                                        callback: GeolocationPermissions.Callback?
                                    ) {
                                        callback?.invoke(origin, true, false)
                                    }

                                    override fun onPermissionRequest(request: PermissionRequest?) {
                                        request?.grant(request.resources)
                                    }
                                }

                                webViewClient = object : WebViewClient() {
                                    override fun shouldOverrideUrlLoading(
                                        view: WebView?,
                                        request: WebResourceRequest?
                                    ): Boolean {
                                        return false
                                    }
                                }

                                // Attach native MediaStore bridge so photos save automatically to Pictures/Sumit Tag/
                                addJavascriptInterface(
                                    AndroidMediaStoreBridge(context),
                                    "AndroidMediaStore"
                                )

                                loadUrl("file:///android_asset/www/index.html")
                            }
                        }
                    )
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

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView?.canGoBack() == true) {
            webView?.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        gpsProvider.stopLocationUpdates()
        webView?.destroy()
    }
}
