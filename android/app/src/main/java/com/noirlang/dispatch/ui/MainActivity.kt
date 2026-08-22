package com.noirlang.dispatch.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.data.model.Email
import com.noirlang.dispatch.ui.components.DispatchBottomNav
import com.noirlang.dispatch.ui.components.NavItem
import com.noirlang.dispatch.ui.screens.auth.LoginScreen
import com.noirlang.dispatch.ui.screens.auth.RegisterScreen
import com.noirlang.dispatch.ui.screens.calendar.CalendarScreen
import com.noirlang.dispatch.ui.screens.dashboard.DashboardScreen
import com.noirlang.dispatch.ui.screens.email.ComposeScreen
import com.noirlang.dispatch.ui.screens.email.EmailDetailScreen
import com.noirlang.dispatch.ui.screens.email.EmailListScreen
import com.noirlang.dispatch.ui.screens.feed.FeedScreen
import com.noirlang.dispatch.ui.screens.settings.SettingsScreen
import com.noirlang.dispatch.ui.screens.setup.ServerSetupScreen
import com.noirlang.dispatch.ui.theme.BgPrimary
import com.noirlang.dispatch.ui.theme.DispatchTheme

enum class AppState {
    SERVER_SETUP,
    LOGIN,
    REGISTER,
    MAIN
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val targetEmailId = intent.getLongExtra("email_id", -1L).takeIf { it > 0 }

        setContent {
            DispatchTheme {
                val context = LocalContext.current
                val session = remember { SessionManager.getInstance(context) }

                // Request Notification Permission on Android 13+
                val permissionLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.RequestPermission()
                ) { isGranted ->
                    // Notification permission granted or denied
                }

                LaunchedEffect(Unit) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        if (ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.POST_NOTIFICATIONS
                            ) != PackageManager.PERMISSION_GRANTED
                        ) {
                            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                    }
                }

                var currentAppState by remember {
                    mutableStateOf(
                        when {
                            !session.isServerConfigured -> AppState.SERVER_SETUP
                            !session.isLoggedIn -> AppState.LOGIN
                            else -> AppState.MAIN
                        }
                    )
                }

                var currentTab by remember { mutableStateOf(NavItem.EMAIL) }
                var activeEmailDetailId by remember { mutableStateOf<Long?>(targetEmailId) }
                var isComposing by remember { mutableStateOf(false) }
                var composeInitialTo by remember { mutableStateOf("") }
                var composeInitialSubject by remember { mutableStateOf("") }
                var composeInitialBody by remember { mutableStateOf("") }

                Box(modifier = Modifier.fillMaxSize().background(BgPrimary)) {
                    when (currentAppState) {
                        AppState.SERVER_SETUP -> {
                            ServerSetupScreen(
                                onConfigured = { currentAppState = AppState.LOGIN }
                            )
                        }

                        AppState.LOGIN -> {
                            LoginScreen(
                                onLoginSuccess = { currentAppState = AppState.MAIN },
                                onNavigateRegister = { currentAppState = AppState.REGISTER },
                                onChangeServer = { currentAppState = AppState.SERVER_SETUP }
                            )
                        }

                        AppState.REGISTER -> {
                            RegisterScreen(
                                onRegisterSuccess = { currentAppState = AppState.MAIN },
                                onNavigateLogin = { currentAppState = AppState.LOGIN }
                            )
                        }

                        AppState.MAIN -> {
                            Scaffold(
                                containerColor = BgPrimary,
                                bottomBar = {
                                    DispatchBottomNav(
                                        currentRoute = currentTab,
                                        onNavigate = { tab ->
                                            activeEmailDetailId = null
                                            currentTab = tab
                                        }
                                    )
                                }
                            ) { padding ->
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(padding)
                                ) {
                                    AnimatedContent(
                                        targetState = currentTab,
                                        transitionSpec = { fadeIn() togetherWith fadeOut() },
                                        label = "TabTransition"
                                    ) { tab ->
                                        when (tab) {
                                            NavItem.EMAIL -> {
                                                EmailListScreen(
                                                    onEmailClick = { id -> activeEmailDetailId = id },
                                                    onComposeClick = {
                                                        composeInitialTo = ""
                                                        composeInitialSubject = ""
                                                        composeInitialBody = ""
                                                        isComposing = true
                                                    },
                                                    onOpenDraft = { draft ->
                                                        composeInitialTo = draft.to ?: ""
                                                        composeInitialSubject = draft.subject ?: ""
                                                        composeInitialBody = draft.bodyText ?: draft.body ?: ""
                                                        isComposing = true
                                                    }
                                                )
                                            }
                                            NavItem.CALENDAR -> CalendarScreen()
                                            NavItem.FEED -> FeedScreen()
                                            NavItem.DASHBOARD -> DashboardScreen()
                                            NavItem.SETTINGS -> {
                                                SettingsScreen(
                                                    onLogout = { currentAppState = AppState.LOGIN }
                                                )
                                            }
                                        }
                                    }

                                    // Email Detail Overlay
                                    AnimatedVisibility(
                                        visible = activeEmailDetailId != null,
                                        enter = slideInHorizontally(initialOffsetX = { it }) + fadeIn(),
                                        exit = slideOutHorizontally(targetOffsetX = { it }) + fadeOut()
                                    ) {
                                        activeEmailDetailId?.let { emailId ->
                                            EmailDetailScreen(
                                                emailId = emailId,
                                                onBack = { activeEmailDetailId = null },
                                                onReply = { email, aiBody ->
                                                    activeEmailDetailId = null
                                                    composeInitialTo = email.from
                                                    composeInitialSubject = "Re: ${email.subject ?: ""}"
                                                    composeInitialBody = aiBody ?: "\n\n--- Orijinal İleti ---\n${email.bodyText ?: ""}"
                                                    isComposing = true
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Fullscreen Compose Modal with Enter & Exit Animations
                    AnimatedVisibility(
                        visible = isComposing,
                        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
                    ) {
                        ComposeScreen(
                            initialTo = composeInitialTo,
                            initialSubject = composeInitialSubject,
                            initialBody = composeInitialBody,
                            onDismiss = { isComposing = false }
                        )
                    }
                }
            }
        }
    }
}

