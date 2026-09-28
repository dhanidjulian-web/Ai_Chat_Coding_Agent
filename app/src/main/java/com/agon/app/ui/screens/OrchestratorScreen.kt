package com.agon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.model.RoutingMode
import com.agon.app.ui.theme.*
import com.agon.app.viewmodel.WorkspaceViewModel

@Composable
fun OrchestratorScreen(
    viewModel: WorkspaceViewModel,
    modifier: Modifier = Modifier
) {
    val orchestrator = viewModel.orchestratorProfile

    var showAddEnvDialog by remember { mutableStateOf(false) }
    var showAddRepoDialog by remember { mutableStateOf(false) }
    var showAddWorkflowDialog by remember { mutableStateOf(false) }
    var showAddAgentDialog by remember { mutableStateOf(false) }

    var envKey by remember { mutableStateOf("") }
    var envVal by remember { mutableStateOf("") }
    var isEnvSecret by remember { mutableStateOf(true) }

    var repoName by remember { mutableStateOf("") }
    var repoUrl by remember { mutableStateOf("") }
    var repoBranch by remember { mutableStateOf("main") }

    var workflowTitle by remember { mutableStateOf("") }
    var workflowCmd by remember { mutableStateOf("") }

    var agentName by remember { mutableStateOf("") }
    var agentRole by remember { mutableStateOf("") }
    var agentPrompt by remember { mutableStateOf("") }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(TechDarkBackground)
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(top = 10.dp, bottom = 90.dp)
    ) {
        // 1. Profile Routing Mode Selector
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "ORCHESTRATOR ROUTING MODE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeonCyan,
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        RoutingMode.values().forEach { mode ->
                            val isSelected = orchestrator.routingMode == mode
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) NeonCyan.copy(alpha = 0.15f) else TechDarkSurfaceVariant,
                                border = if (isSelected) ButtonDefaults.outlinedButtonBorder.copy(
                                    brush = androidx.compose.ui.graphics.SolidColor(NeonCyan)
                                ) else null,
                                onClick = { viewModel.updateRoutingMode(mode) }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    RadioButton(
                                        selected = isSelected,
                                        onClick = { viewModel.updateRoutingMode(mode) },
                                        colors = RadioButtonDefaults.colors(selectedColor = NeonCyan)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Column {
                                        Text(
                                            text = mode.label,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) NeonCyan else TextPrimary
                                        )
                                        Text(
                                            text = mode.description,
                                            fontSize = 10.sp,
                                            color = TextSecondary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. System Prompt with 12,000 Char Counter & Validator
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "SYSTEM PROMPT DIRECTIVE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = NeonCyan,
                            letterSpacing = 1.sp
                        )

                        Text(
                            text = "${orchestrator.systemPrompt.length} / 12,000",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = if (orchestrator.systemPrompt.length > 11000) NeonRose else NeonCyan
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = orchestrator.systemPrompt,
                        onValueChange = { viewModel.updateOrchestratorPrompt(it) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 90.dp, max = 160.dp),
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = TerminalBlack,
                            unfocusedContainerColor = TerminalBlack,
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = TechDarkBorder
                        )
                    )
                }
            }
        }

        // 3. Dev Skills Library
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "DEV SKILLS INJECTION",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeonViolet,
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        orchestrator.skills.forEach { skill ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                color = TechDarkSurfaceVariant,
                                onClick = { viewModel.toggleSkill(skill.id) }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = skill.name,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (skill.isSelected) NeonCyan else TextPrimary
                                        )
                                        Text(
                                            text = skill.description,
                                            fontSize = 10.sp,
                                            color = TextSecondary
                                        )
                                    }

                                    Checkbox(
                                        checked = skill.isSelected,
                                        onCheckedChange = { viewModel.toggleSkill(skill.id) },
                                        colors = CheckboxDefaults.colors(checkedColor = NeonCyan)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Environment Variables & Secrets Manager
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "SECRETS & ENVIRONMENT VARIABLES",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = NeonAmber,
                            letterSpacing = 1.sp
                        )

                        IconButton(
                            onClick = {
                                envKey = ""
                                envVal = ""
                                showAddEnvDialog = true
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add Env", tint = NeonAmber)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        orchestrator.envVars.forEach { env ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(6.dp),
                                color = TechDarkSurfaceVariant
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = env.key,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = NeonCyan,
                                            fontFamily = FontFamily.Monospace
                                        )
                                        Text(
                                            text = if (env.isSecret) "••••••••••••••••" else env.value,
                                            fontSize = 10.sp,
                                            color = TextMuted,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }

                                    IconButton(
                                        onClick = { viewModel.removeSecretEnvVar(env.id) },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(Icons.Default.Close, contentDescription = "Remove", tint = TextMuted, modifier = Modifier.size(14.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Workflows Pipeline (Multi-Step Execution)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "WORKFLOW AUTOMATION PIPELINES",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = NeonEmerald,
                            letterSpacing = 1.sp
                        )

                        IconButton(
                            onClick = {
                                workflowTitle = ""
                                workflowCmd = ""
                                showAddWorkflowDialog = true
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add Step", tint = NeonEmerald)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        orchestrator.workflowSteps.forEach { step ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                color = TechDarkSurfaceVariant
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Step ${step.stepNumber}: ${step.title}",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Text(
                                            text = step.command.lines().firstOrNull() ?: "",
                                            fontSize = 10.sp,
                                            color = TerminalGreen,
                                            fontFamily = FontFamily.Monospace,
                                            maxLines = 1
                                        )
                                    }

                                    IconButton(
                                        onClick = { viewModel.executeWorkflowStep(step) },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Default.PlayArrow, contentDescription = "Run", tint = NeonEmerald)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 6. Agent Swarm (Max 35 Agents)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = TechDarkSurface),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TechDarkBorder))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "AGENT SWARM ORCHESTRATION",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = NeonCyan,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "${orchestrator.swarmAgents.size} / 35 Configured Agents",
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }

                        IconButton(
                            onClick = {
                                agentName = ""
                                agentRole = ""
                                agentPrompt = ""
                                showAddAgentDialog = true
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add Agent", tint = NeonCyan)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        orchestrator.swarmAgents.forEach { agent ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                color = TechDarkSurfaceVariant
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = agent.name,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = NeonCyan
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = TechDarkSurface
                                            ) {
                                                Text(
                                                    text = agent.role,
                                                    fontSize = 9.sp,
                                                    color = NeonEmerald,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        }
                                        Text(
                                            text = agent.briefPrompt,
                                            fontSize = 10.sp,
                                            color = TextSecondary,
                                            maxLines = 1
                                        )
                                    }

                                    IconButton(
                                        onClick = { viewModel.removeSwarmAgent(agent.id) },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(Icons.Default.Close, contentDescription = "Remove", tint = TextMuted, modifier = Modifier.size(14.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Dialogs
    if (showAddEnvDialog) {
        AlertDialog(
            onDismissRequest = { showAddEnvDialog = false },
            title = { Text("Add Environment Secret", color = NeonAmber, fontSize = 14.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(value = envKey, onValueChange = { envKey = it }, label = { Text("Key (e.g. AWS_SECRET)") })
                    OutlinedTextField(value = envVal, onValueChange = { envVal = it }, label = { Text("Value") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.addSecretEnvVar(envKey, envVal, isEnvSecret)
                        showAddEnvDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonAmber)
                ) {
                    Text("Add", color = Color.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddEnvDialog = false }) { Text("Cancel", color = TextSecondary) }
            },
            containerColor = TechDarkSurface
        )
    }

    if (showAddWorkflowDialog) {
        AlertDialog(
            onDismissRequest = { showAddWorkflowDialog = false },
            title = { Text("Add Workflow Step", color = NeonEmerald, fontSize = 14.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(value = workflowTitle, onValueChange = { workflowTitle = it }, label = { Text("Title") })
                    OutlinedTextField(value = workflowCmd, onValueChange = { workflowCmd = it }, label = { Text("Shell Command") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.addWorkflowStep(workflowTitle, workflowCmd)
                        showAddWorkflowDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonEmerald)
                ) {
                    Text("Add Step", color = Color.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddWorkflowDialog = false }) { Text("Cancel", color = TextSecondary) }
            },
            containerColor = TechDarkSurface
        )
    }

    if (showAddAgentDialog) {
        AlertDialog(
            onDismissRequest = { showAddAgentDialog = false },
            title = { Text("Add Swarm Agent", color = NeonCyan, fontSize = 14.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(value = agentName, onValueChange = { agentName = it }, label = { Text("Agent Name") })
                    OutlinedTextField(value = agentRole, onValueChange = { agentRole = it }, label = { Text("Specialization / Role") })
                    OutlinedTextField(value = agentPrompt, onValueChange = { agentPrompt = it }, label = { Text("Brief System Prompt") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.addSwarmAgent(agentName, agentRole, agentPrompt, "auto-balance")
                        showAddAgentDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonCyan)
                ) {
                    Text("Register Agent", color = Color.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddAgentDialog = false }) { Text("Cancel", color = TextSecondary) }
            },
            containerColor = TechDarkSurface
        )
    }
}
