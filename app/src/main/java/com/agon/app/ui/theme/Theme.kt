package com.agon.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = NeonCyan,
    onPrimary = Color(0xFF002830),
    primaryContainer = Color(0xFF004455),
    onPrimaryContainer = Color(0xFF80F0FF),

    secondary = NeonEmerald,
    onSecondary = Color(0xFF003822),
    secondaryContainer = Color(0xFF065F46),
    onSecondaryContainer = Color(0xFF6EE7B7),

    tertiary = NeonViolet,
    onTertiary = Color(0xFF2A085C),
    tertiaryContainer = Color(0xFF4C1D95),
    onTertiaryContainer = Color(0xFFDDD6FE),

    background = TechDarkBackground,
    onBackground = TextPrimary,

    surface = TechDarkSurface,
    onSurface = TextPrimary,
    surfaceVariant = TechDarkSurfaceVariant,
    onSurfaceVariant = TextSecondary,

    outline = TechDarkBorder,
    outlineVariant = TechDarkOutlineVariant,

    error = NeonRose,
    onError = Color(0xFF4C0519)
)

private val LightColorScheme = darkColorScheme(
    primary = NeonCyan,
    background = TechDarkBackground,
    surface = TechDarkSurface
)

@Composable
fun AgonAppTheme(
    darkTheme: Boolean = true,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
