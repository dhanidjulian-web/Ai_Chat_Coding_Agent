package com.agon.app.service

data class SuggestionItem(
    val title: String,
    val description: String,
    val replacementText: String,
    val category: String, // Terminal, ShellFlag, Coding, Prompt
    val isAutoFix: Boolean = false
)

class AiSuggestEngine {

    fun analyzeInput(input: String, isTerminalMode: Boolean): List<SuggestionItem> {
        val trimmed = input.trim()
        if (trimmed.isEmpty()) return emptyList()

        val results = mutableListOf<SuggestionItem>()

        if (isTerminalMode) {
            analyzeTerminalInput(trimmed, results)
        } else {
            analyzeChatPrompt(trimmed, results)
        }

        return results.take(6)
    }

    private fun analyzeTerminalInput(cmd: String, results: MutableList<SuggestionItem>) {
        val lower = cmd.lowercase()

        when {
            lower.startsWith("git ") -> {
                if (lower == "git c" || lower.startsWith("git co")) {
                    results.add(SuggestionItem("git commit -m \"...\"", "Commit staged files with message", "git commit -m \"feat: update module\"", "Git"))
                    results.add(SuggestionItem("git checkout -b", "Create and switch to new branch", "git checkout -b feature/", "Git"))
                }
                if (lower == "git status" || lower == "git s") {
                    results.add(SuggestionItem("git status --short", "Concise status overview", "git status -s", "Git"))
                    results.add(SuggestionItem("git log --oneline -n 10", "View last 10 commits compactly", "git log --oneline -n 10", "Git"))
                }
                if (lower.startsWith("git push")) {
                    results.add(SuggestionItem("git push origin main", "Push to upstream main branch", "git push origin main", "Git"))
                }
            }
            lower.startsWith("docker ") -> {
                results.add(SuggestionItem("docker compose up -d", "Start containers in detached background mode", "docker compose up -d", "Docker"))
                results.add(SuggestionItem("docker ps -a", "List all running and stopped containers", "docker ps -a", "Docker"))
                results.add(SuggestionItem("docker logs -f <id>", "Follow real-time container log output", "docker logs -f ", "Docker"))
            }
            lower.startsWith("python") || lower.startsWith("python3") -> {
                results.add(SuggestionItem("python3 -m venv .venv", "Create dedicated Python virtual environment", "python3 -m venv .venv && source .venv/bin/activate", "Python"))
                results.add(SuggestionItem("python3 -m pip install -r", "Install project dependencies from requirements.txt", "python3 -m pip install -r requirements.txt", "Python"))
            }
            lower.startsWith("curl ") -> {
                if (!lower.contains("-s") && !lower.contains("-v")) {
                    results.add(SuggestionItem("curl -sIL", "Fetch headers and follow redirects cleanly", "$cmd -sIL", "Networking", isAutoFix = true))
                    results.add(SuggestionItem("curl -X POST -H 'Content-Type: json'", "Send JSON POST payload", "curl -X POST -H 'Content-Type: application/json' -d '{}' ", "Networking"))
                }
            }
            lower.startsWith("chmod ") -> {
                results.add(SuggestionItem("chmod +x <file>", "Grant executable permissions to script", "chmod +x ", "LinuxPerms"))
                results.add(SuggestionItem("chmod 755", "Standard rwxr-xr-x file permission", "chmod 755 ", "LinuxPerms"))
            }
            lower.startsWith("grep ") -> {
                results.add(SuggestionItem("grep -rnw '.' -e \"pattern\"", "Recursive whole-word search in current directory", "grep -rnw '.' -e \"\"", "Search"))
            }
            lower.startsWith("tar ") -> {
                results.add(SuggestionItem("tar -xzvf <archive.tar.gz>", "Extract gzip tar archive with verbose progress", "tar -xzvf ", "Archiver"))
                results.add(SuggestionItem("tar -czvf <name.tar.gz> <dir>", "Create compressed tar.gz archive", "tar -czvf archive.tar.gz ", "Archiver"))
            }
            lower.startsWith("apt ") -> {
                results.add(SuggestionItem("apt update && apt upgrade -y", "Refresh package indices and upgrade packages", "apt update && apt upgrade -y", "PkgManager"))
            }
            else -> {
                // General completions
                if (lower == "ls") {
                    results.add(SuggestionItem("ls -la", "List all files including hidden with permissions & size", "ls -la", "Linux"))
                }
                if (lower == "df") {
                    results.add(SuggestionItem("df -h", "Show disk storage usage in human-readable format", "df -h", "System"))
                }
                if (lower == "ps") {
                    results.add(SuggestionItem("ps aux", "List all active processes with user, PID, CPU%", "ps aux", "System"))
                }
            }
        }
    }

    private fun analyzeChatPrompt(prompt: String, results: MutableList<SuggestionItem>) {
        val lower = prompt.lowercase()

        when {
            lower.contains("bug") || lower.contains("error") || lower.contains("fail") || lower.contains("exception") -> {
                results.add(
                    SuggestionItem(
                        "Add Root-Cause Analysis Request",
                        "Instruct AI to analyze root cause, provide fix and regression tests",
                        "$prompt\n\nPlease explain: 1. Root cause analysis, 2. Clean fix with code, 3. How to prevent this.",
                        "DevOps AI"
                    )
                )
            }
            lower.contains("refactor") || lower.contains("clean") -> {
                results.add(
                    SuggestionItem(
                        "Enforce Clean Architecture & SOLID",
                        "Add guidelines for idiomatic code, maintainability and performance",
                        "$prompt\n\nEnsure: SOLID principles, zero performance regressions, and clean documentation.",
                        "Architecture"
                    )
                )
            }
            lower.contains("bash") || lower.contains("script") || lower.contains("shell") -> {
                results.add(
                    SuggestionItem(
                        "Enforce ShellCheck & Strict Mode",
                        "Require set -euo pipefail and robust POSIX error handling",
                        "$prompt\n\nPlease include 'set -euo pipefail', trap cleanup, and input validation.",
                        "Shell"
                    )
                )
            }
            lower.contains("api") || lower.contains("endpoint") || lower.contains("rest") -> {
                results.add(
                    SuggestionItem(
                        "Include Schema & OpenAPI Spec",
                        "Request HTTP response codes, JSON request/response schema",
                        "$prompt\n\nInclude JSON schemas, error response codes, and curl invocation examples.",
                        "API"
                    )
                )
            }
            else -> {
                if (prompt.length < 25) {
                    results.add(
                        SuggestionItem(
                            "Expand with Production Details",
                            "Prompt assistant for production-ready, security-audited code",
                            "$prompt (provide production-ready code with complete error handling)",
                            "Prompt Tuning"
                        )
                    )
                }
            }
        }
    }
}
