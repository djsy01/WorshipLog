import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_client.dart';
import 'unread_service.dart';

// 백그라운드 메시지 핸들러 — 최상위 함수여야 함
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // 백그라운드에서 알림은 FCM이 자동으로 표시
}

class NotificationService {
  static final _flnp = FlutterLocalNotificationsPlugin();
  static const _channel = AndroidNotificationChannel(
    'chat_messages',
    '채팅 메시지',
    description: '팀스페이스 채팅 메시지 알림',
    importance: Importance.high,
  );

  static Future<void> init() async {
    // Android 채널 생성
    await _flnp
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    // 로컬 알림 초기화
    await _flnp.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );

    // 백그라운드 핸들러 등록
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // 포그라운드 메시지 → 미읽음 카운트 증가 + 로컬 알림 표시
    FirebaseMessaging.onMessage.listen((message) {
      final roomId = message.data['roomId'];
      if (roomId != null) UnreadService.increment(roomId);

      final notification = message.notification;
      if (notification == null) return;
      _flnp.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channel.id,
            _channel.name,
            channelDescription: _channel.description,
            icon: '@mipmap/ic_launcher',
          ),
          iOS: const DarwinNotificationDetails(),
        ),
      );
    });

    // iOS 권한 요청
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  static Future<String?> getToken() => FirebaseMessaging.instance.getToken();

  static Future<void> saveTokenToServer(String token) async {
    try {
      await dio.patch('auth/fcm-token', data: {'token': token});
    } catch (_) {}
  }

  static void onTokenRefresh() {
    FirebaseMessaging.instance.onTokenRefresh.listen((token) {
      saveTokenToServer(token);
    });
  }
}
