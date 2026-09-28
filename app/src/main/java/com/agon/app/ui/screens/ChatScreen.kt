package com.agon.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.agon.app.model.ChatMessage
import com.agon.app.model.MessageRole
import com.agon.app.ui.components.AiSuggestBar
import com.agon.app.ui.components.SpeechRecognizerManager
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.AppScreen
import com.agon.app.viewmodel.WorkspaceViewModel
import kotlinx.coroutines.launch

@Composable
fun ChatScreen(
    viewModel: WorkspaceViewModel,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    var isListeningSpeech by remember { mutableStateOf(false) }

    // Speech Recognizer setup
    val speechManager = remember {
        SpeechRecognizerManager(
            context = context,
            onResult = { text -> viewModel.appendMicTranscription(text) },
            onListeningStateChanged = { listening -> isListeningSpeech = listening }
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            speechManager.startListening()
        }
    }

    // Auto-scroll on new message
    LaunchedEffect(viewModel.chatMessages.size) {
        if (viewModel.chatMessages.isNotEmpty()) {
            listState.animateScrollToItem(viewModel.chatMessages.size - 1)
        }
    }

    // Container with imePadding to guarantee input is ALWAYS above the keyboard
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(TechDarkBackground)
            .imePadding()
    ) {
        // Top Routing Info Bar
        ChatHeaderBar(viewModel)

        // Chat Messages Stream
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            items(viewModel.chatMessages, key = { it.id }) { message ->
                ChatMessageItem(message = message, onRunCodeInTerminal = { code ->
                    viewModel.executeTerminalCommand(code)
                    viewModel.activeScreen = AppScreen.TERMINAL
                })
            }
        }

        // Live status progress note (e.g. fallback cascade, connecting)
        if (viewModel.chatStatusNote.isNotEmpty()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = TechDarkSurfaceVariant
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(12.dp),
                        strokeWidth = 2.dp,
                        color = NeonCyan
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = viewModel.chatStatusNote,
                        fontSize = 11.sp,
                        color = NeonCyan,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        // Attached Files Preview List
        if (viewModel.attachedFiles.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(TechDarkSurface)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                viewModel.attachedFiles.forEach { file ->
                    InputChip(
                        selected = true,
                        onClick = { viewModel.removeChatAttachment(file.id) },
                        label = { Text(file.fileName, fontSize = 11.sp, fontFamily = FontFamily.Monospace) },
                        trailingIcon = {
                            Icon(Icons.Default.Close, contentDescription = "Remove", modifier = Modifier.size(12.dp))
                        },
                        colors = InputChipDefaults.inputChipColors(
                            selectedContainerColor = TechDarkSurfaceVariant,
                            selectedLabelColor = NeonCyan
                        )
                    )
                }
            }
        }

        // Inline Ai✨Suggest scanning chat draft
        AiSuggestBar(
            suggestions = viewModel.currentSuggestions,
            onSelectSuggestion = { item -> viewModel.applySuggestion(item, isTerminal = false) }
        )

        // User Input Bar strictly positioned
        ChatInputRow(
            text = viewModel.chatInputText,
            onTextChange = { viewModel.onUserInputChange(it, isTerminal = false) },
            onSend = { viewModel.sendChatMessage() },
            isGenerating = viewModel.isChatGenerating,
            isListening = isListeningSpeech,
            onMicClick = {
                if (isListeningSpeech) {
                    speechManager.stopListening()
                } else {
                    val hasPerm = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    if (hasPerm) {
                        speechManager.startListening()
                    } else {
                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                }
            },
            onAttachFileClick = {
                // Attach a file from the workspace
                viewModel.activeScreen = AppScreen.FILES
            }
        )
    }
}

@Composable
private fun ChatHeaderBar(viewModel: WorkspaceViewModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = TechDarkSurface,
        tonalElevation = 4.dp,
        border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = NeonCyan.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = viewModel.orchestratorProfile.routingMode.label,
                        color = NeonCyan,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                val activeProvider = viewModel.aiProviders.firstOrNull { it.isEnabled }
                Text(
                    text = activeProvider?.selectedModel ?: "No Model Active",
                    fontSize = 11.sp,
                    color = TextSecondary,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 1
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(
                    onClick = { viewModel.activeScreen = AppScreen.BYOK },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.VpnKey,
                        contentDescription = "BYOK Settings",
                        tint = NeonAmber,
                        modifier = Modifier.size(16.dp)
                    )
                }
                IconButton(
                    onClick = { viewModel.chatMessages.clear() },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.DeleteSweep,
                        contentDescription = "Clear Chat",
                        tint = TextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun ChatMessageItem(
    message: ChatMessage,
    onRunCodeInTerminal: (String) -> Unit
) {
    val isUser = message.role == MessageRole.USER
    val clipboard = LocalClipboardManager.current

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 12.dp,
                topEnd = 12.dp,
                bottomStart = if (isUser) 12.dp else 2.dp,
                bottomEnd = if (isUser) 2.dp else 12.dp
            ),
            color = if (isUser) TechDarkSurfaceVariant else TechDarkSurface,
            border = ButtonDefaults.outlinedButtonBorder.copy(
                brush = androidx.compose.ui.graphics.SolidColor(if (isUser) NeonCyan.copy(alpha = 0.3f) else TechDarkBorder)
            ),
            modifier = Modifier.widthIn(max = 340.dp)
        ) {
            Column(modifier = Modifier.padding(10.dp)) {
                // Header of message
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUser) "You" else "NexusDev Assistant",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isUser) NeonCyan else NeonEmerald
                    )

                    IconButton(
                        onClick = { clipboard.setText(AnnotatedString(message.content)) },
                        modifier = Modifier.size(20.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "Copy",
                            tint = TextMuted,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Check for code blocks in content
                if (message.content.contains("```")) {
                    RenderFormattedContent(message.content, onRunCodeInTerminal)
                } else {
                    Text(
                        text = message.content,
                        fontSize = 13.sp,
                        color = TextPrimary,
                        lineHeight = 18.sp
                    )
                }

                if (message.executionTimeMs != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${message.executionTimeMs} ms",
                        fontSize = 9.sp,
                        color = TextMuted,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

@Composable
private fun RenderFormattedContent(
    content: String,
    onRunCodeInTerminal: (String) -> Unit
) {
    val parts = content.split("```")
    val clipboard = LocalClipboardManager.current

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        for (i in parts.indices) {
            val part = parts[i]
            if (i % 2 == 1) {
                // Code block
                val lines = part.trim().lines()
                val lang = lines.firstOrNull()?.trim() ?: "sh"
                val code = if (lines.size > 1) lines.drop(1).joinToString("\n") else part.trim()

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = TerminalBlack
                ) {
                    Column(modifier = Modifier.padding(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = lang.uppercase(),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = NeonCyan,
                                fontFamily = FontFamily.Monospace
                            )
                            Row {
                                IconButton(
                                    onClick = { onRunCodeInTerminal(code) },
                                    modifier = Modifier.size(22.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = "Run in Terminal",
                                        tint = NeonEmerald,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                                IconButton(
                                    onClick = { clipboard.setText(AnnotatedString(code)) },
                                    modifier = Modifier.size(22.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ContentCopy,
                                        contentDescription = "Copy Code",
                                        tint = TextMuted,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                        Text(
                            text = code,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = TerminalGreen
                        )
                    }
                }
            } else {
                if (part.isNotBlank()) {
                    Text(
                        text = part.trim(),
                        fontSize = 13.sp,
                        color = TextPrimary,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun ChatInputRow(
    text: String,
    onTextChange: (String) -> Unit,
    onSend: () -> Unit,
    isGenerating: Boolean,
    isListening: Boolean,
    onMicClick: () -> Unit,
    onAttachFileClick: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = TechDarkSurface,
        tonalElevation = 8.dp,
        border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onAttachFileClick,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AttachFile,
                    contentDescription = "Attach File",
                    tint = NeonCyan
                )
            }

            IconButton(
                onClick = onMicClick,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = if (isListening) Icons.Default.MicOff else Icons.Default.Mic,
                    contentDescription = "Speech to Text",
                    tint = if (isListening) NeonRose else TextSecondary
                )
            }

            TextField(
                value = text,
                onValueChange = onTextChange,
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 40.dp, max = 110.dp),
                placeholder = { Text("Ask coding assistant...", fontSize = 12.sp, color = TextMuted) },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = TechDarkSurfaceVariant,
                    unfocusedContainerColor = TechDarkSurfaceVariant,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(10.dp),
                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp)
            )

            Spacer(modifier = Modifier.width(6.dp))

            IconButton(
                onClick = onSend,
                enabled = text.isNotBlank() && !isGenerating,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(if (text.isNotBlank() && !isGenerating) NeonCyan else TechDarkSurfaceVariant)
            ) {
                if (isGenerating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = Color.Black
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (text.isNotBlank()) Color.Black else TextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
