import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:dispatch/main.dart';
import 'package:dispatch/providers/auth_provider.dart';
import 'package:dispatch/providers/email_provider.dart';
import 'package:dispatch/providers/dashboard_provider.dart';
import 'package:dispatch/providers/calendar_provider.dart';
import 'package:dispatch/providers/rss_provider.dart';
import 'package:dispatch/providers/settings_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => EmailProvider()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
          ChangeNotifierProvider(create: (_) => CalendarProvider()),
          ChangeNotifierProvider(create: (_) => RssProvider()),
          ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ],
        child: const DispatchApp(),
      ),
    );
    expect(find.byType(DispatchApp), findsOneWidget);
  });
}
