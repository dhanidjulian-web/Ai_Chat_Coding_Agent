package com.agon.app.model

import kotlinx.serialization.Serializable

@Serializable
enum class LinuxDistro(
    val distroName: String,
    val version: String,
    val baseArch: String,
    val description: String,
    val defaultPackages: List<String>
) {
    UBUNTU_24(
        "Ubuntu",
        "24.04 LTS (Noble Numbat)",
        "aarch64 / arm64",
        "Production server environment with apt package manager and canonical toolchains",
        listOf("curl", "wget", "git", "python3", "python3-pip", "build-essential", "tmux", "htop")
    ),
    DEBIAN_12(
        "Debian",
        "12 (Bookworm)",
        "aarch64 / arm64",
        "Rock-solid Debian base minimal rootfs with strict stability and low memory footprint",
        listOf("curl", "git", "nano", "net-tools", "iproute2", "ca-certificates")
    ),
    KALI_NETHUNTER(
        "Kali NetHunter",
        "Rolling 2026",
        "aarch64 / arm64",
        "Offensive security, penetration testing, network diagnostics & security audit tools",
        listOf("nmap", "tcpdump", "wireshark-common", "aircrack-ng", "sqlmap", "hydra", "metasploit-framework")
    )
}

@Serializable
data class SandboxPackage(
    val name: String,
    val category: String,
    val description: String,
    val command: String,
    val isInstalled: Boolean = false,
    val sizeEstimate: String = "15 MB"
)

data class SandboxStatus(
    val currentDistro: LinuxDistro = LinuxDistro.UBUNTU_24,
    val isInitialized: Boolean = false,
    val rootfsDirectory: String = "",
    val detectedArch: String = "unknown",
    val installedPackageCount: Int = 0,
    val lastExitCode: Int? = null,
    val isProotAvailable: Boolean = false
)
