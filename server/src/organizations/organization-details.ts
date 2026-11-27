import { Prisma } from '@prisma/client';

export const organizationDetails = {
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  rooms: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  },
} satisfies Prisma.OrganizationInclude;
