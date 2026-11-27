import { ForbiddenException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from './rooms.service';

it('조직 멤버만 채팅 스트림을 열 수 있다', async () => {
  const prisma = {
    room: { findUnique: jest.fn().mockResolvedValue({ orgId: 'org' }) },
    orgMember: { findUnique: jest.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;
  const rooms = new RoomsService(prisma, {} as NotificationsService);
  const expiry = Math.floor(Date.now() / 1000) + 60;
  await expect(rooms.getMessageStream('other', 'room', expiry)).rejects.toThrow(
    ForbiddenException,
  );
  await expect(
    rooms.getOrgMessageStream('other', 'org', expiry),
  ).rejects.toThrow(ForbiddenException);
});

it('멤버 자격을 잃으면 열린 채팅 스트림으로 새 메시지를 받지 못한다', async () => {
  const findUnique = jest.fn().mockResolvedValueOnce({ userId: 'member' });
  const prisma = { orgMember: { findUnique } } as unknown as PrismaService;
  const rooms = new RoomsService(prisma, {} as NotificationsService);
  const expiry = Math.floor(Date.now() / 1000) + 60;
  const stream = await rooms.getOrgMessageStream('member', 'org', expiry);
  const event = firstValueFrom(stream, { defaultValue: null });
  rooms['getOrgStream']('org').next({ data: '보호된 메시지' });
  await expect(event).resolves.toBeNull();
});
