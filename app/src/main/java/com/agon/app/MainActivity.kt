package com.agon.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.agon.app.ui.WorkspaceApp
import com.agon.app.ui.theme.AgonAppTheme
import com.agon.app.viewmodel.WorkspaceViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val workspaceViewModel: WorkspaceViewModel = viewModel()
            AgonAppTheme(darkTheme = true) {
                WorkspaceApp(workspaceViewModel)
            }
        }
    }
}
