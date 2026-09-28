package com.agon.app.service

import android.content.Context
import com.agon.app.model.LineType
import com.agon.app.model.TerminalOutputLine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

class TerminalEngine(private val context: Context) {

    private var activeProcess: Process? = null
    private var processJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO)

    var currentDirectory: File = File(context.filesDir, "sandbox/workspace").apply { mkdirs() }
        private set

    private val _outputFlow = MutableSharedFlow<TerminalOutputLine>(replay = 200, extraBufferCapacity = 500)
    val outputFlow: SharedFlow<TerminalOutputLine> = _outputFlow

    init {
        emitLine("NexusDev Interactive Shell initialized.", LineType.SYSTEM_INFO)
        emitLine("Host Architecture: ${System.getProperty("os.arch") ?: "arm64"}", LineType.SYSTEM_INFO)
        emitLine("Working Directory: ${currentDirectory.absolutePath}", LineType.SYSTEM_INFO)
        emitLine("Type 'help' for built-in DevOps tools or run any native command.\n", LineType.SYSTEM_INFO)
    }

    fun emitLine(text: String, type: LineType = LineType.STDOUT) {
        scope.launch {
            _outputFlow.emit(TerminalOutputLine(text = text, type = type))
        }
    }

    fun executeCommand(commandString: String, customEnv: Map<String, String> = emptyMap(), onFinished: (Int) -> Unit = {}) {
        val trimmed = commandString.trim()
        if (trimmed.isEmpty()) return

        emitLine("$ $trimmed", LineType.COMMAND)

        // Handle built-in cd command
        if (trimmed.startsWith("cd ") || trimmed == "cd") {
            handleCd(trimmed)
            onFinished(0)
            return
        }

        if (trimmed == "clear") {
            emitLine("__CLEAR__", LineType.SYSTEM_INFO)
            onFinished(0)
            return
        }

        if (trimmed == "help") {
            emitHelp()
            onFinished(0)
            return
        }

        processJob?.cancel()
        processJob = scope.launch {
            try {
                val builder = ProcessBuilder("sh", "-c", trimmed)
                builder.directory(currentDirectory)

                val env = builder.environment()
                // Configure clean sandbox environment
                env["HOME"] = currentDirectory.absolutePath
                env["USER"] = "nexus"
                env["TERM"] = "xterm-256color"
                env["LANG"] = "en_US.UTF-8"
                val defaultPath = env["PATH"] ?: "/system/bin:/system/xbin"
                env["PATH"] = "${context.filesDir.absolutePath}/bin:$defaultPath"

                for ((k, v) in customEnv) {
                    env[k] = v
                }

                val process = builder.start()
                activeProcess = process

                val stdoutReader = BufferedReader(InputStreamReader(process.inputStream))
                val stderrReader = BufferedReader(InputStreamReader(process.errorStream))

                val outJob = launch {
                    var line: String?
                    while (stdoutReader.readLine().also { line = it } != null) {
                        emitLine(line ?: "", LineType.STDOUT)
                    }
                }

                val errJob = launch {
                    var errLine: String?
                    while (stderrReader.readLine().also { errLine = it } != null) {
                        emitLine(errLine ?: "", LineType.STDERR)
                    }
                }

                outJob.join()
                errJob.join()

                val exitCode = process.waitFor()
                if (exitCode == 0) {
                    emitLine("[Process completed with exit code 0]", LineType.SUCCESS)
                } else {
                    emitLine("[Process exited with code $exitCode]", LineType.ERROR)
                }
                activeProcess = null
                withContext(Dispatchers.Main) {
                    onFinished(exitCode)
                }
            } catch (e: Exception) {
                emitLine("Execution error: ${e.message}", LineType.ERROR)
                activeProcess = null
                withContext(Dispatchers.Main) {
                    onFinished(-1)
                }
            }
        }
    }

    private fun handleCd(cmd: String) {
        val targetPath: String = if (cmd == "cd") {
            context.filesDir.absolutePath
        } else {
            cmd.removePrefix("cd ").trim()
        }

        val targetDir = if (targetPath.startsWith("/")) {
            File(targetPath)
        } else if (targetPath == "~") {
            File(context.filesDir, "sandbox/workspace")
        } else {
            File(currentDirectory, targetPath)
        }

        if (targetDir.exists() && targetDir.isDirectory) {
            currentDirectory = targetDir.canonicalFile
            emitLine(currentDirectory.absolutePath, LineType.STDOUT)
        } else {
            emitLine("cd: no such file or directory: $targetPath", LineType.STDERR)
        }
    }

    private fun emitHelp() {
        val help = """
            NexusDev Terminal Commands:
              cd <path>        - Change working directory
              pwd              - Print current working directory
              ls [-la]         - List directory contents
              cat <file>       - Display file contents
              echo <text>      - Echo text output
              mkdir <dir>      - Create directory
              rm [-rf] <target>- Remove files or directory
              uname -a         - Print system architecture
              df -h            - Show storage filesystem usage
              proot            - Launch configured Linux sandbox rootfs
              clear            - Clear terminal output
        """.trimIndent()
        emitLine(help, LineType.SYSTEM_INFO)
    }

    fun killActiveProcess() {
        activeProcess?.let {
            it.destroy()
            emitLine("[Process terminated by user SIGINT/SIGKILL]", LineType.ERROR)
            activeProcess = null
        }
    }

    val isRunning: Boolean
        get() = activeProcess?.isAlive == true
}
