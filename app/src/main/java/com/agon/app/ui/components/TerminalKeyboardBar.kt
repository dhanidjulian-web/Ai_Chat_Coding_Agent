package com.agon.app.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agon.app.ui.theme.*

@Composable
fun TerminalKeyboardBar(
    onKeyPress: (String) -> Unit,
    onHistoryUp: () -> Unit,
    onHistoryDown: () -> Unit,
    onTabPress: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = TechDarkSurfaceVariant,
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 6.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            KeyChip(text = "ESC", onClick = { onKeyPress("\u001B") })
            KeyChip(text = "TAB", onClick = onTabPress, highlight = true)
            KeyChip(text = "CTRL", onClick = { onKeyPress("CTRL") })
            KeyChip(text = "ALT", onClick = { onKeyPress("ALT") })
            KeyChip(text = "|", onClick = { onKeyPress("|") }, highlight = true)
            KeyChip(text = "/", onClick = { onKeyPress("/") })
            KeyChip(text = "-", onClick = { onKeyPress("-") })
            KeyChip(text = "~", onClick = { onKeyPress("~") })
            KeyChip(text = "$", onClick = { onKeyPress("$") })
            KeyChip(text = ";", onClick = { onKeyPress(";") })
            KeyChip(text = "&", onClick = { onKeyPress("&") })
            KeyChip(text = ">", onClick = { onKeyPress(">") })
            KeyChip(text = "▲", onClick = onHistoryUp, highlight = true)
            KeyChip(text = "▼", onClick = onHistoryDown, highlight = true)
        }
    }
}

@Composable
private fun KeyChip(
    text: String,
    onClick: () -> Unit,
    highlight: Boolean = false
) {
    FilledTonalButton(
        onClick = onClick,
        shape = RoundedCornerShape(6.dp),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = if (highlight) NeonCyan.copy(alpha = 0.2f) else TechDarkSurface,
            contentColor = if (highlight) NeonCyan else TextPrimary
        ),
        modifier = Modifier.height(32.dp)
    ) {
        Text(
            text = text,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp
        )
    }
}
