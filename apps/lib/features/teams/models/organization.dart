class OrgMember {
  final String id;
  final String userId;
  final String role;
  final String name;
  final String email;

  const OrgMember({
    required this.id,
    required this.userId,
    required this.role,
    required this.name,
    required this.email,
  });

  factory OrgMember.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    return OrgMember(
      id: json['id'] as String,
      userId: json['userId'] as String,
      role: json['role'] as String,
      name: user['name'] as String,
      email: user['email'] as String,
    );
  }
}

class OrgRoom {
  final String id;
  final String name;
  final String? description;

  const OrgRoom({required this.id, required this.name, this.description});

  factory OrgRoom.fromJson(Map<String, dynamic> json) => OrgRoom(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
      );
}

class Organization {
  final String id;
  final String name;
  final String? description;
  final String createdBy;
  final List<OrgMember> members;
  final List<OrgRoom> rooms;

  const Organization({
    required this.id,
    required this.name,
    this.description,
    required this.createdBy,
    required this.members,
    required this.rooms,
  });

  factory Organization.fromJson(Map<String, dynamic> json) => Organization(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        createdBy: json['createdBy'] as String,
        members: (json['members'] as List)
            .map((e) => OrgMember.fromJson(e as Map<String, dynamic>))
            .toList(),
        rooms: (json['rooms'] as List)
            .map((e) => OrgRoom.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class Message {
  final String id;
  final String roomId;
  final String userId;
  final String content;
  final String? fileUrl;
  final DateTime createdAt;
  final String userName;

  const Message({
    required this.id,
    required this.roomId,
    required this.userId,
    required this.content,
    this.fileUrl,
    required this.createdAt,
    required this.userName,
  });

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as String,
        roomId: json['roomId'] as String,
        userId: json['userId'] as String,
        content: json['content'] as String,
        fileUrl: json['fileUrl'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        userName: (json['user'] as Map<String, dynamic>)['name'] as String,
      );
}

class PendingInvite {
  final String id;
  final String orgId;
  final DateTime expiresAt;
  final String orgName;
  final String? orgDescription;
  final String creatorName;

  const PendingInvite({
    required this.id,
    required this.orgId,
    required this.expiresAt,
    required this.orgName,
    this.orgDescription,
    required this.creatorName,
  });

  factory PendingInvite.fromJson(Map<String, dynamic> json) {
    final org = json['org'] as Map<String, dynamic>;
    final creator = json['creator'] as Map<String, dynamic>;
    return PendingInvite(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      orgName: org['name'] as String,
      orgDescription: org['description'] as String?,
      creatorName: creator['name'] as String,
    );
  }
}
