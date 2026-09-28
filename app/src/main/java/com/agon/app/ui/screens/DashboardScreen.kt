package com.agon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.model.LinuxDistro
import com.agon.app.ui.components.ResourceMonitorCard
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.AppScreen
import com.agon.app.viewmodel.WorkspaceViewModel

@Composable
fun DashboardScreen(
    viewModel: WorkspaceViewModel,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(TechDarkBackground)
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(top = 10.dp, bottom = 90.dp)
    ) {
        // 1. Google App User Profile Card
        item {
            UserProfileCard(viewModel)
        }

        // 2. Real System Engine Telemetry (CPU, RAM, Storage, Sandbox Status)
        item {
            ResourceMonitorCard(resources = viewModel.systemResources)
        }

        // 3. Linux Sandbox Status & Quick Distro Switcher
        item {
            SandboxStatusCard(viewModel)
        }

        // 4. Fallback Model Chain (Max 15) & AI Router Status
        item {
            FallbackChainCard(viewModel)
        }

        // 5. Quick DevOps Workflows & Package Shortcuts
        item {
            QuickDevOpsCard(viewModel)
        }
    }
}

@Composable
private fun UserProfileCard(viewModel: WorkspaceViewModel) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Default Google User Avatar initials
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(NeonCyan, NeonViolet))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "DE",
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = viewModel.userName,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = NeonEmerald.copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "VERIFIED DEVOPS",
                                color = NeonEmerald,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Text(
                        text = viewModel.userEmail,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            IconButton(
                onClick = { viewModel.refreshSystemResources() }
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Refresh System Resources",
                    tint = NeonCyan
                )
            }
        }
    }
}

@Composable
private fun SandboxStatusCard(viewModel: WorkspaceViewModel) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Terminal,
                        contentDescription = "Sandbox",
                        tint = NeonCyan,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "LINUX PROOT / ROOTFS SANDBOX",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeonCyan,
                        letterSpacing = 1.sp
                    )
                }

                Button(
                    onClick = { viewModel.activeScreen = AppScreen.PACKAGES },
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TechDarkSurfaceVariant),
                    modifier = Modifier.height(28.dp)
                ) {
                    Text(text = "Manage Rootfs", fontSize = 10.sp, color = NeonCyan)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Distro Selector Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                LinuxDistro.values().forEach { distro ->
                    val isSelected = viewModel.activeDistro == distro
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { viewModel.switchDistro(distro) },
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) NeonCyan.copy(alpha = 0.15f) else TechDarkSurfaceVariant,
                        border = if (isSelected) ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(NeonCyan)
                        ) else null
                    ) {
                        Column(modifier = Modifier.padding(8.dp)) {
                            Text(
                                text = distro.distroName,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) NeonCyan else TextPrimary
                            )
                            Text(
                                text = distro.version.split(" ").first(),
                                fontSize = 9.sp,
                                color = TextMuted
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Sandbox info specs
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(6.dp),
                color = TerminalBlack
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    Text(
                        text = "Rootfs Path: ${viewModel.sandboxStatus.rootfsDirectory}",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = TerminalGreen
                    )
                    Text(
                        text = "Host Arch: ${viewModel.sandboxStatus.detectedArch} | Proot Wrapper: Active | Packages: ${viewModel.sandboxStatus.installedPackageCount} installed",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

@Composable
private fun FallbackChainCard(viewModel: WorkspaceViewModel) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.AltRoute,
                        contentDescription = "Routing",
                        tint = NeonViolet,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "AI ROUTING & FALLBACK CASCADE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeonViolet,
                        letterSpacing = 1.sp
                    )
                }

                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = TechDarkSurfaceVariant
                ) {
                    Text(
                        text = viewModel.orchestratorProfile.routingMode.label,
                        color = NeonCyan,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Cascading chain triggers automatically if primary provider experiences timeout or rate limit (Max 15 models):",
                fontSize = 10.sp,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Fallback items up to 4 preview
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                viewModel.fallbackChain.take(4).forEach { entry ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(6.dp),
                        color = TechDarkSurfaceVariant
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "#${entry.priority}",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = NeonAmber,
                                    fontFamily = FontFamily.Monospace
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = entry.modelId,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                            Text(
                                text = entry.providerName,
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Button(
                onClick = { viewModel.activeScreen = AppScreen.BYOK },
                shape = RoundedCornerShape(6.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TechDarkSurfaceVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Configure All ${viewModel.fallbackChain.size} Fallback Models in BYOK Settings",
                    fontSize = 11.sp,
                    color = NeonCyan
                )
            }
        }
    }
}

@Composable
private fun QuickDevOpsCard(viewModel: WorkspaceViewModel) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = "QUICK DEVOPS LAUNCHPAD",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = NeonCyan,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilledTonalButton(
                    onClick = {
                        viewModel.executeTerminalCommand("uname -a && cat /proc/version")
                        viewModel.activeScreen = AppScreen.TERMINAL
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = TechDarkSurfaceVariant)
                ) {
                    Text("Kernel Check", fontSize = 10.sp, color = TextPrimary)
                }

                FilledTonalButton(
                    onClick = {
                        viewModel.executeTerminalCommand("df -h && free -m")
                        viewModel.activeScreen = AppScreen.TERMINAL
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = TechDarkSurfaceVariant)
                ) {
                    Text("Disk & RAM", fontSize = 10.sp, color = TextPrimary)
                }

                FilledTonalButton(
                    onClick = {
                        viewModel.executeTerminalCommand("ls -la")
                        viewModel.activeScreen = AppScreen.TERMINAL
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = TechDarkSurfaceVariant)
                ) {
                    Text("List Files", fontSize = 10.sp, color = TextPrimary)
                }
            }
        }
    }
}
