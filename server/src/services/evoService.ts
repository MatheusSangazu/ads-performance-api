import { env } from '../config/env.js';

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

  public async sendText(phone: string, text: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const number = phone.replace(/\D/g, '');

      const res = await fetch(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            number: `${number}@s.whatsapp.net`,
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
    lines.push('', '_Enviado por Growth Ads_');
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
