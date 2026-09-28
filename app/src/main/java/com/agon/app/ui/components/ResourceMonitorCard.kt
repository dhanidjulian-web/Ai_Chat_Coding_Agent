package com.agon.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.model.SystemResources
import com.agon.app.ui.theme.*

@Composable
fun ResourceMonitorCard(
    resources: SystemResources,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
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
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .padding(end = 4.dp)
                    )
                    Text(
                        text = "SYSTEM ENGINE TELEMETRY",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeonCyan,
                        letterSpacing = 1.sp
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (resources.sandboxConnected) NeonEmerald.copy(alpha = 0.15f) else NeonAmber.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = resources.sandboxStatusText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (resources.sandboxConnected) NeonEmerald else NeonAmber,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricItem(
                    title = "CPU",
                    detail = "${resources.cpuCores} Cores (${resources.cpuArchitecture})",
                    percent = resources.cpuUsagePercent,
                    color = NeonCyan,
                    icon = Icons.Default.Memory,
                    modifier = Modifier.weight(1f)
                )

                MetricItem(
                    title = "RAM",
                    detail = "${resources.ramUsedMb}/${resources.ramTotalMb} MB",
                    percent = resources.ramPercent,
                    color = NeonViolet,
                    icon = Icons.Default.Memory,
                    modifier = Modifier.weight(1f)
                )

                MetricItem(
                    title = "STORAGE",
                    detail = "${resources.storageFreeGb} GB Free",
                    percent = resources.storagePercent,
                    color = NeonEmerald,
                    icon = Icons.Default.Storage,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun MetricItem(
    title: String,
    detail: String,
    percent: Int,
    color: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = TechDarkSurfaceVariant
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary
                )
                Text(
                    text = "$percent%",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = color,
                    fontFamily = FontFamily.Monospace
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            LinearProgressIndicator(
                progress = { (percent.coerceIn(0, 100)) / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp),
                color = color,
                trackColor = TechDarkBorder
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = detail,
                fontSize = 9.sp,
                color = TextMuted,
                maxLines = 1
            )
        }
    }
}
