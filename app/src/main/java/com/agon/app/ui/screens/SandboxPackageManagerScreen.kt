package com.agon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.model.LinuxDistro
import com.agon.app.model.SandboxPackage
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.WorkspaceViewModel

@Composable
fun SandboxPackageManagerScreen(
    viewModel: WorkspaceViewModel,
    modifier: Modifier = Modifier
) {
    val filteredPackages = viewModel.availablePackages.filter {
        it.name.contains(viewModel.packageSearchQuery, ignoreCase = true) ||
                it.category.contains(viewModel.packageSearchQuery, ignoreCase = true) ||
                it.description.contains(viewModel.packageSearchQuery, ignoreCase = true)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(TechDarkBackground)
            .padding(10.dp)
    ) {
        // Distro Switcher Tab Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            LinuxDistro.values().forEach { distro ->
                val isSelected = viewModel.activeDistro == distro
                FilledTonalButton(
                    onClick = { viewModel.switchDistro(distro) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = if (isSelected) NeonCyan.copy(alpha = 0.2f) else TechDarkSurfaceVariant,
                        contentColor = if (isSelected) NeonCyan else TextPrimary
                    )
                ) {
                    Text(
                        text = distro.distroName,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Distro Architecture & Status Banner
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
            border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
        ) {
            Column(modifier = Modifier.padding(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "${viewModel.activeDistro.distroName} ${viewModel.activeDistro.version}",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = NeonCyan
                        )
                        Text(
                            text = "Detected Architecture: ${viewModel.sandboxStatus.detectedArch}",
                            fontSize = 10.sp,
                            color = TextMuted,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Button(
                        onClick = { viewModel.bootstrapSandbox() },
                        shape = RoundedCornerShape(6.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = TechDarkSurfaceVariant)
                    ) {
                        Text("Rebuild Rootfs", fontSize = 10.sp, color = NeonEmerald)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Search Bar
        OutlinedTextField(
            value = viewModel.packageSearchQuery,
            onValueChange = { viewModel.packageSearchQuery = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search packages (python, git, clang, nmap)...", fontSize = 12.sp, color = TextMuted) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = NeonCyan) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = TechDarkSurface,
                unfocusedContainerColor = TechDarkSurface,
                focusedBorderColor = NeonCyan,
                unfocusedBorderColor = TechDarkBorder
            ),
            shape = RoundedCornerShape(10.dp)
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Package List
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(filteredPackages, key = { it.name }) { pkg ->
                PackageItemCard(
                    pkg = pkg,
                    onInstall = { viewModel.installSandboxPackage(pkg) }
                )
            }
        }
    }
}

@Composable
private fun PackageItemCard(
    pkg: SandboxPackage,
    onInstall: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = pkg.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeonCyan,
                        fontFamily = FontFamily.Monospace
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = TechDarkSurfaceVariant
                    ) {
                        Text(
                            text = pkg.category,
                            fontSize = 9.sp,
                            color = NeonViolet,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "(${pkg.sizeEstimate})",
                        fontSize = 10.sp,
                        color = TextMuted
                    )
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = pkg.description,
                    fontSize = 11.sp,
                    color = TextSecondary
                )
            }

            if (pkg.isInstalled) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = NeonEmerald.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = "INSTALLED",
                        fontSize = 10.sp,
                        color = NeonEmerald,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            } else {
                Button(
                    onClick = onInstall,
                    shape = RoundedCornerShape(6.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NeonCyan),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                    modifier = Modifier.height(30.dp)
                ) {
                    Text("Install", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
