package com.agon.app.service

import android.content.Context
import com.agon.app.model.ClipboardAction
import com.agon.app.model.ClipboardItem
import com.agon.app.model.FileItem
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

class FileManagerService(private val context: Context) {

    val sandboxRootDir: File
        get() = File(context.filesDir, "sandbox").apply { if (!exists()) mkdirs() }

    val workspaceDir: File
        get() = File(sandboxRootDir, "workspace").apply { if (!exists()) mkdirs() }

    fun listFiles(directory: File, bookmarkedPaths: Set<String> = emptySet()): List<FileItem> {
        val files = directory.listFiles() ?: return emptyList()
        return files.map { file ->
            FileItem(
                file = file,
                isBookmarked = bookmarkedPaths.contains(file.absolutePath)
            )
        }.sortedWith(compareBy({ !it.isDirectory }, { it.name.lowercase() }))
    }

    fun createFile(parentDir: File, fileName: String, initialContent: String = ""): Result<File> {
        return runCatching {
            val target = File(parentDir, fileName)
            if (target.exists()) {
                throw IllegalStateException("File already exists: $fileName")
            }
            target.parentFile?.mkdirs()
            target.writeText(initialContent, Charsets.UTF_8)
            target
        }
    }

    fun createDirectory(parentDir: File, folderName: String): Result<File> {
        return runCatching {
            val target = File(parentDir, folderName)
            if (target.exists()) {
                throw IllegalStateException("Directory already exists: $folderName")
            }
            if (!target.mkdirs()) {
                throw IllegalStateException("Failed to create directory: $folderName")
            }
            target
        }
    }

    fun renameFile(source: File, newName: String): Result<File> {
        return runCatching {
            val destination = File(source.parentFile, newName)
            if (destination.exists()) {
                throw IllegalStateException("A file with name $newName already exists")
            }
            if (!source.renameTo(destination)) {
                throw IllegalStateException("Failed to rename ${source.name} to $newName")
            }
            destination
        }
    }

    fun deleteFile(file: File): Result<Boolean> {
        return runCatching {
            if (file.isDirectory) {
                file.deleteRecursively()
            } else {
                file.delete()
            }
        }
    }

    fun readFileContent(file: File): Result<String> {
        return runCatching {
            file.readText(Charsets.UTF_8)
        }
    }

    fun saveFileContent(file: File, content: String): Result<Unit> {
        return runCatching {
            file.writeText(content, Charsets.UTF_8)
        }
    }

    fun pasteClipboard(clipboard: ClipboardItem, destinationDir: File): Result<List<File>> {
        return runCatching {
            val results = mutableListOf<File>()
            for (source in clipboard.files) {
                val target = File(destinationDir, source.name)
                when (clipboard.action) {
                    ClipboardAction.COPY -> {
                        if (source.isDirectory) {
                            source.copyRecursively(target, overwrite = true)
                        } else {
                            source.copyTo(target, overwrite = true)
                        }
                    }
                    ClipboardAction.CUT -> {
                        if (source.isDirectory) {
                            source.copyRecursively(target, overwrite = true)
                            source.deleteRecursively()
                        } else {
                            if (!source.renameTo(target)) {
                                source.copyTo(target, overwrite = true)
                                source.delete()
                            }
                        }
                    }
                }
                results.add(target)
            }
            results
        }
    }

    fun zipFiles(filesToZip: List<File>, destinationZipFile: File): Result<File> {
        return runCatching {
            ZipOutputStream(BufferedOutputStream(FileOutputStream(destinationZipFile))).use { zos ->
                for (file in filesToZip) {
                    addFileToZip(file, "", zos)
                }
            }
            destinationZipFile
        }
    }

    private fun addFileToZip(file: File, parentPath: String, zos: ZipOutputStream) {
        val entryName = if (parentPath.isEmpty()) file.name else "$parentPath/${file.name}"
        if (file.isDirectory) {
            val folderEntry = ZipEntry("$entryName/")
            zos.putNextEntry(folderEntry)
            zos.closeEntry()
            file.listFiles()?.forEach { child ->
                addFileToZip(child, entryName, zos)
            }
        } else {
            val entry = ZipEntry(entryName)
            zos.putNextEntry(entry)
            FileInputStream(file).use { fis ->
                fis.copyTo(zos)
            }
            zos.closeEntry()
        }
    }

    fun unzipFile(zipFile: File, destinationDir: File): Result<Int> {
        return runCatching {
            destinationDir.mkdirs()
            var count = 0
            ZipInputStream(BufferedInputStream(FileInputStream(zipFile))).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    val destFile = File(destinationDir, entry.name)
                    // Protect against Zip Slip vulnerability
                    if (!destFile.canonicalPath.startsWith(destinationDir.canonicalPath)) {
                        throw SecurityException("Zip entry is outside of the target dir: ${entry.name}")
                    }
                    if (entry.isDirectory) {
                        destFile.mkdirs()
                    } else {
                        destFile.parentFile?.mkdirs()
                        FileOutputStream(destFile).use { fos ->
                            zis.copyTo(fos)
                        }
                        count++
                    }
                    zis.closeEntry()
                    entry = zis.nextEntry
                }
            }
            count
        }
    }
}
