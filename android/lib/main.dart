import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/email_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/calendar_provider.dart';
import 'providers/rss_provider.dart';
import 'providers/settings_provider.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';
import 'views/auth/server_connect_view.dart';
import 'views/auth/auth_view.dart';
import 'views/main_shell.dart';

class CustomHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  HttpOverrides.global = CustomHttpOverrides();

  // Request notification permissions on launch as requested
  await NotificationService.requestPermissionOnLaunch();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initialize()),
        ChangeNotifierProvider(create: (_) => EmailProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => CalendarProvider()),
        ChangeNotifierProvider(create: (_) => RssProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
      ],
      child: const DispatchApp(),
    ),
  );
}

class DispatchApp extends StatelessWidget {
  const DispatchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dispatch',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const RootGatekeeper(),
    );
  }
}

class RootGatekeeper extends StatelessWidget {
  const RootGatekeeper({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    switch (auth.status) {
      case AuthStatus.uninitialized:
        return const Scaffold(
          backgroundColor: AppTheme.bgPrimary,
          body: Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.textMuted),
            ),
          ),
        );

      case AuthStatus.needsServer:
        return const ServerConnectView();

      case AuthStatus.unauthenticated:
        return const AuthView();

      case AuthStatus.authenticated:
        return const MainShell();
    }
  }
}
