package com.agon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import com.agon.app.model.LineType
import com.agon.app.model.TerminalOutputLine
import com.agon.app.ui.components.AiSuggestBar
import com.agon.app.ui.components.TerminalKeyboardBar
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.WorkspaceViewModel

@Composable
fun TerminalScreen(
    viewModel: WorkspaceViewModel,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    // Auto-scroll terminal on new line output
    LaunchedEffect(viewModel.terminalOutput.size) {
        if (viewModel.terminalOutput.isNotEmpty()) {
            listState.animateScrollToItem(viewModel.terminalOutput.size - 1)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(TerminalBlack)
            .imePadding()
    ) {
        // Top Working Directory Bar & Controls
        TerminalHeaderBar(viewModel)

        // Terminal Output Console
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            contentPadding = PaddingValues(vertical = 4.dp)
        ) {
            items(viewModel.terminalOutput, key = { it.id }) { line ->
                TerminalLineItem(line)
            }
        }

        // Inline Ai✨Suggest scanning command input
        AiSuggestBar(
            suggestions = viewModel.currentSuggestions,
            onSelectSuggestion = { item -> viewModel.applySuggestion(item, isTerminal = true) }
        )

        // Developer Accessory Keyboard Bar (ESC, TAB, CTRL, ALT, PIPE, SLASH, etc.)
        TerminalKeyboardBar(
            onKeyPress = { key ->
                if (key == "CTRL" || key == "ALT") {
                    // modifier placeholder
                } else {
                    viewModel.terminalInputText += key
                }
            },
            onHistoryUp = { viewModel.navigateCommandHistory(up = true) },
            onHistoryDown = { viewModel.navigateCommandHistory(up = false) },
            onTabPress = { viewModel.terminalInputText += "\t" }
        )

        // Terminal Command Input Field firmly locked above virtual keyboard
        TerminalInputRow(
            text = viewModel.terminalInputText,
            onTextChange = { viewModel.onUserInputChange(it, isTerminal = true) },
            onSubmit = { viewModel.executeTerminalCommand() },
            isRunning = viewModel.isTerminalRunning,
            onKill = { viewModel.killTerminalProcess() }
        )
    }
}

@Composable
private fun TerminalHeaderBar(viewModel: WorkspaceViewModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = TechDarkSurface,
        tonalElevation = 4.dp,
        border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(if (viewModel.isTerminalRunning) NeonEmerald else NeonAmber, RoundedCornerShape(4.dp))
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = viewModel.terminalWorkingDir,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    color = TextSecondary,
                    maxLines = 1
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (viewModel.isTerminalRunning) {
                    FilledTonalButton(
                        onClick = { viewModel.killTerminalProcess() },
                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = NeonRose.copy(alpha = 0.2f)),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Text("KILL", color = NeonRose, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }

                IconButton(
                    onClick = { viewModel.clearTerminal() },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.DeleteSweep,
                        contentDescription = "Clear",
                        tint = TextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun TerminalLineItem(line: TerminalOutputLine) {
    val color = when (line.type) {
        LineType.COMMAND -> NeonCyan
        LineType.STDOUT -> TerminalGreen
        LineType.STDERR -> TerminalRed
        LineType.SYSTEM_INFO -> TerminalYellow
        LineType.SUCCESS -> NeonEmerald
        LineType.ERROR -> NeonRose
    }

    Text(
        text = line.text,
        color = color,
        fontSize = 12.sp,
        fontFamily = FontFamily.Monospace,
        lineHeight = 16.sp,
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun TerminalInputRow(
    text: String,
    onTextChange: (String) -> Unit,
    onSubmit: () -> Unit,
    isRunning: Boolean,
    onKill: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = TechDarkSurface,
        tonalElevation = 6.dp,
        border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$",
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Black,
                color = NeonCyan,
                fontSize = 14.sp,
                modifier = Modifier.padding(horizontal = 4.dp)
            )

            TextField(
                value = text,
                onValueChange = onTextChange,
                modifier = Modifier.weight(1f),
                placeholder = {
                    Text(
                        "sh command (e.g. ls -la, python3, proot)...",
                        fontSize = 12.sp,
                        color = TextMuted,
                        fontFamily = FontFamily.Monospace
                    )
                },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = TerminalBlack,
                    unfocusedContainerColor = TerminalBlack,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(8.dp),
                textStyle = androidx.compose.ui.text.TextStyle(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 13.sp
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.width(6.dp))

            IconButton(
                onClick = onSubmit,
                modifier = Modifier
                    .size(36.dp)
                    .background(NeonCyan, RoundedCornerShape(8.dp))
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Execute",
                    tint = Color.Black,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
