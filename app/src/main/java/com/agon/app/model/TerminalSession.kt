package com.agon.app.model

import java.util.UUID

data class TerminalOutputLine(
    val id: String = UUID.randomUUID().toString(),
    val text: String,
    val type: LineType = LineType.STDOUT,
    val timestamp: Long = System.currentTimeMillis()
)

enum class LineType {
    COMMAND, STDOUT, STDERR, SYSTEM_INFO, SUCCESS, ERROR
}

data class TerminalSession(
    val sessionId: String = UUID.randomUUID().toString(),
    val workingDirectory: String,
    val history: List<String> = emptyList(),
    val isRunning: Boolean = false,
    val exitCode: Int? = null,
    val environmentVariables: Map<String, String> = emptyMap()
)
