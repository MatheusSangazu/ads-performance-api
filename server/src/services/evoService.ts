import { env } from '../config/env.js';
import prisma from '../config/db.js';

class EvoService {
  private get baseUrl(): string {
    return (env.EVO_API_URL || '').replace(/\/+$/, '');
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: env.EVO_API_KEY || '',
    };
  }

  private get instance(): string {
    return env.EVO_INSTANCE_NAME || '';
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && env.EVO_API_KEY && env.EVO_INSTANCE_NAME);
  }

  private normalizeDestination(destination: string, type: 'phone' | 'group'): string {
    if (type === 'group') {
      const groupId = destination.trim().replace(/\s/g, '');
      return groupId.endsWith('@g.us') ? groupId : `${groupId}@g.us`;
    }

    const number = destination.replace(/\D/g, '');
    return `${number}@s.whatsapp.net`;
  }

  public async sendTextToDestination(
    destination: string,
    type: 'phone' | 'group',
    text: string,
  ): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const res = await fetch(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            number: this.normalizeDestination(destination, type),
            text,
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        console.error(`[EVO] Erro ${res.status}: ${body}`);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[EVO] Falha ao enviar mensagem:', err);
      return false;
    }
  }

  public async sendText(phone: string, text: string): Promise<boolean> {
    return this.sendTextToDestination(phone, 'phone', text);
  }

  // A Evolution API pode levar mais de 1 minuto para listar grupos — a lista fica no banco
  // e só é renovada explicitamente (refresh) ou quando estiver estale no boot.
  private refreshingGroups = false;

  public async getGroups(): Promise<{ id: string; name: string }[]> {
    if (!this.isConfigured) return [];

    const res = await fetch(
      `${this.baseUrl}/group/fetchAllGroups/${this.instance}?getParticipants=false`,
      { headers: this.headers },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Evolution API retornou ${res.status}: ${body}`);
    }

    const payload = await res.json() as unknown;
    const groups = Array.isArray(payload)
      ? payload
      : typeof payload === 'object' && payload !== null && Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : [];

    const mapped = groups
      .map((group) => {
        const item = group as Record<string, unknown>;
        const id = String(item.id || item.remoteJid || item.jid || '').trim();
        const name = String(item.subject || item.name || id || 'Grupo sem nome').trim();
        return { id, name };
      })
      .filter((group) => group.id.endsWith('@g.us'))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return mapped;
  }

  public async listGroups(): Promise<{ id: string; name: string }[]> {
    const rows = await prisma.whatsappGroup.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => ({ id: row.id, name: row.name }));
  }

  public async getLastSyncedAt(): Promise<Date | null> {
    const row = await prisma.whatsappGroup.findFirst({
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    });
    return row?.syncedAt ?? null;
  }

  // Dispara o refresh em background (a listagem na Evolution pode demorar ~1 min).
  // Retorna false se já houver um refresh em andamento.
  public async refreshGroups(): Promise<boolean> {
    if (this.refreshingGroups) return false;
    if (!this.isConfigured) return false;

    this.refreshingGroups = true;
    void (async () => {
      try {
        const groups = await this.getGroups();
        await prisma.$transaction([
          prisma.whatsappGroup.deleteMany(),
          prisma.whatsappGroup.createMany({
            data: groups.map((group) => ({ id: group.id, name: group.name })),
          }),
        ]);
        console.log(`[EVO] ${groups.length} grupos sincronizados no banco.`);
      } catch (err) {
        console.error('[EVO] Falha ao sincronizar grupos:', err instanceof Error ? err.message : err);
      } finally {
        this.refreshingGroups = false;
      }
    })();

    return true;
  }

  public async refreshGroupsIfStale(maxAgeMs: number): Promise<void> {
    try {
      const lastSync = await this.getLastSyncedAt();
      const stale = !lastSync || Date.now() - lastSync.getTime() > maxAgeMs;
      if (stale) await this.refreshGroups();
    } catch (err) {
      console.error('[EVO] Falha ao verificar sincronia de grupos:', err instanceof Error ? err.message : err);
    }
  }

  public async getConnectionState(): Promise<{
    state: string;
    instance?: string;
  }> {
    if (!this.isConfigured) {
      return { state: 'not_configured' };
    }

    try {
      const res = await fetch(
        `${this.baseUrl}/instance/connectionState/${this.instance}`,
        { headers: this.headers },
      );

      if (!res.ok) {
        return { state: 'error' };
      }

      const data = await res.json();
      return {
        state: data.instance?.state || data.state || 'unknown',
        instance: data.instance?.instanceName,
      };
    } catch {
      return { state: 'error' };
    }
  }

  public formatAlertMessage(data: {
    title: string;
    message: string;
    clientName?: string;
    severity: string;
  }): string {
    const emoji: Record<string, string> = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵',
      success: '🟢',
    };
    const icon = emoji[data.severity] || '⚠️';
    const lines = [
      `${icon} *${data.title}*`,
      '',
      data.message,
    ];
    if (data.clientName) {
      lines.push('', `📱 Cliente: ${data.clientName}`);
    }
    lines.push('', '_Enviado por GestorFácil_');
    return lines.join('\n');
  }

  public async getQRCode(): Promise<{ qrcode?: string; base64?: string; state: string }> {
    if (!this.isConfigured) {
      return { state: 'not_configured' };
    }

    try {
      const url = `${this.baseUrl}/instance/connect/${this.instance}`;
      console.log(`[EVO] GET ${url}`);
      const res = await fetch(url, { headers: this.headers });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[EVO] QR error ${res.status}: ${body}`);
        return { state: 'error' };
      }

      const data = await res.json();
      console.log(`[EVO] QR response keys:`, Object.keys(data));

      if (data.code || data.base64) {
        return {
          qrcode: data.code,
          base64: data.base64 || data.qrcode?.base64,
          state: 'pending',
        };
      }

      if (data.instance?.state === 'open') {
        return { state: 'open' };
      }

      if (data.status === 404 || data.error) {
        console.error(`[EVO] QR error:`, data);
        return { state: 'error' };
      }

      return { state: data.instance?.state || data.state || 'unknown' };
    } catch (err) {
      console.error('[EVO] QR catch:', err);
      return { state: 'error' };
    }
  }

  public async logout(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const res = await fetch(
        `${this.baseUrl}/instance/logout/${this.instance}`,
        { method: 'POST', headers: this.headers },
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

export default new EvoService();
