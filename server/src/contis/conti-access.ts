import { Prisma } from '@prisma/client';

export function accessibleConti(userId: string) {
  return {
    OR: [
      { createdBy: userId },
      {
        shares: { some: { room: { org: { members: { some: { userId } } } } } },
      },
    ],
  } satisfies Prisma.ContiWhereInput;
}
