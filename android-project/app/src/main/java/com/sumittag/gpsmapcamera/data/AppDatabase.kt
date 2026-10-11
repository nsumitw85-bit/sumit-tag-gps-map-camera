package com.sumittag.gpsmapcamera.data

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
    val wardName: String?,
    val areaName: String?,
    val isBoundaryVerified: Boolean,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val altitudeMeters: Double?,
    val formattedAddress: String,
    val pinCode: String?,
    val captureTimestamp: Long,
    val originalPhotoPath: String?,
    val stampedPhotoPath: String,
    val notes: String?
)

@Dao
interface PhotoDao {
    @Query("SELECT * FROM photos ORDER BY captureTimestamp DESC")
    fun getAllPhotos(): Flow<List<PhotoEntity>>

    @Query("SELECT * FROM photos WHERE captureTimestamp BETWEEN :startTime AND :endTime ORDER BY captureTimestamp DESC")
    suspend fun getPhotosByDateRange(startTime: Long, endTime: Long): List<PhotoEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPhoto(photo: PhotoEntity)

    @Delete
    suspend fun deletePhoto(photo: PhotoEntity)
}

@Database(entities = [PhotoEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun photoDao(): PhotoDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "sumit_tag_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
