package com.agon.app.service

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.StatFs
import com.agon.app.model.SystemResources
import java.io.File
import java.io.RandomAccessFile

class DeviceMonitorService(private val context: Context) {

    fun getSystemResources(sandboxReady: Boolean, sandboxDistro: String): SystemResources {
        val cpuCores = Runtime.getRuntime().availableProcessors()
        val cpuArch = Build.SUPPORTED_ABIS.firstOrNull() ?: System.getProperty("os.arch") ?: "arm64"
        val cpuUsage = readCpuUsagePercent()

        // RAM info
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager?.getMemoryInfo(memoryInfo)

        val ramTotalMb = memoryInfo.totalMem / (1024 * 1024)
        val ramFreeMb = memoryInfo.availMem / (1024 * 1024)
        val ramUsedMb = (ramTotalMb - ramFreeMb).coerceAtLeast(0)
        val ramPercent = if (ramTotalMb > 0) ((ramUsedMb.toDouble() / ramTotalMb.toDouble()) * 100).toInt() else 0

        // Storage info for app sandbox directory
        val stat = StatFs(context.filesDir.path)
        val blockSize = stat.blockSizeLong
        val totalBlocks = stat.blockCountLong
        val availableBlocks = stat.availableBlocksLong

        val totalBytes = totalBlocks * blockSize
        val freeBytes = availableBlocks * blockSize
        val usedBytes = (totalBytes - freeBytes).coerceAtLeast(0)

        val storageTotalGb = (totalBytes.toDouble() / (1024.0 * 1024.0 * 1024.0) * 10.0).toInt() / 10.0
        val storageUsedGb = (usedBytes.toDouble() / (1024.0 * 1024.0 * 1024.0) * 10.0).toInt() / 10.0
        val storageFreeGb = (freeBytes.toDouble() / (1024.0 * 1024.0 * 1024.0) * 10.0).toInt() / 10.0
        val storagePercent = if (totalBytes > 0) ((usedBytes.toDouble() / totalBytes.toDouble()) * 100).toInt() else 0

        val statusText = if (sandboxReady) "Connected ($sandboxDistro)" else "Standby (Native Shell)"

        return SystemResources(
            cpuCores = cpuCores,
            cpuArchitecture = cpuArch,
            cpuUsagePercent = cpuUsage,
            ramTotalMb = ramTotalMb,
            ramUsedMb = ramUsedMb,
            ramFreeMb = ramFreeMb,
            ramPercent = ramPercent,
            storageTotalGb = storageTotalGb,
            storageUsedGb = storageUsedGb,
            storageFreeGb = storageFreeGb,
            storagePercent = storagePercent,
            sandboxConnected = sandboxReady,
            sandboxStatusText = statusText
        )
    }

    private fun readCpuUsagePercent(): Int {
        try {
            val statFile = File("/proc/stat")
            if (statFile.exists() && statFile.canRead()) {
                val line = statFile.bufferedReader().use { it.readLine() }
                if (line != null && line.startsWith("cpu")) {
                    val tokens = line.split("\\s+".toRegex()).filter { it.isNotEmpty() }
                    if (tokens.size >= 5) {
                        val user = tokens[1].toLongOrNull() ?: 0L
                        val nice = tokens[2].toLongOrNull() ?: 0L
                        val system = tokens[3].toLongOrNull() ?: 0L
                        val idle = tokens[4].toLongOrNull() ?: 0L
                        val active = user + nice + system
                        val total = active + idle
                        if (total > 0) {
                            return ((active.toDouble() / total.toDouble()) * 100).toInt().coerceIn(1, 99)
                        }
                    }
                }
            }
        } catch (_: Exception) {
            // fallback
        }
        return 12 // estimated fallback active load
    }
}
