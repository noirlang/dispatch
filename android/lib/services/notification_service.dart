import 'package:permission_handler/permission_handler.dart';

class NotificationService {
  static Future<void> requestPermissionOnLaunch() async {
    try {
      final status = await Permission.notification.status;
      if (status.isDenied || status.isLimited) {
        await Permission.notification.request();
      }
    } catch (_) {
      // Gracefully handle platforms without notification permissions API
    }
  }
}
