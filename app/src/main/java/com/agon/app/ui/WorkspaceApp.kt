package com.agon.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.ui.components.WindowToggleBar
import com.agon.app.ui.screens.*
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.AppScreen
import com.agon.app.viewmodel.WorkspaceViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceApp(viewModel: WorkspaceViewModel) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = TechDarkSurface,
                drawerContentColor = TextPrimary,
                modifier = Modifier.width(300.dp)
            ) {
                // Sidebar Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(TechDarkSurfaceVariant)
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(Brush.linearGradient(listOf(NeonCyan, NeonViolet))),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("DE", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 16.sp)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(viewModel.userName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                            Text(viewModel.userEmail, fontSize = 10.sp, color = TextSecondary, fontFamily = FontFamily.Monospace)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = NeonEmerald.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = "ACTIVE ARCH: ${viewModel.sandboxStatus.detectedArch}",
                            fontSize = 9.sp,
                            color = NeonEmerald,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                HorizontalDivider(color = TechDarkBorder)

                // Navigation items
                NavigationDrawerItem(
                    label = { Text("Dashboard Telemetry") },
                    icon = { Icon(Icons.Default.Dashboard, contentDescription = null, tint = NeonCyan) },
                    selected = viewModel.activeScreen == AppScreen.DASHBOARD,
                    onClick = {
                        viewModel.activeScreen = AppScreen.DASHBOARD
                        coroutineScope.launch { drawerState.close() }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                        unselectedContainerColor = Color.Transparent
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    label = { Text("AI Chat Assistant") },
                    icon = { Icon(Icons.Default.Chat, contentDescription = null, tint = NeonCyan) },
                    selected = viewModel.activeScreen == AppScreen.CHAT,
                    onClick = {
                        viewModel.activeScreen = AppScreen.CHAT
                        coroutineScope.launch { drawerState.close() }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                        unselectedContainerColor = Color.Transparent
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    label = { Text("Termux Shell Terminal") },
                    icon = { Icon(Icons.Default.Terminal, contentDescription = null, tint = TerminalGreen) },
                    selected = viewModel.activeScreen == AppScreen.TERMINAL,
                    onClick = {
                        viewModel.activeScreen = AppScreen.TERMINAL
                        coroutineScope.launch { drawerState.close() }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                        unselectedContainerColor = Color.Transparent
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    label = { Text("File Manager (Local & Rootfs)") },
                    icon = { Icon(Icons.Default.Folder, contentDescription = null, tint = NeonAmber) },
                    selected = viewModel.activeScreen == AppScreen.FILES,
                    onClick = {
                        viewModel.activeScreen = AppScreen.FILES
                        coroutineScope.launch { drawerState.close() }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                        unselectedContainerColor = Color.Transparent
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    label = { Text("Sandbox Distros & Packages") },
                    icon = { Icon(Icons.Default.Extension, contentDescription = null, tint = NeonViolet) },
                    selected = viewModel.activeScreen == AppScreen.PACKAGES,
                    onClick = {
                        viewModel.activeScreen = AppScreen.PACKAGES
                        coroutineScope.launch { drawerState.close() }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                        unselectedContainerColor = Color.Transparent
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    label = { Text("Orchestrator & Swarm (35)") },
                    icon = { Icon(Icons.Default.AccountTree, contentDescription = null, tint = NeonCyan) },
                    selected = viewModel.activeScreen == AppScreen.ORCHESTRATOR,
                    onClick = {
                        viewModel.activeScreen = AppScreen.ORCHESTRATOR
                        coroutineScope.launch { drawerState.close() }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                        unselectedContainerColor = Color.Transparent
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    label = { Text("BYOK Multi-Provider & Fallback") },
                    icon = { Icon(Icons.Default.VpnKey, contentDescription = null, tint = NeonAmber) },
                    selected = viewModel.activeScreen == AppScreen.BYOK,
                    onClick = {
                        viewModel.activeScreen = AppScreen.BYOK
                        coroutineScope.launch { drawerState.close() }
                    },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                        unselectedContainerColor = Color.Transparent
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )

                Spacer(modifier = Modifier.weight(1f))

                // Quick Distro Footer in Drawer
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = TerminalBlack
                ) {
                    Column(modifier = Modifier.padding(8.dp)) {
                        Text("Current Rootfs:", fontSize = 10.sp, color = TextMuted)
                        Text(
                            "${viewModel.activeDistro.distroName} (${viewModel.activeDistro.version})",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = NeonEmerald
                        )
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "NexusDev",
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = NeonCyan
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = TechDarkSurfaceVariant
                            ) {
                                Text(
                                    text = viewModel.activeScreen.label.uppercase(),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = { coroutineScope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu", tint = NeonCyan)
                        }
                    },
                    actions = {
                        // Toggle Split Window
                        IconButton(onClick = { viewModel.isSplitViewActive = !viewModel.isSplitViewActive }) {
                            Icon(
                                imageVector = if (viewModel.isSplitViewActive) Icons.Default.ViewAgenda else Icons.Default.Splitscreen,
                                contentDescription = "Split View",
                                tint = if (viewModel.isSplitViewActive) NeonEmerald else TextSecondary
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = TechDarkSurface,
                        titleContentColor = TextPrimary
                    )
                )
            },
            bottomBar = {
                WindowToggleBar(
                    activeScreen = viewModel.activeScreen,
                    onSelectScreen = { viewModel.activeScreen = it },
                    isSplitView = viewModel.isSplitViewActive,
                    onToggleSplitView = { viewModel.isSplitViewActive = !viewModel.isSplitViewActive },
                    isSidebarOpen = drawerState.isOpen,
                    onToggleSidebar = {
                        coroutineScope.launch {
                            if (drawerState.isOpen) drawerState.close() else drawerState.open()
                        }
                    }
                )
            },
            containerColor = TechDarkBackground
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                if (viewModel.isSplitViewActive) {
                    // Split Window Mode: Primary Screen on Top Half, Terminal on Bottom Half
                    Column(modifier = Modifier.fillMaxSize()) {
                        Box(modifier = Modifier.weight(1f)) {
                            when (viewModel.activeScreen) {
                                AppScreen.DASHBOARD -> DashboardScreen(viewModel)
                                AppScreen.CHAT -> ChatScreen(viewModel)
                                AppScreen.TERMINAL -> TerminalScreen(viewModel)
                                AppScreen.FILES -> FileManagerScreen(viewModel)
                                AppScreen.PACKAGES -> SandboxPackageManagerScreen(viewModel)
                                AppScreen.ORCHESTRATOR -> OrchestratorScreen(viewModel)
                                AppScreen.BYOK -> ByokSettingsScreen(viewModel)
                            }
                        }
                        HorizontalDivider(thickness = 2.dp, color = NeonCyan.copy(alpha = 0.5f))
                        Box(modifier = Modifier.weight(1f)) {
                            TerminalScreen(viewModel)
                        }
                    }
                } else {
                    // Single Window Mode
                    when (viewModel.activeScreen) {
                        AppScreen.DASHBOARD -> DashboardScreen(viewModel)
                        AppScreen.CHAT -> ChatScreen(viewModel)
                        AppScreen.TERMINAL -> TerminalScreen(viewModel)
                        AppScreen.FILES -> FileManagerScreen(viewModel)
                        AppScreen.PACKAGES -> SandboxPackageManagerScreen(viewModel)
                        AppScreen.ORCHESTRATOR -> OrchestratorScreen(viewModel)
                        AppScreen.BYOK -> ByokSettingsScreen(viewModel)
                    }
                }
            }
        }
    }
}
