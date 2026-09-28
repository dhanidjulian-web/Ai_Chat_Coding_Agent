package com.agon.app.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.AppScreen

@Composable
fun WindowToggleBar(
    activeScreen: AppScreen,
    onSelectScreen: (AppScreen) -> Unit,
    isSplitView: Boolean,
    onToggleSplitView: () -> Unit,
    isSidebarOpen: Boolean,
    onToggleSidebar: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = TechDarkSurface,
        tonalElevation = 6.dp,
        border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 6.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            IconButton(
                onClick = onToggleSidebar,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Menu,
                    contentDescription = "Sidebar",
                    tint = if (isSidebarOpen) NeonCyan else TextSecondary
                )
            }

            ScreenTabItem(
                label = "Dashboard",
                icon = Icons.Default.Dashboard,
                isSelected = activeScreen == AppScreen.DASHBOARD,
                onClick = { onSelectScreen(AppScreen.DASHBOARD) }
            )

            ScreenTabItem(
                label = "AI Assistant",
                icon = Icons.Default.Chat,
                isSelected = activeScreen == AppScreen.CHAT,
                onClick = { onSelectScreen(AppScreen.CHAT) }
            )

            ScreenTabItem(
                label = "Terminal",
                icon = Icons.Default.Terminal,
                isSelected = activeScreen == AppScreen.TERMINAL,
                onClick = { onSelectScreen(AppScreen.TERMINAL) }
            )

            ScreenTabItem(
                label = "Files",
                icon = Icons.Default.Folder,
                isSelected = activeScreen == AppScreen.FILES,
                onClick = { onSelectScreen(AppScreen.FILES) }
            )

            ScreenTabItem(
                label = "Packages",
                icon = Icons.Default.Extension,
                isSelected = activeScreen == AppScreen.PACKAGES,
                onClick = { onSelectScreen(AppScreen.PACKAGES) }
            )

            ScreenTabItem(
                label = "Orchestrator",
                icon = Icons.Default.AccountTree,
                isSelected = activeScreen == AppScreen.ORCHESTRATOR,
                onClick = { onSelectScreen(AppScreen.ORCHESTRATOR) }
            )

            ScreenTabItem(
                label = "BYOK",
                icon = Icons.Default.VpnKey,
                isSelected = activeScreen == AppScreen.BYOK,
                onClick = { onSelectScreen(AppScreen.BYOK) }
            )

            IconButton(
                onClick = onToggleSplitView,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = if (isSplitView) Icons.Default.ViewAgenda else Icons.Default.Splitscreen,
                    contentDescription = "Toggle Split Window",
                    tint = if (isSplitView) NeonEmerald else TextSecondary
                )
            }
        }
    }
}

@Composable
private fun ScreenTabItem(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    FilledTonalButton(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = if (isSelected) NeonCyan.copy(alpha = 0.15f) else Color.Transparent,
            contentColor = if (isSelected) NeonCyan else TextSecondary
        ),
        modifier = Modifier.height(34.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
        )
    }
}
