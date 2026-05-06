# WorshipLog – App (Flutter)

Flutter 기반 iOS / Android 모바일 앱

---

## 기술 스택

| 항목       | 기술                                          |
| ---------- | --------------------------------------------- |
| Framework  | Flutter 3.x (Dart)                            |
| 상태 관리  | flutter_riverpod 2.x (StateNotifier)          |
| 라우팅     | go_router 14.x                                |
| HTTP       | dio 5.x (자동 토큰 갱신 인터셉터)             |
| 토큰 저장  | flutter_secure_storage (Keychain / Keystore)  |
| 다크모드   | ThemeMode.system — 시스템 설정 자동 적용      |

---

## 디렉토리 구조

```text
apps/lib/
├── core/
│   ├── constants.dart        # API URL (Android 에뮬레이터 / iOS 분기)
│   ├── token_storage.dart    # JWT 안전 저장 (FlutterSecureStorage 래퍼)
│   └── api_client.dart       # Dio 인스턴스 + 401 자동 토큰 갱신 인터셉터
├── features/
│   ├── auth/
│   │   ├── models/
│   │   │   └── auth_response.dart
│   │   ├── providers/
│   │   │   └── auth_provider.dart   # AuthNotifier (login / register / logout)
│   │   └── screens/
│   │       ├── login_screen.dart
│   │       └── register_screen.dart
│   ├── songs/                # 찬양 목록 & 검색 (예정)
│   ├── contis/               # 콘티 목록 & 상세 (예정)
│   └── teams/                # 팀 관리 (예정)
└── main.dart                 # ProviderScope + GoRouter + 테마 설정
```

---

## 환경 설정

**Android 에뮬레이터** — `lib/core/constants.dart` 에서 자동 분기:

```dart
final String kApiUrl = Platform.isAndroid
    ? 'http://10.0.2.2:3000/api'   // 에뮬레이터 → 호스트 localhost
    : 'http://localhost:3000/api';  // iOS 시뮬레이터
```

실기기에서 테스트할 경우 Mac의 로컬 IP로 변경 필요 (예: `http://192.168.x.x:3000/api`).

---

## 실행 방법

```bash
# 의존성 설치
flutter pub get

# iOS 시뮬레이터
open -a Simulator
flutter run

# Android 에뮬레이터 (Android Studio에서 AVD 실행 후)
flutter run

# 특정 디바이스 지정
flutter devices
flutter run -d <device-id>
```

---

## 인증 플로우

```text
회원가입 → 이메일 인증 안내 다이얼로그
                ↓
       이메일 링크 클릭 (웹 처리)
                ↓
          로그인 화면
                ↓
     JWT 저장 (FlutterSecureStorage)
                ↓
          홈 화면 이동
```

| 저장 키         | 내용                      |
| --------------- | ------------------------- |
| `accessToken`   | JWT Access Token (15분)   |
| `refreshToken`  | JWT Refresh Token (7일)   |

토큰 만료 시 Dio 인터셉터가 자동으로 `/auth/refresh` 호출 후 재시도.

---

## 구현된 기능

### 인증

- 로그인 / 회원가입
- 이메일 인증 안내
- JWT 자동 갱신 (Dio 인터셉터)
- 로그아웃

### 예정

- 찬양 목록 & 검색
- 콘티 목록 & 상세
- 팀 관리

---

## API 엔드포인트 연결

서버 API 문서: [server/README.md](../server/README.md)
