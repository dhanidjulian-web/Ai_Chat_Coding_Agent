package com.agon.app.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
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
import com.agon.app.model.FileItem
import com.agon.app.ui.components.CodeEditorDialog
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.WorkspaceViewModel
import java.io.File

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FileManagerScreen(
    viewModel: WorkspaceViewModel,
    modifier: Modifier = Modifier
) {
    var showNewFileDialog by remember { mutableStateOf(false) }
    var showNewFolderDialog by remember { mutableStateOf(false) }
    var showRenameDialog by remember { mutableStateOf<File?>(null) }
    var showZipDialog by remember { mutableStateOf(false) }

    var dialogInputText by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(TechDarkBackground)
    ) {
        // Path navigation bar
        FileManagerHeaderBar(
            currentDir = viewModel.currentBrowseDirectory,
            onNavigateUp = { viewModel.navigateUpDirectory() },
            onRefresh = { viewModel.refreshDirectoryFiles() }
        )

        // Operations action bar
        FileManagerActionToolbar(
            selectedCount = viewModel.selectedFiles.size,
            onNewFile = {
                dialogInputText = "script.sh"
                showNewFileDialog = true
            },
            onNewFolder = {
                dialogInputText = "new_project"
                showNewFolderDialog = true
            },
            onSelectAll = { viewModel.selectAllFiles() },
            onClearSelection = { viewModel.clearFileSelection() },
            onDeleteSelected = { viewModel.deleteSelectedFiles() },
            onCopy = { viewModel.copySelected() },
            onCut = { viewModel.cutSelected() },
            onPaste = { viewModel.pasteClipboard() },
            onZip = {
                dialogInputText = "archive.zip"
                showZipDialog = true
            },
            clipboardHasItems = viewModel.clipboardItem != null
        )

        // File List
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            contentPadding = PaddingValues(top = 6.dp, bottom = 80.dp)
        ) {
            items(viewModel.directoryFiles, key = { it.path }) { item ->
                val isSelected = viewModel.selectedFiles.contains(item.file)

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .combinedClickable(
                            onClick = {
                                if (item.isDirectory) {
                                    viewModel.navigateToDirectory(item.file)
                                } else {
                                    viewModel.openFileInEditor(item.file)
                                }
                            },
                            onLongClick = {
                                viewModel.toggleFileSelection(item.file)
                            }
                        ),
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) NeonCyan.copy(alpha = 0.15f) else TechDarkSurface,
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(if (isSelected) NeonCyan else TechDarkBorder)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = when {
                                    item.isDirectory -> Icons.Default.Folder
                                    item.extension in listOf("sh", "bash", "py", "js", "c", "cpp") -> Icons.Default.Code
                                    item.extension in listOf("zip", "tar", "gz") -> Icons.Default.Archive
                                    else -> Icons.Default.InsertDriveFile
                                },
                                contentDescription = null,
                                tint = if (item.isDirectory) NeonAmber else NeonCyan,
                                modifier = Modifier.size(20.dp)
                            )

                            Spacer(modifier = Modifier.width(10.dp))

                            Column {
                                Text(
                                    text = item.name,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextPrimary,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    text = if (item.isDirectory) "Directory" else "${item.size} bytes",
                                    fontSize = 10.sp,
                                    color = TextMuted,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // Bookmark toggle
                            IconButton(
                                onClick = { viewModel.toggleBookmark(item.path) },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = if (item.isBookmarked) Icons.Default.Star else Icons.Default.StarBorder,
                                    contentDescription = "Bookmark",
                                    tint = if (item.isBookmarked) NeonAmber else TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }

                            // Run / Unzip / Context menu
                            if (!item.isDirectory) {
                                if (item.extension == "zip") {
                                    IconButton(
                                        onClick = { viewModel.unzipFile(item.file) },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Unarchive,
                                            contentDescription = "Unzip",
                                            tint = NeonCyan,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                } else {
                                    IconButton(
                                        onClick = { viewModel.runFileInTerminal(item.file) },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.PlayArrow,
                                            contentDescription = "Run",
                                            tint = NeonEmerald,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }

                            IconButton(
                                onClick = {
                                    dialogInputText = item.name
                                    showRenameDialog = item.file
                                },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Rename",
                                    tint = TextSecondary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Built-in Code Editor Dialog
    if (viewModel.isEditorOpen && viewModel.activeEditingFile != null) {
        CodeEditorDialog(
            file = viewModel.activeEditingFile!!,
            content = viewModel.activeEditorContent,
            onContentChange = { viewModel.activeEditorContent = it },
            onSave = { viewModel.saveEditorContent() },
            onRunInTerminal = { viewModel.runFileInTerminal(viewModel.activeEditingFile!!) },
            onDismiss = { viewModel.isEditorOpen = false }
        )
    }

    // New File Dialog
    if (showNewFileDialog) {
        InputDialog(
            title = "New File",
            value = dialogInputText,
            onValueChange = { dialogInputText = it },
            onConfirm = {
                viewModel.createNewFile(dialogInputText)
                showNewFileDialog = false
            },
            onDismiss = { showNewFileDialog = false }
        )
    }

    // New Folder Dialog
    if (showNewFolderDialog) {
        InputDialog(
            title = "New Directory",
            value = dialogInputText,
            onValueChange = { dialogInputText = it },
            onConfirm = {
                viewModel.createNewFolder(dialogInputText)
                showNewFolderDialog = false
            },
            onDismiss = { showNewFolderDialog = false }
        )
    }

    // Rename Dialog
    showRenameDialog?.let { targetFile ->
        InputDialog(
            title = "Rename File",
            value = dialogInputText,
            onValueChange = { dialogInputText = it },
            onConfirm = {
                viewModel.renameFile(targetFile, dialogInputText)
                showRenameDialog = null
            },
            onDismiss = { showRenameDialog = null }
        )
    }

    // Zip Dialog
    if (showZipDialog) {
        InputDialog(
            title = "Archive Name (zip)",
            value = dialogInputText,
            onValueChange = { dialogInputText = it },
            onConfirm = {
                viewModel.zipSelectedFiles(dialogInputText)
                showZipDialog = false
            },
            onDismiss = { showZipDialog = false }
        )
    }
}

@Composable
private fun FileManagerHeaderBar(
    currentDir: File,
    onNavigateUp: () -> Unit,
    onRefresh: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = TechDarkSurface,
        tonalElevation = 4.dp,
        border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                IconButton(onClick = onNavigateUp, modifier = Modifier.size(30.dp)) {
                    Icon(Icons.Default.ArrowUpward, contentDescription = "Parent Directory", tint = NeonCyan)
                }

                Spacer(modifier = Modifier.width(4.dp))

                Text(
                    text = currentDir.absolutePath,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    color = TextPrimary,
                    maxLines = 1
                )
            }

            IconButton(onClick = onRefresh, modifier = Modifier.size(30.dp)) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = TextSecondary)
            }
        }
    }
}

@Composable
private fun FileManagerActionToolbar(
    selectedCount: Int,
    onNewFile: () -> Unit,
    onNewFolder: () -> Unit,
    onSelectAll: () -> Unit,
    onClearSelection: () -> Unit,
    onDeleteSelected: () -> Unit,
    onCopy: () -> Unit,
    onCut: () -> Unit,
    onPaste: () -> Unit,
    onZip: () -> Unit,
    clipboardHasItems: Boolean
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = TechDarkSurfaceVariant
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                FilledTonalButton(
                    onClick = onNewFile,
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    modifier = Modifier.height(28.dp)
                ) {
                    Text("+ File", fontSize = 10.sp, color = NeonCyan)
                }

                FilledTonalButton(
                    onClick = onNewFolder,
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    modifier = Modifier.height(28.dp)
                ) {
                    Text("+ Dir", fontSize = 10.sp, color = NeonAmber)
                }

                if (clipboardHasItems) {
                    FilledTonalButton(
                        onClick = onPaste,
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Text("Paste", fontSize = 10.sp, color = NeonEmerald)
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (selectedCount > 0) {
                    IconButton(onClick = onCopy, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy", tint = TextPrimary, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onCut, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.ContentCut, contentDescription = "Cut", tint = TextPrimary, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onZip, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Archive, contentDescription = "Zip", tint = NeonCyan, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onDeleteSelected, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = NeonRose, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onClearSelection, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Deselect", tint = TextMuted, modifier = Modifier.size(16.dp))
                    }
                } else {
                    IconButton(onClick = onSelectAll, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.SelectAll, contentDescription = "Select All", tint = TextSecondary, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun InputDialog(
    title: String,
    value: String,
    onValueChange: (String) -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, color = NeonCyan, fontSize = 14.sp, fontWeight = FontWeight.Bold) },
        text = {
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 13.sp)
            )
        },
        confirmButton = {
            Button(onClick = onConfirm, colors = ButtonDefaults.buttonColors(containerColor = NeonCyan)) {
                Text("Confirm", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        },
        containerColor = TechDarkSurface
    )
}
