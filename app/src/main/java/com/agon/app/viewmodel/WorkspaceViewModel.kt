package com.agon.app.viewmodel

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.agon.app.model.*
import com.agon.app.service.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID

enum class AppScreen(val label: String) {
    DASHBOARD("Dashboard"),
    CHAT("AI Assistant"),
    TERMINAL("Termux Shell"),
    FILES("File Manager"),
    PACKAGES("Sandbox Rootfs"),
    ORCHESTRATOR("Orchestrator"),
    BYOK("BYOK Settings")
}

class WorkspaceViewModel(application: Application) : AndroidViewModel(application) {

    private val terminalEngine = TerminalEngine(application)
    private val sandboxManager = SandboxManager(application)
    private val fileManagerService = FileManagerService(application)
    private val deviceMonitorService = DeviceMonitorService(application)
    private val aiClientService = AiClientService()
    private val aiSuggestEngine = AiSuggestEngine()

    // -------------------------------------------------------------
    // NAVIGATION & WINDOW TOGGLES
    // -------------------------------------------------------------
    var activeScreen by mutableStateOf(AppScreen.DASHBOARD)
    var isSidebarOpen by mutableStateOf(false)
    var isSplitViewActive by mutableStateOf(false)
    var showAiSuggestPanel by mutableStateOf(true)

    // -------------------------------------------------------------
    // USER PROFILE (Default Google App Profile)
    // -------------------------------------------------------------
    var userName by mutableStateOf("DevOps Lead")
    var userEmail by mutableStateOf("developer@nexusdev.internal")
    var userRole by mutableStateOf("Elite Platform Architect")

    // -------------------------------------------------------------
    // SYSTEM RESOURCES MONITOR
    // -------------------------------------------------------------
    var systemResources by mutableStateOf(
        deviceMonitorService.getSystemResources(sandboxReady = true, sandboxDistro = "Ubuntu 24.04")
    )
        private set

    // -------------------------------------------------------------
    // TERMINAL STATE
    // -------------------------------------------------------------
    val terminalOutput = mutableStateListOf<TerminalOutputLine>()
    var terminalInputText by mutableStateOf("")
    var isTerminalRunning by mutableStateOf(false)
    var terminalWorkingDir by mutableStateOf(terminalEngine.currentDirectory.absolutePath)
    private val commandHistory = mutableListOf<String>()
    private var historyIndex = -1

    // -------------------------------------------------------------
    // SANDBOX STATE
    // -------------------------------------------------------------
    var activeDistro by mutableStateOf(LinuxDistro.UBUNTU_24)
    var sandboxStatus by mutableStateOf(sandboxManager.initializeRootfs(LinuxDistro.UBUNTU_24))
    val availablePackages = mutableStateListOf<SandboxPackage>()
    var packageSearchQuery by mutableStateOf("")

    // -------------------------------------------------------------
    // FILE MANAGER STATE
    // -------------------------------------------------------------
    var currentBrowseDirectory by mutableStateOf(fileManagerService.workspaceDir)
    val directoryFiles = mutableStateListOf<FileItem>()
    val selectedFiles = mutableStateListOf<File>()
    val bookmarkedPaths = mutableStateListOf<String>()
    var clipboardItem by mutableStateOf<ClipboardItem?>(null)

    // In-app Code Editor
    var activeEditingFile by mutableStateOf<File?>(null)
    var activeEditorContent by mutableStateOf("")
    var isEditorOpen by mutableStateOf(false)

    // -------------------------------------------------------------
    // CHAT STATE
    // -------------------------------------------------------------
    val chatMessages = mutableStateListOf<ChatMessage>()
    var chatInputText by mutableStateOf("")
    var isChatGenerating by mutableStateOf(false)
    val attachedFiles = mutableStateListOf<ChatAttachment>()
    var chatStatusNote by mutableStateOf("")

    // -------------------------------------------------------------
    // AI SUGGEST STATE
    // -------------------------------------------------------------
    val currentSuggestions = mutableStateListOf<SuggestionItem>()

    // -------------------------------------------------------------
    // BYOK PROVIDERS & ROUTING & FALLBACK CHAIN (Max 15)
    // -------------------------------------------------------------
    val aiProviders = mutableStateListOf<AiProviderConfig>()
    val fallbackChain = mutableStateListOf<FallbackModelEntry>()

    // -------------------------------------------------------------
    // ORCHESTRATOR PROFILE
    // -------------------------------------------------------------
    var orchestratorProfile by mutableStateOf(OrchestratorProfile())

    init {
        initDefaultProviders()
        initDefaultFallbackChain()
        initDefaultOrchestrator()
        refreshAvailablePackages()
        refreshDirectoryFiles()
        refreshSystemResources()

        // Terminal Output Flow Listener
        viewModelScope.launch {
            terminalEngine.outputFlow.collectLatest { line ->
                if (line.text == "__CLEAR__") {
                    terminalOutput.clear()
                } else {
                    terminalOutput.add(line)
                    if (terminalOutput.size > 800) {
                        terminalOutput.removeAt(0)
                    }
                }
                terminalWorkingDir = terminalEngine.currentDirectory.absolutePath
                isTerminalRunning = terminalEngine.isRunning
            }
        }

        // Add welcome message in chat
        chatMessages.add(
            ChatMessage(
                role = MessageRole.ASSISTANT,
                content = "NexusDev AI Coding Assistant initialized.\n" +
                        "• Direct Sandbox shell execution active on ${sandboxStatus.detectedArch}\n" +
                        "• BYOK Multi-Provider Engine configured with fallback chain (up to 15 models)\n" +
                        "• Linux Rootfs available: Ubuntu 24.04 LTS, Debian 12, Kali NetHunter\n" +
                        "How can I assist your DevOps or development workflow today?"
            )
        )
    }

    // -------------------------------------------------------------
    // PROVIDER & FALLBACK INITIALIZATION
    // -------------------------------------------------------------
    private fun initDefaultProviders() {
        aiProviders.clear()
        aiProviders.addAll(
            listOf(
                AiProviderConfig(
                    id = "openrouter",
                    name = "OpenRouter",
                    type = ProviderType.OPENROUTER,
                    baseUrl = "https://openrouter.ai/api/v1",
                    apiKey = "",
                    selectedModel = "meta-llama/llama-3.3-70b-instruct:free",
                    availableModels = listOf(
                        "meta-llama/llama-3.3-70b-instruct:free",
                        "deepseek/deepseek-r1:free",
                        "anthropic/claude-3.7-sonnet",
                        "openai/gpt-4o",
                        "google/gemini-2.0-flash-001"
                    ),
                    isEnabled = true
                ),
                AiProviderConfig(
                    id = "openai",
                    name = "OpenAI",
                    type = ProviderType.OPENAI,
                    baseUrl = "https://api.openai.com/v1",
                    apiKey = "",
                    selectedModel = "gpt-4o-mini",
                    availableModels = listOf("gpt-4o", "gpt-4o-mini", "o3-mini", "gpt-4-turbo"),
                    isEnabled = false
                ),
                AiProviderConfig(
                    id = "anthropic",
                    name = "Anthropic Claude",
                    type = ProviderType.ANTHROPIC,
                    baseUrl = "https://api.anthropic.com/v1",
                    apiKey = "",
                    selectedModel = "claude-3-5-sonnet-20241022",
                    availableModels = listOf("claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"),
                    isEnabled = false
                ),
                AiProviderConfig(
                    id = "groq",
                    name = "Groq High-Speed",
                    type = ProviderType.GROQ,
                    baseUrl = "https://api.groq.com/openai/v1",
                    apiKey = "",
                    selectedModel = "llama-3.3-70b-versatile",
                    availableModels = listOf("llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"),
                    isEnabled = false
                ),
                AiProviderConfig(
                    id = "deepseek",
                    name = "DeepSeek AI",
                    type = ProviderType.DEEPSEEK,
                    baseUrl = "https://api.deepseek.com/v1",
                    apiKey = "",
                    selectedModel = "deepseek-chat",
                    availableModels = listOf("deepseek-chat", "deepseek-reasoner"),
                    isEnabled = false
                ),
                AiProviderConfig(
                    id = "ollama",
                    name = "Ollama Local",
                    type = ProviderType.OLLAMA,
                    baseUrl = "http://127.0.0.1:11434/v1",
                    apiKey = "ollama",
                    selectedModel = "qwen2.5-coder:7b",
                    availableModels = listOf("qwen2.5-coder:7b", "llama3:latest", "mistral:latest"),
                    isEnabled = false
                )
            )
        )
    }

    private fun initDefaultFallbackChain() {
        fallbackChain.clear()
        val defaults = listOf(
            FallbackModelEntry(UUID.randomUUID().toString(), "openrouter", "OpenRouter", "meta-llama/llama-3.3-70b-instruct:free", 1),
            FallbackModelEntry(UUID.randomUUID().toString(), "openrouter", "OpenRouter", "deepseek/deepseek-r1:free", 2),
            FallbackModelEntry(UUID.randomUUID().toString(), "groq", "Groq", "llama-3.3-70b-versatile", 3),
            FallbackModelEntry(UUID.randomUUID().toString(), "groq", "Groq", "llama-3.1-8b-instant", 4),
            FallbackModelEntry(UUID.randomUUID().toString(), "openai", "OpenAI", "gpt-4o-mini", 5),
            FallbackModelEntry(UUID.randomUUID().toString(), "openai", "OpenAI", "gpt-4o", 6),
            FallbackModelEntry(UUID.randomUUID().toString(), "anthropic", "Anthropic", "claude-3-5-sonnet-20241022", 7),
            FallbackModelEntry(UUID.randomUUID().toString(), "anthropic", "Anthropic", "claude-3-7-sonnet-20250219", 8),
            FallbackModelEntry(UUID.randomUUID().toString(), "deepseek", "DeepSeek", "deepseek-chat", 9),
            FallbackModelEntry(UUID.randomUUID().toString(), "deepseek", "DeepSeek", "deepseek-reasoner", 10),
            FallbackModelEntry(UUID.randomUUID().toString(), "ollama", "Ollama", "qwen2.5-coder:7b", 11)
        )
        fallbackChain.addAll(defaults)
    }

    private fun initDefaultOrchestrator() {
        val initialSkills = listOf(
            DevSkill("skill_bash", "Bash & POSIX Scripting", "Systems", "Proficiency in advanced bash pipelines, sed, awk, traps, and process management", "Generate robust shell code using set -euo pipefail, handling SIGINT cleanly.", isSelected = true),
            DevSkill("skill_k8s_docker", "Docker & Containers", "DevOps", "Dockerfile multi-stage optimization, container security, compose specs", "Follow Docker best practices: non-root users, minimal Alpine/Debian slim bases.", isSelected = true),
            DevSkill("skill_python", "Python Backend & Scripts", "Coding", "Type-annotated Python 3.12+ async architecture, pytest, fastAPI", "Write strictly typed Python with type hints and comprehensive docstrings.", isSelected = true),
            DevSkill("skill_security", "Offensive & Defensive Security", "Security", "Vulnerability assessment, network auditing, penetration testing logic", "Perform strict security code review checking for injection, SSRF, buffer exploits.", isSelected = false),
            DevSkill("skill_git", "Git DevOps & Workflows", "VCS", "Rebase, cherry-pick, conflict resolution, bisect, clean commit formatting", "Enforce conventional commits style: feat:, fix:, chore:, docs:.", isSelected = true),
            DevSkill("skill_c_cpp", "C / C++ Systems Programming", "Systems", "Memory management, POSIX sockets, syscalls, makefiles", "Validate pointer arithmetic, memory bounds, and valgrind clean allocations.", isSelected = false)
        )

        val initialSecrets = listOf(
            SecretEnvVar(key = "GITHUB_PAT", value = "ghp_secureSandboxTokenExample", isSecret = true),
            SecretEnvVar(key = "ENVIRONMENT", value = "production-sandbox", isSecret = false),
            SecretEnvVar(key = "DEBUG_LOGS", value = "1", isSecret = false)
        )

        val initialRepos = listOf(
            PinnedRepo(name = "infra-deployments", url = "https://github.com/agon/infra-deployments.git", branch = "main", localPath = "/sandbox/workspace/infra-deployments"),
            PinnedRepo(name = "nexus-microservices", url = "https://github.com/agon/nexus-microservices.git", branch = "develop", localPath = "/sandbox/workspace/nexus-microservices")
        )

        val initialWorkflows = listOf(
            WorkflowStep(stepNumber = 1, title = "Initialize Workspace Directory", command = "mkdir -p src tests config && ls -la", stopOnError = true),
            WorkflowStep(stepNumber = 2, title = "Environment Architecture Audit", command = "uname -a && cat /etc/os-release && df -h", stopOnError = true),
            WorkflowStep(stepNumber = 3, title = "Generate Healthcheck Script", command = "cat << 'EOF' > healthcheck.sh\n#!/bin/sh\necho \"Sandbox System: OK\"\ndate -u\nEOF\nchmod +x healthcheck.sh && ./healthcheck.sh", stopOnError = false)
        )

        val initialConnectors = listOf(
            ConnectorConfig(type = "GitHub API", name = "NexusDev Repository Sync", endpointOrTarget = "api.github.com", isConnected = true),
            ConnectorConfig(type = "Git SSH", name = "Production Deploy Key", endpointOrTarget = "git@github.com", isConnected = true),
            ConnectorConfig(type = "HTTP Webhook", name = "CI/CD Dispatcher", endpointOrTarget = "https://webhook.nexusdev.internal/deploy", isConnected = false)
        )

        val initialSwarm = (1..6).map { idx ->
            when (idx) {
                1 -> SwarmAgent(name = "Commander Lead", role = "Orchestrator", briefPrompt = "Breaks down complex requirements into parallel tasks.", assignedModel = "auto-frontier")
                2 -> SwarmAgent(name = "SysAdmin Agent", role = "Linux Systems", briefPrompt = "Handles bash execution, file permissions, daemon setup.", assignedModel = "auto-balance")
                3 -> SwarmAgent(name = "SecAuditor", role = "Security Specialist", briefPrompt = "Scans code for CVEs, leak tokens, and unsafe memory.", assignedModel = "auto-frontier")
                4 -> SwarmAgent(name = "CodeReviewer", role = "Quality Assurance", briefPrompt = "Checks clean code, SOLID principles, and test coverage.", assignedModel = "auto-small")
                5 -> SwarmAgent(name = "NetworkPro", role = "Networking & Sockets", briefPrompt = "Diagnostics with nmap, curl, packet inspection.", assignedModel = "auto-balance")
                else -> SwarmAgent(name = "DocMaster", role = "Technical Documentation", briefPrompt = "Produces Markdown architecture blueprints and runbooks.", assignedModel = "auto-free")
            }
        }

        orchestratorProfile = OrchestratorProfile(
            routingMode = RoutingMode.AUTO_BALANCE,
            envVars = initialSecrets,
            skills = initialSkills,
            pinnedRepos = initialRepos,
            workflowSteps = initialWorkflows,
            connectors = initialConnectors,
            swarmAgents = initialSwarm
        )
    }

    // -------------------------------------------------------------
    // SYSTEM MONITOR REFRESH
    // -------------------------------------------------------------
    fun refreshSystemResources() {
        systemResources = deviceMonitorService.getSystemResources(
            sandboxReady = sandboxStatus.isInitialized,
            sandboxDistro = activeDistro.distroName
        )
    }

    // -------------------------------------------------------------
    // TERMINAL COMMAND EXECUTION
    // -------------------------------------------------------------
    fun executeTerminalCommand(cmd: String = terminalInputText) {
        val trimmed = cmd.trim()
        if (trimmed.isEmpty()) return

        commandHistory.add(trimmed)
        historyIndex = commandHistory.size
        terminalInputText = ""
        isTerminalRunning = true

        val envMap = orchestratorProfile.envVars.associate { it.key to it.value }
        terminalEngine.executeCommand(trimmed, customEnv = envMap) {
            isTerminalRunning = terminalEngine.isRunning
            terminalWorkingDir = terminalEngine.currentDirectory.absolutePath
            refreshDirectoryFiles()
            refreshSystemResources()
        }
    }

    fun killTerminalProcess() {
        terminalEngine.killActiveProcess()
        isTerminalRunning = false
    }

    fun clearTerminal() {
        terminalOutput.clear()
    }

    fun navigateCommandHistory(up: Boolean) {
        if (commandHistory.isEmpty()) return
        if (up) {
            if (historyIndex > 0) {
                historyIndex--
                terminalInputText = commandHistory[historyIndex]
            }
        } else {
            if (historyIndex < commandHistory.size - 1) {
                historyIndex++
                terminalInputText = commandHistory[historyIndex]
            } else {
                historyIndex = commandHistory.size
                terminalInputText = ""
            }
        }
    }

    // -------------------------------------------------------------
    // SANDBOX ROOTFS DISTRO & PACKAGES
    // -------------------------------------------------------------
    fun switchDistro(distro: LinuxDistro) {
        activeDistro = distro
        sandboxStatus = sandboxManager.initializeRootfs(distro)
        refreshAvailablePackages()
        refreshSystemResources()
        terminalEngine.emitLine("Switched sandbox environment to ${distro.distroName} ${distro.version}", LineType.SYSTEM_INFO)
    }

    fun bootstrapSandbox() {
        sandboxStatus = sandboxManager.initializeRootfs(activeDistro)
        terminalEngine.emitLine("Re-initialized sandbox rootfs at: ${sandboxStatus.rootfsDirectory}", LineType.SUCCESS)
        refreshSystemResources()
    }

    fun refreshAvailablePackages() {
        availablePackages.clear()
        availablePackages.addAll(sandboxManager.getAvailablePackages(activeDistro))
    }

    fun installSandboxPackage(pkg: SandboxPackage) {
        terminalEngine.emitLine("Package Manager: Installing ${pkg.name} (${pkg.sizeEstimate})...", LineType.SYSTEM_INFO)
        terminalEngine.executeCommand(pkg.command) { exitCode ->
            if (exitCode == 0) {
                val idx = availablePackages.indexOfFirst { it.name == pkg.name }
                if (idx != -1) {
                    availablePackages[idx] = availablePackages[idx].copy(isInstalled = true)
                }
                sandboxStatus = sandboxStatus.copy(installedPackageCount = availablePackages.count { it.isInstalled })
                refreshSystemResources()
            }
        }
    }

    // -------------------------------------------------------------
    // FILE MANAGER OPERATIONS
    // -------------------------------------------------------------
    fun refreshDirectoryFiles() {
        directoryFiles.clear()
        directoryFiles.addAll(fileManagerService.listFiles(currentBrowseDirectory, bookmarkedPaths.toSet()))
    }

    fun navigateToDirectory(target: File) {
        if (target.exists() && target.isDirectory) {
            currentBrowseDirectory = target
            selectedFiles.clear()
            refreshDirectoryFiles()
        }
    }

    fun navigateUpDirectory() {
        val parent = currentBrowseDirectory.parentFile
        if (parent != null && parent.canRead()) {
            currentBrowseDirectory = parent
            selectedFiles.clear()
            refreshDirectoryFiles()
        }
    }

    fun createNewFile(name: String, content: String = "") {
        fileManagerService.createFile(currentBrowseDirectory, name, content).onSuccess {
            refreshDirectoryFiles()
            terminalEngine.emitLine("Created file: ${it.absolutePath}", LineType.SUCCESS)
        }.onFailure {
            terminalEngine.emitLine("Failed to create file: ${it.message}", LineType.ERROR)
        }
    }

    fun createNewFolder(name: String) {
        fileManagerService.createDirectory(currentBrowseDirectory, name).onSuccess {
            refreshDirectoryFiles()
            terminalEngine.emitLine("Created folder: ${it.absolutePath}", LineType.SUCCESS)
        }.onFailure {
            terminalEngine.emitLine("Failed to create folder: ${it.message}", LineType.ERROR)
        }
    }

    fun toggleFileSelection(file: File) {
        if (selectedFiles.contains(file)) {
            selectedFiles.remove(file)
        } else {
            selectedFiles.add(file)
        }
    }

    fun selectAllFiles() {
        selectedFiles.clear()
        selectedFiles.addAll(directoryFiles.map { it.file })
    }

    fun clearFileSelection() {
        selectedFiles.clear()
    }

    fun deleteSelectedFiles() {
        val targets = selectedFiles.toList()
        for (f in targets) {
            fileManagerService.deleteFile(f)
        }
        selectedFiles.clear()
        refreshDirectoryFiles()
    }

    fun renameFile(target: File, newName: String) {
        fileManagerService.renameFile(target, newName).onSuccess {
            refreshDirectoryFiles()
        }
    }

    fun copySelected() {
        if (selectedFiles.isNotEmpty()) {
            clipboardItem = ClipboardItem(ClipboardAction.COPY, selectedFiles.toList())
        }
    }

    fun cutSelected() {
        if (selectedFiles.isNotEmpty()) {
            clipboardItem = ClipboardItem(ClipboardAction.CUT, selectedFiles.toList())
        }
    }

    fun pasteClipboard() {
        clipboardItem?.let { clip ->
            fileManagerService.pasteClipboard(clip, currentBrowseDirectory).onSuccess {
                if (clip.action == ClipboardAction.CUT) {
                    clipboardItem = null
                }
                selectedFiles.clear()
                refreshDirectoryFiles()
            }
        }
    }

    fun zipSelectedFiles(zipName: String) {
        if (selectedFiles.isNotEmpty()) {
            val destination = File(currentBrowseDirectory, if (zipName.endsWith(".zip")) zipName else "$zipName.zip")
            fileManagerService.zipFiles(selectedFiles.toList(), destination).onSuccess {
                selectedFiles.clear()
                refreshDirectoryFiles()
            }
        }
    }

    fun unzipFile(file: File) {
        val targetDir = File(currentBrowseDirectory, file.nameWithoutExtension)
        fileManagerService.unzipFile(file, targetDir).onSuccess {
            refreshDirectoryFiles()
        }
    }

    fun toggleBookmark(path: String) {
        if (bookmarkedPaths.contains(path)) {
            bookmarkedPaths.remove(path)
        } else {
            bookmarkedPaths.add(path)
        }
        refreshDirectoryFiles()
    }

    fun openFileInEditor(file: File) {
        fileManagerService.readFileContent(file).onSuccess { text ->
            activeEditingFile = file
            activeEditorContent = text
            isEditorOpen = true
        }
    }

    fun saveEditorContent() {
        activeEditingFile?.let { file ->
            fileManagerService.saveFileContent(file, activeEditorContent).onSuccess {
                isEditorOpen = false
                refreshDirectoryFiles()
            }
        }
    }

    fun runFileInTerminal(file: File) {
        when (file.extension.lowercase()) {
            "sh", "bash" -> {
                terminalEngine.executeCommand("sh \"${file.absolutePath}\"")
                activeScreen = AppScreen.TERMINAL
            }
            "py" -> {
                terminalEngine.executeCommand("python3 \"${file.absolutePath}\"")
                activeScreen = AppScreen.TERMINAL
            }
            "js" -> {
                terminalEngine.executeCommand("node \"${file.absolutePath}\"")
                activeScreen = AppScreen.TERMINAL
            }
            else -> {
                terminalEngine.executeCommand("cat \"${file.absolutePath}\"")
                activeScreen = AppScreen.TERMINAL
            }
        }
    }

    // -------------------------------------------------------------
    // CHAT & AI LOGIC (BYOK & Routing)
    // -------------------------------------------------------------
    fun sendChatMessage() {
        val prompt = chatInputText.trim()
        if (prompt.isEmpty() || isChatGenerating) return

        val userAttachments = attachedFiles.toList()
        attachedFiles.clear()
        chatInputText = ""

        val userMessage = ChatMessage(
            role = MessageRole.USER,
            content = prompt,
            attachments = userAttachments
        )
        chatMessages.add(userMessage)

        isChatGenerating = true
        chatStatusNote = "Selecting route: ${orchestratorProfile.routingMode.label}..."

        viewModelScope.launch {
            val startTime = System.currentTimeMillis()
            val result = aiClientService.sendChatCompletion(
                providers = aiProviders.toList(),
                fallbackChain = fallbackChain.toList(),
                orchestrator = orchestratorProfile,
                conversation = chatMessages.toList(),
                userPrompt = prompt,
                onProgress = { note ->
                    chatStatusNote = note
                }
            )

            isChatGenerating = false
            val elapsed = System.currentTimeMillis() - startTime

            result.onSuccess { reply ->
                chatMessages.add(
                    ChatMessage(
                        role = MessageRole.ASSISTANT,
                        content = reply,
                        executionTimeMs = elapsed
                    )
                )
                chatStatusNote = ""
            }.onFailure { err ->
                chatMessages.add(
                    ChatMessage(
                        role = MessageRole.ASSISTANT,
                        content = "⚠️ Execution Failure: ${err.message ?: "Unable to complete request"}\n\nTip: Check API keys in BYOK Settings or ensure internet connection is active.",
                        executionTimeMs = elapsed
                    )
                )
                chatStatusNote = "Failed: ${err.message}"
            }
        }
    }

    fun attachFileToChat(file: File) {
        val preview = if (file.length() < 8192) file.readText() else "File exceeds 8KB preview"
        val attachment = ChatAttachment(
            fileName = file.name,
            filePath = file.absolutePath,
            fileSize = file.length(),
            contentPreview = preview
        )
        attachedFiles.add(attachment)
    }

    fun removeChatAttachment(id: String) {
        attachedFiles.removeAll { it.id == id }
    }

    fun appendMicTranscription(text: String) {
        val separator = if (chatInputText.isNotBlank()) " " else ""
        chatInputText += separator + text
        onUserInputChange(chatInputText, isTerminal = false)
    }

    // -------------------------------------------------------------
    // AI✨SUGGEST ENGINE
    // -------------------------------------------------------------
    fun onUserInputChange(text: String, isTerminal: Boolean) {
        if (isTerminal) {
            terminalInputText = text
        } else {
            chatInputText = text
        }
        val suggestions = aiSuggestEngine.analyzeInput(text, isTerminal)
        currentSuggestions.clear()
        currentSuggestions.addAll(suggestions)
    }

    fun applySuggestion(item: SuggestionItem, isTerminal: Boolean) {
        if (isTerminal) {
            terminalInputText = item.replacementText
        } else {
            chatInputText = item.replacementText
        }
        currentSuggestions.clear()
    }

    // -------------------------------------------------------------
    // BYOK PROVIDER MANAGEMENT & VALIDATION
    // -------------------------------------------------------------
    fun addProvider(provider: AiProviderConfig) {
        aiProviders.add(provider)
    }

    fun updateProvider(provider: AiProviderConfig) {
        val index = aiProviders.indexOfFirst { it.id == provider.id }
        if (index != -1) {
            aiProviders[index] = provider
        }
    }

    fun removeProvider(providerId: String) {
        aiProviders.removeAll { it.id == providerId }
        fallbackChain.removeAll { it.providerId == providerId }
    }

    fun testProviderValidation(providerId: String) {
        val provider = aiProviders.firstOrNull { it.id == providerId } ?: return
        viewModelScope.launch {
            val (success, status) = aiClientService.testConnection(provider)
            val updated = provider.copy(
                lastValidationStatus = status,
                lastLatencyMs = if (success) 120L else -1L
            )
            updateProvider(updated)
        }
    }

    fun refreshProviderModels(providerId: String) {
        val provider = aiProviders.firstOrNull { it.id == providerId } ?: return
        viewModelScope.launch {
            aiClientService.fetchModels(provider).onSuccess { models ->
                val updated = provider.copy(
                    availableModels = models,
                    selectedModel = models.firstOrNull() ?: provider.selectedModel
                )
                updateProvider(updated)
            }.onFailure { err ->
                val updated = provider.copy(
                    lastValidationStatus = "Model Refresh Failed: ${err.message}"
                )
                updateProvider(updated)
            }
        }
    }

    fun addFallbackEntry(entry: FallbackModelEntry) {
        if (fallbackChain.size < 15) {
            fallbackChain.add(entry)
        }
    }

    fun removeFallbackEntry(id: String) {
        fallbackChain.removeAll { it.id == id }
    }

    fun reorderFallbackChain(fromIndex: Int, toIndex: Int) {
        if (fromIndex in fallbackChain.indices && toIndex in fallbackChain.indices) {
            val item = fallbackChain.removeAt(fromIndex)
            fallbackChain.add(toIndex, item)
            // recalculate priorities
            for (i in fallbackChain.indices) {
                fallbackChain[i] = fallbackChain[i].copy(priority = i + 1)
            }
        }
    }

    // -------------------------------------------------------------
    // ORCHESTRATOR PROFILE UPDATES
    // -------------------------------------------------------------
    fun updateOrchestratorPrompt(prompt: String) {
        if (prompt.length <= 12000) {
            orchestratorProfile = orchestratorProfile.copy(systemPrompt = prompt)
        }
    }

    fun updateRoutingMode(mode: RoutingMode) {
        orchestratorProfile = orchestratorProfile.copy(routingMode = mode)
    }

    fun toggleSkill(skillId: String) {
        val updatedSkills = orchestratorProfile.skills.map {
            if (it.id == skillId) it.copy(isSelected = !it.isSelected) else it
        }
        orchestratorProfile = orchestratorProfile.copy(skills = updatedSkills)
    }

    fun addSecretEnvVar(key: String, value: String, isSecret: Boolean) {
        if (key.isNotBlank()) {
            val list = orchestratorProfile.envVars.toMutableList()
            list.add(SecretEnvVar(key = key.trim().uppercase(), value = value, isSecret = isSecret))
            orchestratorProfile = orchestratorProfile.copy(envVars = list)
        }
    }

    fun removeSecretEnvVar(id: String) {
        val list = orchestratorProfile.envVars.filterNot { it.id == id }
        orchestratorProfile = orchestratorProfile.copy(envVars = list)
    }

    fun addPinnedRepo(name: String, url: String, branch: String) {
        if (name.isNotBlank() && url.isNotBlank()) {
            val list = orchestratorProfile.pinnedRepos.toMutableList()
            list.add(PinnedRepo(name = name.trim(), url = url.trim(), branch = branch.trim()))
            orchestratorProfile = orchestratorProfile.copy(pinnedRepos = list)
        }
    }

    fun removePinnedRepo(id: String) {
        val list = orchestratorProfile.pinnedRepos.filterNot { it.id == id }
        orchestratorProfile = orchestratorProfile.copy(pinnedRepos = list)
    }

    fun addWorkflowStep(title: String, command: String) {
        if (title.isNotBlank() && command.isNotBlank()) {
            val list = orchestratorProfile.workflowSteps.toMutableList()
            list.add(WorkflowStep(stepNumber = list.size + 1, title = title.trim(), command = command.trim()))
            orchestratorProfile = orchestratorProfile.copy(workflowSteps = list)
        }
    }

    fun executeWorkflowStep(step: WorkflowStep) {
        terminalEngine.emitLine("Executing Workflow Step #${step.stepNumber}: ${step.title}", LineType.COMMAND)
        terminalEngine.executeCommand(step.command)
        activeScreen = AppScreen.TERMINAL
    }

    fun addSwarmAgent(name: String, role: String, briefPrompt: String, assignedModel: String) {
        if (orchestratorProfile.swarmAgents.size < 35 && name.isNotBlank()) {
            val list = orchestratorProfile.swarmAgents.toMutableList()
            list.add(SwarmAgent(name = name.trim(), role = role.trim(), briefPrompt = briefPrompt.trim(), assignedModel = assignedModel))
            orchestratorProfile = orchestratorProfile.copy(swarmAgents = list)
        }
    }

    fun removeSwarmAgent(id: String) {
        val list = orchestratorProfile.swarmAgents.filterNot { it.id == id }
        orchestratorProfile = orchestratorProfile.copy(swarmAgents = list)
    }
}
