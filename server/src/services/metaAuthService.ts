import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env.js';
import prisma from '../config/db.js';
import { getPlan, getRemainingClients } from '../config/plans.js';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

const OAUTH_SCOPES = [
  'ads_read',
  'business_management',
  'pages_read_engagement',
].join(',');

interface TempSetupData {
  token: string;
  accounts: { id: string; name: string }[];
  expiresAt: number;
}

const tempStore = new Map<string, TempSetupData>();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, val] of tempStore) {
    if (val.expiresAt < now) tempStore.delete(key);
  }
}

setInterval(cleanupExpired, 5 * 60 * 1000);

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: getRedirectUri(),
    scope: OAUTH_SCOPES,
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    redirect_uri: getRedirectUri(),
    code,
  });

  const { data } = await axios.get(
    `${META_GRAPH_URL}/oauth/access_token?${params.toString()}`
  );

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const { data } = await axios.get(
    `${META_GRAPH_URL}/oauth/access_token?${params.toString()}`
  );

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getAdAccounts(accessToken: string): Promise<
  { id: string; name: string }[]
> {
  const { data } = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
    params: {
      access_token: accessToken,
      fields: 'id,name',
      limit: 100,
    },
  });

  return data.data || [];
}

export async function saveTokenToClient(
  actId: string,
  accessToken: string
): Promise<void> {
  await prisma.client.update({
    where: { actId },
    data: { accessToken },
  });
}

export async function getClientByActId(actId: string) {
  return prisma.client.findUnique({ where: { actId } });
}

export async function processOAuthCallback(code: string): Promise<{
  setupId: string;
  accounts: { id: string; name: string }[];
}> {
  const { accessToken: shortToken } = await exchangeCodeForToken(code);
  const { accessToken: longToken } = await getLongLivedToken(shortToken);
  const accounts = await getAdAccounts(longToken);

  const setupId = crypto.randomBytes(16).toString('hex');
  tempStore.set(setupId, {
    token: longToken,
    accounts,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return { setupId, accounts };
}

export function getSetupData(setupId: string): TempSetupData | undefined {
  const data = tempStore.get(setupId);
  if (!data || data.expiresAt < Date.now()) {
    tempStore.delete(setupId);
    return undefined;
  }
  return data;
}

export async function getManagerLimit(managerId: string): Promise<{
  maxClients: number | null;
  currentClients: number;
  remaining: number | null;
  planName: string;
}> {
  const manager = await prisma.manager.findUnique({
    where: { id: managerId },
    select: { plan: true, maxClients: true },
  });

  if (!manager) {
    throw new Error('Manager não encontrado.');
  }

  const currentClients = await prisma.managerClient.count({
    where: { managerId },
  });

  const planConfig = getPlan(manager.plan);
  const planMaxClients = manager.maxClients ?? planConfig.maxClients;
  
  const isUnlimited = planMaxClients === Infinity;
  const remaining = isUnlimited ? null : Math.max(0, planMaxClients - currentClients);

  return {
    maxClients: isUnlimited ? null : planMaxClients,
    currentClients,
    remaining,
    planName: planConfig.name,
  };
}

export async function importAccounts(
  managerId: string,
  setupId: string,
  selectedAccountIds: string[]
): Promise<{ imported: number; skipped: number }> {
  const setupData = tempStore.get(setupId);
  if (!setupData || setupData.expiresAt < Date.now()) {
    tempStore.delete(setupId);
    throw new Error('Sessão expirada. Conecte novamente.');
  }

  const limit = await getManagerLimit(managerId);

  const selectedAccounts = setupData.accounts.filter(a =>
    selectedAccountIds.includes(a.id)
  );

  if (limit.remaining !== null) {
    let newCount = 0;
    for (const account of selectedAccounts) {
      const existing = await prisma.managerClient.findFirst({
        where: { managerId, clientId: account.id },
      });
      if (!existing) newCount++;
    }

    if (newCount > limit.remaining) {
      throw new Error(
        `Limite do plano atingido. Você tem ${limit.currentClients}/${limit.maxClients} contas no plano ${limit.planName}. Restam ${limit.remaining} vaga${limit.remaining !== 1 ? 's' : ''}, mas você selecionou ${newCount} contas novas.`
      );
    }
  }

  let imported = 0;
  let skipped = 0;

  for (const account of selectedAccounts) {
    const existing = await prisma.client.findUnique({
      where: { actId: account.id },
    });

    if (existing) {
      await prisma.client.update({
        where: { actId: account.id },
        data: { accessToken: setupData.token },
      });
      await prisma.managerClient.upsert({
        where: { managerId_clientId: { managerId, clientId: account.id } },
        create: { managerId, clientId: account.id },
        update: {},
      });
      skipped++;
    } else {
      await prisma.client.create({
        data: {
          actId: account.id,
          clientName: account.name,
          accessToken: setupData.token,
          status: 'active',
          clientType: 'lead_gen',
          isBoleto: false,
          managerClients: {
            create: { managerId },
          },
        },
      });
      imported++;
    }
  }

  tempStore.delete(setupId);
  return { imported, skipped };
}

function getRedirectUri(): string {
  if (env.CORS_ORIGIN) {
    return `${env.CORS_ORIGIN}/api/meta/callback`;
  }
  return `http://localhost:${env.PORT}/api/meta/callback`;
}
