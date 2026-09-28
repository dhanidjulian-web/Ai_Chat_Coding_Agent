package com.agon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.model.AiProviderConfig
import com.agon.app.model.FallbackModelEntry
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.WorkspaceViewModel

@Composable
fun ByokSettingsScreen(
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
        item {
            Text(
                text = "BYOK (BRING YOUR OWN KEY) ENGINE",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = NeonCyan,
                letterSpacing = 1.sp
            )
            Text(
                text = "Configure custom endpoints, API keys, and test live HTTP connectivity directly from your device.",
                fontSize = 10.sp,
                color = TextSecondary
            )
        }

        // List of AI Providers
        itemsIndexed(viewModel.aiProviders, key = { _, it -> it.id }) { _, provider ->
            ProviderConfigCard(
                provider = provider,
                onUpdate = { updated -> viewModel.updateProvider(updated) },
                onTestValidation = { viewModel.testProviderValidation(provider.id) },
                onRefreshModels = { viewModel.refreshProviderModels(provider.id) }
            )
        }

        // Fallback Chain Header & List (Max 15)
        item {
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
                        Column {
                            Text(
                                text = "FALLBACK CASCADE ORDER (MAX 15)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = NeonViolet,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "${viewModel.fallbackChain.size} Models in Cascade",
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        viewModel.fallbackChain.forEachIndexed { index, entry ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(6.dp),
                                color = TechDarkSurfaceVariant
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "#${entry.priority}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = NeonAmber,
                                            fontFamily = FontFamily.Monospace
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                text = entry.modelId,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = TextPrimary,
                                                fontFamily = FontFamily.Monospace
                                            )
                                            Text(
                                                text = entry.providerName,
                                                fontSize = 9.sp,
                                                color = TextMuted
                                            )
                                        }
                                    }

                                    Row {
                                        IconButton(
                                            onClick = {
                                                if (index > 0) viewModel.reorderFallbackChain(index, index - 1)
                                            },
                                            enabled = index > 0,
                                            modifier = Modifier.size(24.dp)
                                        ) {
                                            Icon(Icons.Default.ArrowUpward, contentDescription = "Up", tint = if (index > 0) NeonCyan else TextMuted, modifier = Modifier.size(14.dp))
                                        }
                                        IconButton(
                                            onClick = {
                                                if (index < viewModel.fallbackChain.size - 1) viewModel.reorderFallbackChain(index, index + 1)
                                            },
                                            enabled = index < viewModel.fallbackChain.size - 1,
                                            modifier = Modifier.size(24.dp)
                                        ) {
                                            Icon(Icons.Default.ArrowDownward, contentDescription = "Down", tint = if (index < viewModel.fallbackChain.size - 1) NeonCyan else TextMuted, modifier = Modifier.size(14.dp))
                                        }
                                        IconButton(
                                            onClick = { viewModel.removeFallbackEntry(entry.id) },
                                            modifier = Modifier.size(24.dp)
                                        ) {
                                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = NeonRose, modifier = Modifier.size(14.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProviderConfigCard(
    provider: AiProviderConfig,
    onUpdate: (AiProviderConfig) -> Unit,
    onTestValidation: () -> Unit,
    onRefreshModels: () -> Unit
) {
    var showApiKey by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(if (provider.isEnabled) NeonCyan.copy(alpha = 0.5f) else TechDarkBorder)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = provider.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (provider.isEnabled) NeonCyan else TextPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = TechDarkSurfaceVariant
                    ) {
                        Text(
                            text = provider.type.name,
                            fontSize = 9.sp,
                            color = NeonViolet,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Switch(
                    checked = provider.isEnabled,
                    onCheckedChange = { onUpdate(provider.copy(isEnabled = it)) },
                    colors = SwitchDefaults.colors(checkedThumbColor = NeonCyan)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Base URL Input
            OutlinedTextField(
                value = provider.baseUrl,
                onValueChange = { onUpdate(provider.copy(baseUrl = it)) },
                label = { Text("Base URL / Endpoint", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NeonCyan,
                    unfocusedBorderColor = TechDarkBorder
                )
            )

            Spacer(modifier = Modifier.height(6.dp))

            // API Key Input
            OutlinedTextField(
                value = provider.apiKey,
                onValueChange = { onUpdate(provider.copy(apiKey = it)) },
                label = { Text("API Key", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = if (showApiKey) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { showApiKey = !showApiKey }) {
                        Icon(
                            imageVector = if (showApiKey) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = "Toggle Key",
                            tint = TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                },
                textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NeonCyan,
                    unfocusedBorderColor = TechDarkBorder
                )
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Model Selection
            OutlinedTextField(
                value = provider.selectedModel,
                onValueChange = { onUpdate(provider.copy(selectedModel = it)) },
                label = { Text("Selected Model ID", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NeonCyan,
                    unfocusedBorderColor = TechDarkBorder
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Action Buttons: Test Validation & Refresh Index
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilledTonalButton(
                    onClick = onTestValidation,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = TechDarkSurfaceVariant),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.NetworkCheck, contentDescription = null, tint = NeonCyan, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Test Ping", fontSize = 11.sp, color = NeonCyan)
                }

                FilledTonalButton(
                    onClick = onRefreshModels,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = TechDarkSurfaceVariant),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Sync, contentDescription = null, tint = NeonEmerald, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Refresh Models", fontSize = 11.sp, color = NeonEmerald)
                }
            }

            if (provider.lastValidationStatus != "Not Tested") {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = TerminalBlack
                ) {
                    Text(
                        text = provider.lastValidationStatus,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = if (provider.lastValidationStatus.contains("OK")) TerminalGreen else TerminalRed,
                        modifier = Modifier.padding(6.dp)
                    )
                }
            }
        }
    }
}
