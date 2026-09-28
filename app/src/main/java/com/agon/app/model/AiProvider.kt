package com.agon.app.model

import kotlinx.serialization.Serializable

@Serializable
enum class RoutingMode(val label: String, val description: String) {
    USE_SINGLE_MODEL("Use Only 1 Model", "Pin execution to one designated model exclusively"),
    AUTO_FREE("Auto-Free", "Prioritize free/open tiers (OpenRouter free, Ollama local, Llama-3)"),
    AUTO_SMALL("Auto-Small", "Route to fastest & lightweight models (GPT-4o-mini, Claude Haiku, Llama-8B)"),
    AUTO_BALANCE("Auto-Balance", "Optimal balance between intelligence and speed (Claude 3.5 Sonnet, GPT-4o)"),
    AUTO_FRONTIER("Auto-Frontier", "Highest capability frontier models (Claude 3.7 Sonnet, o3-mini, DeepSeek-R1)")
}

@Serializable
enum class ProviderType(val displayName: String, val defaultBaseUrl: String) {
    OPENAI("OpenAI", "https://api.openai.com/v1"),
    OPENROUTER("OpenRouter", "https://openrouter.ai/api/v1"),
    ANTHROPIC("Anthropic", "https://api.anthropic.com/v1"),
    GROQ("Groq", "https://api.groq.com/openai/v1"),
    DEEPSEEK("DeepSeek", "https://api.deepseek.com/v1"),
    OLLAMA("Ollama Local/Remote", "http://127.0.0.1:11434/v1"),
    CUSTOM("Custom Endpoint", "https://api.your-provider.com/v1")
}

@Serializable
data class AiProviderConfig(
    val id: String,
    val name: String,
    val type: ProviderType,
    val baseUrl: String,
    val apiKey: String,
    val selectedModel: String,
    val availableModels: List<String> = emptyList(),
    val isEnabled: Boolean = true,
    val lastValidationStatus: String = "Not Tested",
    val lastLatencyMs: Long = -1L
)

@Serializable
data class FallbackModelEntry(
    val id: String,
    val providerId: String,
    val providerName: String,
    val modelId: String,
    val priority: Int, // 1 to 15
    val isEnabled: Boolean = true
)
