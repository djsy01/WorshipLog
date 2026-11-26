import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const include = {
  song: true,
  sheets: { orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.ContiSongInclude;

export function getContiSongWithSheets(
  tx: Prisma.TransactionClient,
  id: string,
) {
  return tx.contiSong.findUniqueOrThrow({ where: { id }, include });
}

export async function lockContiSong(
  tx: Prisma.TransactionClient,
  userId: string,
  contiId: string,
  songId: string,
) {
  const [song] = await tx.$queryRaw<{ id: string }[]>`
    SELECT cs.id FROM conti_songs cs JOIN contis c ON c.id = cs.conti_id
    WHERE cs.id = ${songId} AND c.id = ${contiId} AND c.created_by = ${userId}
    FOR UPDATE OF cs, c
  `;
  if (!song) throw new NotFoundException('콘티 곡을 찾을 수 없습니다.');
}
