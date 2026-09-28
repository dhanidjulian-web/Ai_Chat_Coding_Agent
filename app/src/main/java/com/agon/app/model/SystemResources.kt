package com.agon.app.model

data class SystemResources(
    val cpuCores: Int,
    val cpuArchitecture: String,
    val cpuUsagePercent: Int,
    val ramTotalMb: Long,
    val ramUsedMb: Long,
    val ramFreeMb: Long,
    val ramPercent: Int,
    val storageTotalGb: Double,
    val storageUsedGb: Double,
    val storageFreeGb: Double,
    val storagePercent: Int,
    val sandboxConnected: Boolean,
    val sandboxStatusText: String
)
