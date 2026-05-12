import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) throw UnsupportedError('Web is not supported.');
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.android:
        return android;
      default:
        throw UnsupportedError('Unsupported platform.');
    }
  }

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBXgjcIA5JYJfgAQ_9r6QPxcPkjgrJDnRU',
    appId: '1:95411766290:ios:0f73e3b99895baaed784cb',
    messagingSenderId: '95411766290',
    projectId: 'worshiplog-181f8',
    storageBucket: 'worshiplog-181f8.firebasestorage.app',
    iosBundleId: 'com.worshiplog.apps',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBro1R27Prcj4rjG7RGnIep4jRlBx0A3Xc',
    appId: '1:95411766290:android:fe152e014937670ad784cb',
    messagingSenderId: '95411766290',
    projectId: 'worshiplog-181f8',
    storageBucket: 'worshiplog-181f8.firebasestorage.app',
  );
}
