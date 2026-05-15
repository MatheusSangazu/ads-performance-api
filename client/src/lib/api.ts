import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: 'admin' | 'manager';
  plan: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  manager: AuthUser;
}

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

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResponse>('/auth/login', { email, password }),
  register: (token: string, name: string, email: string, password: string) =>
    api.post<AuthResponse>(`/auth/register/${token}`, { name, email, password }),
  refresh: (refreshToken: string) => api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get<AuthUser>('/auth/me'),
  updateProfile: (data: { name?: string; company?: string; password?: string }) => api.put<AuthUser>('/auth/me', data),
  verifyInvite: (token: string) => api.get<{ valid: boolean; invite: { plan: string; email?: string } }>(`/invites/verify/${token}`),
};

export const inviteApi = {
  list: () => api.get('/invites'),
  create: (data: { email?: string; plan: string }) => api.post('/invites', data),
  revoke: (id: string) => api.delete(`/invites/${id}`),
};

export const managerApi = {
  list: () => api.get('/managers'),
  update: (id: string, data: { plan?: string; maxClients?: number; active?: boolean }) => api.put(`/managers/${id}`, data),
  deactivate: (id: string) => api.delete(`/managers/${id}`),
  linkClient: (id: string, actId: string) => api.post(`/managers/${id}/clients/${actId}`),
  unlinkClient: (id: string, actId: string) => api.delete(`/managers/${id}/clients/${actId}`),
};

export default api;
