package com.agon.app.model

import java.io.File

data class FileItem(
    val file: File,
    val name: String = file.name,
    val path: String = file.absolutePath,
    val isDirectory: Boolean = file.isDirectory,
    val size: Long = if (file.isFile) file.length() else 0L,
    val lastModified: Long = file.lastModified(),
    val isBookmarked: Boolean = false,
    val extension: String = file.extension.lowercase()
)

enum class ClipboardAction {
    COPY, CUT
}

data class ClipboardItem(
    val action: ClipboardAction,
    val files: List<File>
)
