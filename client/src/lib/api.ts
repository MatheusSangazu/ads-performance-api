import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface Client {
  clientName: string;
  actId: string;
  customEventId: string | null;
}

export interface CreateClientPayload {
  name: string;
  act_id: string;
  access_token: string;
  custom_event_id?: string;
}

export interface SyncPayload {
  act_id: string;
  since: string;
  until: string;
}

export interface BreakdownSyncPayload extends SyncPayload {
  type: 'audience' | 'placement' | 'region';
}

export interface SyncProgressEvent {
  type: 'start' | 'log' | 'progress' | 'done' | 'error';
  message: string;
  step?: string;
  progress?: number;
  records?: number;
  errors?: number;
}

export interface DashboardMetrics {
  totalClients: number;
  totalSpend: number;
  totalLeads: number;
  totalClicks: number;
  totalImpressions: number;
  totalReach: number;
  totalPurchases: number;
  totalPurchaseValue: number;
  totalConversionValue: number;
  avgCpl: number;
  avgCpc: number;
  avgCpm: number;
  avgCtr: number;
  avgRoas: number;
  clientMetrics: {
    actId: string;
    name: string;
    spend: number;
    leads: number;
    conversionValue: number;
    roas: number;
  }[];
  dailyMetrics: {
    date: string;
    spend: number;
    leads: number;
    clicks: number;
    conversionValue: number;
  }[];
  period: { since: string; until: string };
}

export function createProgressStream(onEvent: (event: SyncProgressEvent) => void): () => void {
  const es = new EventSource('/api/sync/progress');

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as SyncProgressEvent;
      onEvent(data);
    } catch { /* ignore parse errors */ }
  };

  es.onerror = () => {
    es.close();
  };

  return () => es.close();
}

export const clientApi = {
  list: () => api.get<Client[]>('/clients'),
  create: (data: CreateClientPayload) => api.post('/clients', data),
  updateToken: (actId: string, access_token: string) =>
    api.patch(`/clients/${actId}/token`, { access_token }),
  delete: (actId: string) => api.delete(`/clients/${actId}`),
  downloadReport: (actId: string) =>
    api.get(`/clients/${actId}/download`, { responseType: 'blob' }),
  metrics: () => api.get<DashboardMetrics>('/clients/metrics'),
};

export const syncApi = {
  manual: (data: SyncPayload) => api.post('/sync/manual', data),
  breakdown: (data: BreakdownSyncPayload) => api.post('/sync/breakdown', data),
  breakdownAll: (data: SyncPayload) => api.post('/sync/breakdown/all', data),
};

export const settingsApi = {
  getGlobalToken: () => api.get<{ globalToken: string | null }>('/settings/global-token'),
  setGlobalToken: (token: string) => api.put('/settings/global-token', { token }),
  getAutoSync: () => api.get<{ enabled: boolean; schedulerRunning: boolean }>('/settings/auto-sync'),
  setAutoSync: (enabled: boolean) => api.put('/settings/auto-sync', { enabled }),
  syncAll: () => api.post('/settings/sync-all'),
};

export default api;
