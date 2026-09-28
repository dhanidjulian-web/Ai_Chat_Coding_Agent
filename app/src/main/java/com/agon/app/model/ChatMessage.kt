package com.agon.app.model

import java.util.UUID

enum class MessageRole {
    USER, ASSISTANT, SYSTEM
}

data class ChatAttachment(
    val id: String = UUID.randomUUID().toString(),
    val fileName: String,
    val filePath: String,
    val fileSize: Long,
    val mimeType: String = "text/plain",
    val contentPreview: String = ""
)

data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: MessageRole,
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val modelUsed: String? = null,
    val attachments: List<ChatAttachment> = emptyList(),
    val isStreaming: Boolean = false,
    val executionTimeMs: Long? = null
)
