package com.sumittag.gpsmapcamera.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.os.Build
import com.google.android.gms.location.*
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.Locale
import kotlin.coroutines.resume

data class LocationFix(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val altitudeMeters: Double?,
    val speedMps: Float?,
    val timestampMs: Long,
    val isStale: Boolean
)

data class ResolvedAddress(
    val formattedAddress: String,
    val street: String?,
    val locality: String?,
    val district: String?,
    val state: String?,
    val pinCode: String?,
    val country: String?
)

class GpsLocationProvider(private val context: Context) {

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private val _locationFlow = MutableSharedFlow<LocationFix>(
        replay = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val locationFlow: SharedFlow<LocationFix> = _locationFlow.asSharedFlow()

    private var lastFix: LocationFix? = null

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            val now = System.currentTimeMillis()
            val ageMs = now - location.time
            val isStale = ageMs > 30_000 // 30 seconds

            val fix = LocationFix(
                latitude = location.latitude,
                longitude = location.longitude,
                accuracyMeters = location.accuracy,
                altitudeMeters = if (location.hasAltitude()) location.altitude else null,
                speedMps = if (location.hasSpeed()) location.speed else null,
                timestampMs = location.time,
                isStale = isStale
            )
            lastFix = fix
            _locationFlow.tryEmit(fix)
        }
    }

    @SuppressLint("MissingPermission")
    fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            3000L // 3 seconds interval
        ).apply {
            setMinUpdateIntervalMillis(1500L)
            setMinUpdateDistanceMeters(1.0f)
        }.build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            context.mainLooper
        )
    }

    fun stopLocationUpdates() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    fun getLastKnownFix(): LocationFix? = lastFix

    suspend fun reverseGeocode(latitude: Double, longitude: Double): ResolvedAddress? {
        val geocoder = Geocoder(context, Locale.getDefault())
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                suspendCancellableCoroutine { cont ->
                    try {
                        geocoder.getFromLocation(latitude, longitude, 1) { addresses ->
                            if (cont.isActive) {
                                cont.resume(parseAddress(addresses.firstOrNull()))
                            }
                        }
                    } catch (e: Exception) {
                        if (cont.isActive) {
                            cont.resume(null)
                        }
                    }
                }
            } else {
                @Suppress("DEPRECATION")
                val list = geocoder.getFromLocation(latitude, longitude, 1)
                parseAddress(list?.firstOrNull())
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun parseAddress(addr: Address?): ResolvedAddress? {
        if (addr == null) return null
        val full = (0..addr.maxAddressLineIndex).joinToString(", ") { addr.getAddressLine(it) }
        return ResolvedAddress(
            formattedAddress = full.ifEmpty { "Not Available" },
            street = addr.thoroughfare,
            locality = addr.locality ?: addr.subLocality,
            district = addr.subAdminArea,
            state = addr.adminArea,
            pinCode = addr.postalCode,
            country = addr.countryName
        )
    }
}
