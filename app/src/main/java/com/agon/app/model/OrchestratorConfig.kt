package com.agon.app.model

import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class SecretEnvVar(
    val id: String = UUID.randomUUID().toString(),
    val key: String,
    val value: String,
    val isSecret: Boolean = true
)

@Serializable
data class DevSkill(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    val promptSnippet: String,
    val isSelected: Boolean = false
)

@Serializable
data class PinnedRepo(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val url: String,
    val branch: String = "main",
    val localPath: String = ""
)

@Serializable
data class WorkflowStep(
    val id: String = UUID.randomUUID().toString(),
    val stepNumber: Int,
    val title: String,
    val command: String,
    val stopOnError: Boolean = true,
    val runInSandbox: Boolean = true
)

@Serializable
data class ConnectorConfig(
    val id: String = UUID.randomUUID().toString(),
    val type: String, // GitHub, Git-SSH, HTTP-Webhook, SQLite
    val name: String,
    val endpointOrTarget: String,
    val isConnected: Boolean = false
)

@Serializable
data class SwarmAgent(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val role: String,
    val briefPrompt: String,
    val assignedModel: String,
    val isEnabled: Boolean = true
)

@Serializable
data class OrchestratorProfile(
    val id: String = "default_profile",
    val profileName: String = "DevOps Fullstack Orchestrator",
    val routingMode: RoutingMode = RoutingMode.AUTO_BALANCE,
    val systemPrompt: String = "You are an elite DevOps & Software Engineering AI Assistant. You have deep expertise in Linux systems, bash scripting, containerization, debugging, and secure system architectures. Provide precise, production-ready code with complete explanations.",
    val envVars: List<SecretEnvVar> = emptyList(),
    val skills: List<DevSkill> = emptyList(),
    val autoSkillSelection: Boolean = true,
    val pinnedRepos: List<PinnedRepo> = emptyList(),
    val workflowSteps: List<WorkflowStep> = emptyList(),
    val connectors: List<ConnectorConfig> = emptyList(),
    val swarmAgents: List<SwarmAgent> = emptyList()
)
