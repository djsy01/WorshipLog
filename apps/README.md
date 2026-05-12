# WorshipLog – App (Flutter)

Flutter 기반 iOS / Android 모바일 앱

---

## 기술 스택

| 항목       | 기술                                             |
| ---------- | ------------------------------------------------ |
| Framework  | Flutter 3.x (Dart)                               |
| 상태 관리  | flutter_riverpod 2.x (StateNotifier)             |
| 라우팅     | go_router 14.x                                   |
| HTTP       | dio 5.x (자동 토큰 갱신 인터셉터)               |
| 토큰 저장  | flutter_secure_storage (Keychain / Keystore)     |
| 다크모드   | ThemeMode.system — 시스템 설정 자동 적용         |
| 푸시 알림  | firebase_messaging + flutter_local_notifications |

---

## 디렉토리 구조

```text
apps/lib/
├── core/
│   ├── constants.dart              # API URL (String.fromEnvironment)
│   ├── token_storage.dart          # JWT 안전 저장 (FlutterSecureStorage 래퍼)
│   ├── api_client.dart             # Dio 인스턴스 + 401 자동 토큰 갱신 인터셉터
│   ├── notification_service.dart   # FCM 초기화 + 로컬 알림
│   └── unread_service.dart         # 채팅 방별 미읽음 카운트 (ValueNotifier 싱글톤)
├── firebase_options.dart           # DefaultFirebaseOptions (iOS / Android)
├── features/
│   ├── auth/
│   │   ├── models/
│   │   ├── providers/
│   │   │   └── auth_provider.dart  # AuthNotifier (login / register / logout)
│   │   └── screens/
│   │       ├── login_screen.dart
│   │       └── register_screen.dart
│   ├── home/                       # 홈 (오늘의 말씀, 최근 콘티)
│   ├── songs/                      # 찬양 목록 & 검색
│   ├── contis/                     # 콘티 목록 & 상세 & 편집
│   ├── teams/                      # 팀스페이스 & 채팅
│   └── shell/
│       └── screens/shell_screen.dart  # 하단 NavigationBar + 중첩 Navigator
└── main.dart                       # ProviderScope + GoRouter + Firebase 초기화
```

---

## 환경 설정

API URL은 빌드 시 `--dart-define-from-file=env.json`으로 주입합니다.

**`apps/env.json`** (gitignored):

```json
{
  "API_URL": "<백엔드 API 서버 주소>/api"
}
```

**`apps/lib/core/constants.dart`**:

```dart
const String kApiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3000/api',
);
```

VS Code에서는 `.vscode/launch.json`에 설정되어 있으므로 F5로 자동 적용됩니다.

---

## Firebase 설정

`firebase_core ^3.x`부터 `Firebase.initializeApp()` 단독 호출은 동작하지 않습니다.
반드시 `DefaultFirebaseOptions`를 명시적으로 전달해야 합니다.

```dart
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

- iOS: `GoogleService-Info.plist` + `apps/lib/firebase_options.dart`
- Android: `google-services.json` + `apps/lib/firebase_options.dart`

---

## 실행 방법

```bash
# 의존성 설치
flutter pub get

# 실기기 실행 (env.json 포함)
flutter run --dart-define-from-file=env.json

# 특정 디바이스 지정
flutter devices
flutter run -d <device-id> --dart-define-from-file=env.json

# 릴리즈 빌드
flutter build apk --dart-define-from-file=env.json
flutter build ios --dart-define-from-file=env.json
```

---

## 인증 플로우

```text
앱 시작 → _checkAuth() → SecureStorage 토큰 확인
         ↓ 없음                  ↓ 있음
    /login 화면             /home (ShellScreen)
         ↓
  로그인 성공 → JWT 저장 → FCM 토큰 서버 등록 → /home
```

| 저장 키        | 내용                     |
| -------------- | ------------------------ |
| `accessToken`  | JWT Access Token (15분)  |
| `refreshToken` | JWT Refresh Token (30일) |
| `user`         | 사용자 정보 JSON         |

토큰 만료 시 Dio 인터셉터가 자동으로 `/auth/refresh` 호출 후 재시도.

---

## GoRouter 라우팅

```dart
redirect: (context, state) {
  if (isUnknown) return '/splash';              // 토큰 확인 중
  if (!isAuth && !isAuthRoute) return '/login'; // 미인증 → 로그인
  if (isAuth && isAuthRoute) return '/home';    // 인증됨 → 홈
  return null;
}
```

| 경로          | 화면             |
| ------------- | ---------------- |
| `/splash`     | 로딩 인디케이터  |
| `/login`      | 로그인           |
| `/register`   | 회원가입         |
| `/home`       | ShellScreen (탭) |
| `/contis/:id` | 콘티 상세        |

---

## 구현된 기능

### 인증

- 로그인 / 회원가입 / 로그아웃
- JWT 자동 갱신 (Dio 인터셉터)
- flutter_secure_storage 영구 저장

### 홈

- 오늘의 말씀 카드
- 최근 콘티 목록
- 빠른 액션 버튼

### 찬양

- 목록 조회 및 검색
- 상세 정보 표시

### 콘티

- 목록 / 상세 / 편집
- 악보 갤러리·PDF 업로드 (다중 선택)
- 악보 가로 스와이프 PageView
- PDF 내보내기 (네이티브 인쇄 다이얼로그)
- 콘티 복제 기능

### 팀스페이스

- 팀 목록 및 채팅
- 채팅 안읽음 뱃지 (방 목록 실시간 표시 — `UnreadService`)

### 푸시 알림 (FCM)

- 포그라운드: 로컬 알림으로 표시 + 해당 방 미읽음 카운트 증가
- 백그라운드: FCM 자동 표시
- 로그인 시 FCM 토큰 서버 등록

---

## API 엔드포인트 연결

서버 API 문서: [server/README.md](../server/README.md)
