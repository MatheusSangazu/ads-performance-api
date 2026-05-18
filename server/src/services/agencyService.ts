import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { ManagerRole } from '../generated/prisma/client.js';

async function getAgencyMembers(agencyId: string) {
  return prisma.manager.findMany({
    where: { agencyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      managerClients: { select: { clientId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function inviteMember(agencyId: string, name: string, email: string, password: string) {
  const existing = await prisma.manager.findUnique({ where: { email } });
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const agency = await prisma.manager.findUnique({
    where: { id: agencyId },
    select: { plan: true, agencyMembers: { select: { id: true } } },
  });

  if (!agency) throw new Error('AGENCY_NOT_FOUND');

  const plan = await import('../config/plans.js').then(m => m.getPlan(agency.plan));
  if (agency.agencyMembers.length >= plan.maxSeats) {
    throw new Error('SEAT_LIMIT');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.manager.create({
    data: {
      id: randomUUID(),
      name,
      email,
      passwordHash,
      role: ManagerRole.manager,
      plan: agency.plan,
      agencyId,
      maxClients: plan.maxClients === Infinity ? null : plan.maxClients,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

async function removeMember(agencyId: string, memberId: string) {
  const member = await prisma.manager.findFirst({
    where: { id: memberId, agencyId },
  });

  if (!member) throw new Error('MEMBER_NOT_FOUND');

  await prisma.manager.delete({ where: { id: memberId } });
  return { success: true };
}

async function getAgencyConsolidated(agencyId: string) {
  const members = await prisma.manager.findMany({
    where: { agencyId },
    select: {
      id: true,
      name: true,
      managerClients: {
        select: {
          client: {
            select: {
              actId: true,
              clientName: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return members.map(m => ({
    id: m.id,
    name: m.name,
    clientCount: m.managerClients.length,
    clients: m.managerClients.map(mc => mc.client),
  }));
}

export default {
  getAgencyMembers,
  inviteMember,
  removeMember,
  getAgencyConsolidated,
};
