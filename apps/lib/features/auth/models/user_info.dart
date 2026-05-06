class UserInfo {
  final String id;
  final String email;
  final String name;
  final String role;
  final String? profileImageUrl;

  UserInfo({
    required this.id,
    required this.email,
    required this.name,
    this.role = 'user',
    this.profileImageUrl,
  });

  factory UserInfo.fromJson(Map<String, dynamic> json) => UserInfo(
    id: json['id'] as String,
    email: json['email'] as String,
    name: json['name'] as String,
    role: json['role'] as String? ?? 'user',
    profileImageUrl: json['profileImageUrl'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'role': role,
    'profileImageUrl': profileImageUrl,
  };
}
