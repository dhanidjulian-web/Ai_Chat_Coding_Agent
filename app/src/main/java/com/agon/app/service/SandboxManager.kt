package com.agon.app.service

import android.content.Context
import android.os.Build
import com.agon.app.model.LinuxDistro
import com.agon.app.model.SandboxPackage
import com.agon.app.model.SandboxStatus
import java.io.File

class SandboxManager(private val context: Context) {

    val rootfsBaseDir: File
        get() = File(context.filesDir, "rootfs").apply { if (!exists()) mkdirs() }

    fun getDistroDir(distro: LinuxDistro): File {
        return File(rootfsBaseDir, distro.name.lowercase()).apply { if (!exists()) mkdirs() }
    }

    fun detectArchitecture(): String {
        return Build.SUPPORTED_ABIS.firstOrNull() ?: System.getProperty("os.arch") ?: "aarch64"
    }

    fun initializeRootfs(distro: LinuxDistro): SandboxStatus {
        val targetDir = getDistroDir(distro)
        val subDirs = listOf(
            "bin", "etc", "home/nexus", "lib", "opt", "proc",
            "root", "sys", "tmp", "usr/bin", "usr/lib", "usr/local/bin", "var/log"
        )
        for (sub in subDirs) {
            File(targetDir, sub).mkdirs()
        }

        // Generate /etc/os-release
        val osReleaseFile = File(targetDir, "etc/os-release")
        if (!osReleaseFile.exists()) {
            osReleaseFile.writeText(
                """
                NAME="${distro.distroName}"
                VERSION="${distro.version}"
                ID=${distro.name.lowercase()}
                ID_LIKE=debian
                PRETTY_NAME="${distro.distroName} ${distro.version} (NexusDev Sandbox)"
                HOME_URL="https://www.nexusdev.internal"
                SUPPORT_URL="https://github.com/agon/nexusdev"
                BUG_REPORT_URL="https://github.com/agon/nexusdev/issues"
                """.trimIndent()
            )
        }

        // Generate launcher wrapper script
        val launcherScript = File(context.filesDir, "sandbox_exec_${distro.name.lowercase()}.sh")
        launcherScript.writeText(
            """
            #!/bin/sh
            export ROOTFS="${targetDir.absolutePath}"
            export HOME="${'$'}ROOTFS/home/nexus"
            export USER="nexus"
            export PATH="${'$'}ROOTFS/bin:${'$'}ROOTFS/usr/bin:${'$'}ROOTFS/usr/local/bin:${'$'}PATH"
            export SHELL="/bin/sh"
            export LD_LIBRARY_PATH="${'$'}ROOTFS/lib:${'$'}ROOTFS/usr/lib:${'$'}LD_LIBRARY_PATH"
            cd "${'$'}HOME"
            echo "Entering ${distro.distroName} Sandbox (${distro.version})..."
            exec sh "${'$'}@"
            """.trimIndent()
        )
        launcherScript.setExecutable(true)

        val installedCount = getInstalledPackages(distro).size

        return SandboxStatus(
            currentDistro = distro,
            isInitialized = true,
            rootfsDirectory = targetDir.absolutePath,
            detectedArch = detectArchitecture(),
            installedPackageCount = installedCount,
            isProotAvailable = true
        )
    }

    fun getAvailablePackages(distro: LinuxDistro): List<SandboxPackage> {
        return when (distro) {
            LinuxDistro.UBUNTU_24 -> listOf(
                SandboxPackage("python3", "Language", "Python 3.12 interpreter and virtual environment", "apt install -y python3 python3-pip", isInstalled = true, sizeEstimate = "45 MB"),
                SandboxPackage("git", "VCS", "Fast, scalable, distributed revision control system", "apt install -y git", isInstalled = true, sizeEstimate = "28 MB"),
                SandboxPackage("curl", "Networking", "Command line tool for transferring data with URLs", "apt install -y curl", isInstalled = true, sizeEstimate = "5 MB"),
                SandboxPackage("wget", "Networking", "Retrieves files from the web via HTTP/HTTPS/FTP", "apt install -y wget", isInstalled = true, sizeEstimate = "4 MB"),
                SandboxPackage("clang", "Compiler", "C/C++ compiler and toolchain", "apt install -y clang make", isInstalled = false, sizeEstimate = "120 MB"),
                SandboxPackage("nodejs", "Language", "JavaScript runtime built on Chrome's V8 engine", "apt install -y nodejs npm", isInstalled = false, sizeEstimate = "65 MB"),
                SandboxPackage("rustc", "Language", "Rust compiler and cargo package manager", "apt install -y rustc cargo", isInstalled = false, sizeEstimate = "140 MB"),
                SandboxPackage("tmux", "Utility", "Terminal multiplexer for managing multiple shell windows", "apt install -y tmux", isInstalled = true, sizeEstimate = "8 MB"),
                SandboxPackage("htop", "Monitor", "Interactive process viewer and system monitor", "apt install -y htop", isInstalled = true, sizeEstimate = "3 MB"),
                SandboxPackage("jq", "Utility", "Lightweight and flexible command-line JSON processor", "apt install -y jq", isInstalled = false, sizeEstimate = "2 MB"),
                SandboxPackage("neovim", "Editor", "Vim-fork focused on extensibility and usability", "apt install -y neovim", isInstalled = false, sizeEstimate = "35 MB")
            )
            LinuxDistro.DEBIAN_12 -> listOf(
                SandboxPackage("git", "VCS", "Git distributed revision control system", "apt install -y git", isInstalled = true, sizeEstimate = "22 MB"),
                SandboxPackage("curl", "Networking", "Command line HTTP client", "apt install -y curl", isInstalled = true, sizeEstimate = "4 MB"),
                SandboxPackage("nano", "Editor", "Small, friendly text editor inspired by Pico", "apt install -y nano", isInstalled = true, sizeEstimate = "2 MB"),
                SandboxPackage("net-tools", "Networking", "Networking utilities including ifconfig, route, arp", "apt install -y net-tools", isInstalled = true, sizeEstimate = "3 MB"),
                SandboxPackage("iproute2", "Networking", "Modern Linux IP routing and network configuration", "apt install -y iproute2", isInstalled = true, sizeEstimate = "6 MB"),
                SandboxPackage("ca-certificates", "Security", "Common CA certificates for SSL verification", "apt install -y ca-certificates", isInstalled = true, sizeEstimate = "1 MB"),
                SandboxPackage("python3-minimal", "Language", "Minimal subset of Python 3 runtime", "apt install -y python3-minimal", isInstalled = false, sizeEstimate = "18 MB"),
                SandboxPackage("tar", "Archiver", "GNU version of tar archiving utility", "apt install -y tar", isInstalled = true, sizeEstimate = "3 MB")
            )
            LinuxDistro.KALI_NETHUNTER -> listOf(
                SandboxPackage("nmap", "Security", "Network exploration tool and security / port scanner", "apt install -y nmap", isInstalled = true, sizeEstimate = "32 MB"),
                SandboxPackage("tcpdump", "Security", "Powerful command-line packet analyzer", "apt install -y tcpdump", isInstalled = true, sizeEstimate = "6 MB"),
                SandboxPackage("wireshark-common", "Security", "Network packet disassembly and capture libraries", "apt install -y wireshark-common", isInstalled = false, sizeEstimate = "40 MB"),
                SandboxPackage("aircrack-ng", "Security", "802.11 WEP and WPA/WPA2-PSK key cracking program", "apt install -y aircrack-ng", isInstalled = false, sizeEstimate = "15 MB"),
                SandboxPackage("sqlmap", "Security", "Automatic SQL injection and database takeover tool", "apt install -y sqlmap", isInstalled = false, sizeEstimate = "25 MB"),
                SandboxPackage("hydra", "Security", "Very fast network logon cracker supporting many protocols", "apt install -y hydra", isInstalled = false, sizeEstimate = "12 MB"),
                SandboxPackage("metasploit-framework", "Security", "Penetration testing platform and exploit database", "apt install -y metasploit-framework", isInstalled = false, sizeEstimate = "350 MB"),
                SandboxPackage("socat", "Networking", "Multipurpose relay for bidirectional data transfers", "apt install -y socat", isInstalled = true, sizeEstimate = "4 MB")
            )
        }
    }

    fun getInstalledPackages(distro: LinuxDistro): List<SandboxPackage> {
        return getAvailablePackages(distro).filter { it.isInstalled }
    }
}
