package com.agon.app.service

import com.agon.app.model.AiProviderConfig
import com.agon.app.model.ChatMessage
import com.agon.app.model.FallbackModelEntry
import com.agon.app.model.MessageRole
import com.agon.app.model.OrchestratorProfile
import com.agon.app.model.ProviderType
import com.agon.app.model.RoutingMode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AiClientService {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    suspend fun testConnection(provider: AiProviderConfig): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        try {
            val url = cleanUrl(provider.baseUrl, "/models")
            val requestBuilder = Request.Builder().url(url).get()

            if (provider.apiKey.isNotBlank()) {
                if (provider.type == ProviderType.ANTHROPIC) {
                    requestBuilder.addHeader("x-api-key", provider.apiKey)
                    requestBuilder.addHeader("anthropic-version", "2023-06-01")
                } else {
                    requestBuilder.addHeader("Authorization", "Bearer ${provider.apiKey}")
                }
            }

            httpClient.newCall(requestBuilder.build()).execute().use { response ->
                val duration = System.currentTimeMillis() - startTime
                val body = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Pair(true, "HTTP ${response.code} OK (${duration}ms). Endpoint active!")
                } else {
                    val msg = if (body.length > 200) body.take(200) + "..." else body
                    Pair(false, "HTTP ${response.code} Error (${duration}ms): $msg")
                }
            }
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            Pair(false, "Connection Failed (${duration}ms): ${e.localizedMessage ?: e.message}")
        }
    }

    suspend fun fetchModels(provider: AiProviderConfig): Result<List<String>> = withContext(Dispatchers.IO) {
        runCatching {
            val url = cleanUrl(provider.baseUrl, "/models")
            val requestBuilder = Request.Builder().url(url).get()
            if (provider.apiKey.isNotBlank()) {
                requestBuilder.addHeader("Authorization", "Bearer ${provider.apiKey}")
            }
            httpClient.newCall(requestBuilder.build()).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("HTTP ${response.code}: ${response.message}")
                }
                val body = response.body?.string() ?: "{}"
                val json = JSONObject(body)
                val modelsList = mutableListOf<String>()

                if (json.has("data")) {
                    val dataArray = json.getJSONArray("data")
                    for (i in 0 until dataArray.length()) {
                        val item = dataArray.getJSONObject(i)
                        val id = item.optString("id")
                        if (id.isNotBlank()) {
                            modelsList.add(id)
                        }
                    }
                } else if (json.has("models")) {
                    val dataArray = json.getJSONArray("models")
                    for (i in 0 until dataArray.length()) {
                        val item = dataArray.getJSONObject(i)
                        val name = item.optString("name")
                        if (name.isNotBlank()) {
                            modelsList.add(name)
                        }
                    }
                }
                if (modelsList.isEmpty()) {
                    listOf("gpt-4o", "gpt-4o-mini", "claude-3-7-sonnet", "deepseek-chat", "llama-3.3-70b")
                } else {
                    modelsList.sorted()
                }
            }
        }
    }

    suspend fun sendChatCompletion(
        providers: List<AiProviderConfig>,
        fallbackChain: List<FallbackModelEntry>,
        orchestrator: OrchestratorProfile,
        conversation: List<ChatMessage>,
        userPrompt: String,
        onProgress: (String) -> Unit
    ): Result<String> = withContext(Dispatchers.IO) {
        // Resolve candidate models based on routing mode and fallback list
        val candidates = resolveCandidateModels(providers, fallbackChain, orchestrator)

        var lastError: Exception? = null

        for (candidate in candidates) {
            val provider = providers.firstOrNull { it.id == candidate.providerId && it.isEnabled } ?: continue
            try {
                onProgress("Connecting to ${provider.name} [${candidate.modelId}]...")
                val result = callOpenAiCompatible(
                    provider = provider,
                    model = candidate.modelId,
                    orchestrator = orchestrator,
                    conversation = conversation,
                    userPrompt = userPrompt
                )
                return@withContext Result.success(result)
            } catch (e: Exception) {
                lastError = e
                onProgress("Fallback from ${candidate.modelId} due to: ${e.message}")
                // Continue to next candidate in fallback chain
            }
        }

        Result.failure(lastError ?: IllegalStateException("All configured models in fallback chain failed."))
    }

    private fun callOpenAiCompatible(
        provider: AiProviderConfig,
        model: String,
        orchestrator: OrchestratorProfile,
        conversation: List<ChatMessage>,
        userPrompt: String
    ): String {
        val url = cleanUrl(provider.baseUrl, "/chat/completions")

        val rootJson = JSONObject()
        rootJson.put("model", model)
        rootJson.put("temperature", 0.3)

        val messagesArray = JSONArray()

        // 1. System Prompt
        val systemPromptContent = buildString {
            append(orchestrator.systemPrompt)
            val selectedSkills = orchestrator.skills.filter { it.isSelected }
            if (selectedSkills.isNotEmpty()) {
                append("\n\nActive Skills:\n")
                for (skill in selectedSkills) {
                    append("- ").append(skill.name).append(": ").append(skill.promptSnippet).append("\n")
                }
            }
        }
        val sysObj = JSONObject()
        sysObj.put("role", "system")
        sysObj.put("content", systemPromptContent)
        messagesArray.put(sysObj)

        // 2. Prior conversation
        for (msg in conversation.takeLast(10)) {
            val msgObj = JSONObject()
            msgObj.put("role", if (msg.role == MessageRole.USER) "user" else "assistant")
            msgObj.put("content", msg.content)
            messagesArray.put(msgObj)
        }

        // 3. Current User Prompt
        val userObj = JSONObject()
        userObj.put("role", "user")
        userObj.put("content", userPrompt)
        messagesArray.put(userObj)

        rootJson.put("messages", messagesArray)

        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = rootJson.toString().toRequestBody(mediaType)

        val requestBuilder = Request.Builder()
            .url(url)
            .post(requestBody)

        if (provider.apiKey.isNotBlank()) {
            requestBuilder.addHeader("Authorization", "Bearer ${provider.apiKey}")
        }
        requestBuilder.addHeader("Content-Type", "application/json")

        httpClient.newCall(requestBuilder.build()).execute().use { response ->
            val body = response.body?.string() ?: ""
            if (!response.isSuccessful) {
                throw IllegalStateException("HTTP ${response.code}: $body")
            }
            val resJson = JSONObject(body)
            val choices = resJson.getJSONArray("choices")
            if (choices.length() > 0) {
                val firstChoice = choices.getJSONObject(0)
                val msg = firstChoice.getJSONObject("message")
                return msg.optString("content", "")
            }
            throw IllegalStateException("Empty response choices from provider")
        }
    }

    private fun resolveCandidateModels(
        providers: List<AiProviderConfig>,
        fallbackChain: List<FallbackModelEntry>,
        orchestrator: OrchestratorProfile
    ): List<CandidateModel> {
        val list = mutableListOf<CandidateModel>()

        when (orchestrator.routingMode) {
            RoutingMode.USE_SINGLE_MODEL -> {
                val primaryProvider = providers.firstOrNull { it.isEnabled }
                if (primaryProvider != null) {
                    list.add(CandidateModel(primaryProvider.id, primaryProvider.selectedModel))
                }
            }
            RoutingMode.AUTO_FREE -> {
                // Look for free or openrouter models
                for (p in providers.filter { it.isEnabled }) {
                    val freeModel = p.availableModels.firstOrNull { it.contains("free") || it.contains("openrouter") }
                        ?: p.selectedModel
                    list.add(CandidateModel(p.id, freeModel))
                }
            }
            RoutingMode.AUTO_SMALL -> {
                for (p in providers.filter { it.isEnabled }) {
                    val smallModel = p.availableModels.firstOrNull {
                        it.contains("mini") || it.contains("8b") || it.contains("haiku") || it.contains("flash")
                    } ?: p.selectedModel
                    list.add(CandidateModel(p.id, smallModel))
                }
            }
            RoutingMode.AUTO_BALANCE -> {
                for (p in providers.filter { it.isEnabled }) {
                    val balModel = p.availableModels.firstOrNull {
                        it.contains("sonnet") || it.contains("gpt-4o") || it.contains("chat")
                    } ?: p.selectedModel
                    list.add(CandidateModel(p.id, balModel))
                }
            }
            RoutingMode.AUTO_FRONTIER -> {
                for (p in providers.filter { it.isEnabled }) {
                    val frontierModel = p.availableModels.firstOrNull {
                        it.contains("o3") || it.contains("3.7") || it.contains("r1") || it.contains("opus")
                    } ?: p.selectedModel
                    list.add(CandidateModel(p.id, frontierModel))
                }
            }
        }

        // Append fallback entries up to 15
        val enabledFallbacks = fallbackChain.filter { it.isEnabled }.sortedBy { it.priority }
        for (fb in enabledFallbacks) {
            if (list.none { it.providerId == fb.providerId && it.modelId == fb.modelId }) {
                list.add(CandidateModel(fb.providerId, fb.modelId))
            }
        }

        return list.take(15)
    }

    private fun cleanUrl(baseUrl: String, endpoint: String): String {
        val base = baseUrl.trimEnd('/')
        return if (base.endsWith("/v1")) {
            "$base$endpoint"
        } else {
            "$base$endpoint"
        }
    }

    private data class CandidateModel(val providerId: String, val modelId: String)
}
