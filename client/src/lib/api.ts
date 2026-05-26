import axios from 'axios';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<any> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        if (!refreshPromise) {
          refreshPromise = axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
            .then(({ data }) => {
              localStorage.setItem('access_token', data.accessToken);
              localStorage.setItem('refresh_token', data.refreshToken);
              return data;
            })
            .catch((err) => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
              throw err;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        try {
          const data = await refreshPromise;
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          return Promise.reject(error);
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
  role: 'admin' | 'manager' | 'agency';
  plan: string;
  phone: string | null;
  whatsappNotify: boolean;
  healthCheckTimes: string | null;
  weeklySummary: boolean;
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
  status: 'active' | 'paused' | 'archived';
  accountStatus: number | null;
  disableReason: number | null;
  healthLastCheck: string | null;
  isBoleto: boolean;
  isEcommerce: boolean;
  clientType: 'lead_gen' | 'ecommerce' | 'infoproduct' | 'messaging' | 'delivery';
  balanceThreshold: number | null;
  currentBalance: number | null;
  balanceUpdatedAt: string | null;
  createdAt: string;
}

export interface BalanceData {
  actId: string;
  isBoleto: boolean;
  balanceThreshold: number | null;
  currentBalance: number | null;
  balanceUpdatedAt: string | null;
}

export interface CustomConversion {
  id: number;
  clientId: string;
  customEventId: string;
  label: string;
  createdAt: string;
}

export interface GoalProjectionItem {
  metric: string;
  target: number;
  current: number;
  projected: number;
  avgDaily: number;
  neededDaily: number;
  daysRemaining: number;
  onTrack: boolean;
}

export interface GoalProjection {
  month: string;
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  window: number;
  goals: GoalProjectionItem[];
  burndown: { date: string; actual: number; target: number }[];
}

export interface AccountStatus {
  actId: string;
  clientName?: string;
  accountStatus: number | null;
  statusLabel: string;
  disableReason: number | null;
  lastCheck: string | null;
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
  totalMessaging: number;
  totalPageLikes: number;
  avgCpl: number;
  avgCpc: number;
  avgCpm: number;
  avgCtr: number;
  avgRoas: number;
  avgCpmsg: number;
  clientMetrics: {
    actId: string;
    name: string;
    spend: number;
    leads: number;
    conversionValue: number;
    purchases: number;
    messaging: number;
    roas: number;
    cpmsg: number;
  }[];
  dailyMetrics: {
    date: string;
    spend: number;
    leads: number;
    clicks: number;
    conversionValue: number;
    purchases: number;
    messaging: number;
  }[];
  goals: Goal[];
  topAds: {
    adId: string;
    adName: string;
    campaignName: string;
    previewLink: string;
    creativeUrl: string;
    creativeType: string;
    spend: number;
    leads: number;
    linkClicks: number;
    impressions: number;
    purchases: number;
    totalConversionValue: number;
    messaging: number;
    roas: number;
    cpl: number;
    ctr: number;
    cpmsg: number;
  }[];
  audienceData: {
    gender: string;
    ageRange: string;
    spend: number;
    leads: number;
    impressions: number;
    linkClicks: number;
    reach: number;
    purchases: number;
    purchaseValue: number;
    totalConversionValue: number;
    messaging: number;
    roas: number;
    ctr: number;
    cpl: number;
    cpmsg: number;
  }[];
  placementData: {
    platform: string;
    spend: number;
    leads: number;
    impressions: number;
    linkClicks: number;
    reach: number;
    purchases: number;
    purchaseValue: number;
    totalConversionValue: number;
    messaging: number;
    roas: number;
    ctr: number;
    cpl: number;
    cpmsg: number;
  }[];
  regionData: {
    region: string;
    spend: number;
    leads: number;
    impressions: number;
    linkClicks: number;
    reach: number;
    purchases: number;
    purchaseValue: number;
    totalConversionValue: number;
    messaging: number;
    roas: number;
    ctr: number;
    cpl: number;
    cpmsg: number;
  }[];
  period: { since: string; until: string };
}

export function createProgressStream(onEvent: (event: SyncProgressEvent) => void): () => void {
  console.log('Iniciando stream de progresso via fetchEventSource (POST)');
  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  const token = localStorage.getItem('access_token');
  const ctrl = new AbortController();

  fetchEventSource(`${baseUrl}/sync/progress`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
    },
    signal: ctrl.signal,
    onmessage(ev) {
      try {
        const data = JSON.parse(ev.data) as SyncProgressEvent;
        onEvent(data);
      } catch { /* ignore parse errors */ }
    },
    onclose() {
      console.log('SSE connection closed');
    },
    onerror(err) {
      console.error('SSE Error:', err);
      // fetchEventSource tenta reconectar automaticamente por padrão
      // Se for 401, talvez queiramos parar
      if (err instanceof Error && err.message.includes('401')) {
        ctrl.abort();
      }
    }
  });

  return () => ctrl.abort();
}

export interface Budget {
  id: string;
  managerId: string;
  clientId: string;
  month: string;
  budgetAmount: number;
}

export interface Goal {
  id: string;
  managerId: string;
  clientId: string;
  metric: string;
  targetValue: number;
  month: string;
}

export const clientApi = {
  list: () => api.get<Client[]>('/clients'),
  create: (data: CreateClientPayload) => api.post('/clients', data),
  updateToken: (actId: string, access_token: string) =>
    api.patch(`/clients/${actId}/token`, { access_token }),
  update: (actId: string, data: { name?: string; act_id?: string; custom_event_id?: string }) =>
    api.patch(`/clients/${actId}`, data),
  delete: (actId: string) => api.delete(`/clients/${actId}`),
  downloadReport: (actId: string) =>
    api.get(`/clients/${actId}/download`, { responseType: 'blob' }),
  metrics: (params?: { since?: string; until?: string; clientId?: string }) => 
    api.get<DashboardMetrics>('/clients/metrics', { params }),
  getBudget: (actId: string) => api.get<Budget | null>(`/clients/${actId}/budget`),
  setBudget: (actId: string, month: string, budgetAmount: number) =>
    api.post(`/clients/${actId}/budget`, { month, budgetAmount }),
  getBudgetHistory: (actId: string) => api.get<Budget[]>(`/clients/${actId}/budget/history`),
  getGoals: (actId: string) => api.get<Goal[]>(`/clients/${actId}/goals`),
  setGoal: (actId: string, metric: string, targetValue: number, month: string) =>
    api.post(`/clients/${actId}/goals`, { metric, targetValue, month }),
  deleteGoal: (actId: string, id: string) => api.delete(`/clients/${actId}/goals/${id}`),
  getBalance: (actId: string) => api.get<BalanceData>(`/clients/${actId}/balance`),
  refreshBalance: (actId: string) => api.post(`/clients/${actId}/balance/refresh`),
  updateBalanceSettings: (actId: string, data: { is_boleto?: boolean; balance_threshold?: number }) =>
    api.patch(`/clients/${actId}/balance-settings`, data),
  getCustomConversions: (actId: string) => api.get<CustomConversion[]>(`/clients/${actId}/custom-conversions`),
  addCustomConversion: (actId: string, data: { custom_event_id: string; label: string }) =>
    api.post(`/clients/${actId}/custom-conversions`, data),
  deleteCustomConversion: (actId: string, id: number) =>
    api.delete(`/clients/${actId}/custom-conversions/${id}`),
  getGoalProjection: (actId: string, window?: number) =>
    api.get<GoalProjection>(`/clients/${actId}/goal-projection`, { params: { window } }),
  getAccountStatus: (actId: string) => api.get<AccountStatus>(`/clients/${actId}/status`),
  refreshAccountStatus: (actId: string) => api.post<AccountStatus>(`/clients/${actId}/status/refresh`),
  sendSummary: (actId: string) => api.post<{ success: boolean; message: string }>(`/clients/${actId}/summary`),
  updateClientType: (actId: string, clientType: string) => api.patch(`/clients/${actId}/type`, { clientType }),
};

export const syncApi = {
  manual: (data: SyncPayload) => api.post('/sync/manual', data),
  breakdown: (data: BreakdownSyncPayload) => api.post('/sync/breakdown', data),
  breakdownAll: (data: SyncPayload) => api.post('/sync/breakdown/all', data),
  refreshCreative: (adId: string) => api.post<{ success: boolean; url: string }>(`/sync/creative/${adId}/refresh`),
};

export const settingsApi = {
  getAutoSync: () => api.get<{ enabled: boolean; schedulerRunning: boolean }>('/settings/auto-sync'),
  setAutoSync: (enabled: boolean) => api.put('/settings/auto-sync', { enabled }),
  syncAll: () => api.post('/settings/sync-all'),
  getWhatsappStatus: () => api.get<{ state: string; instance?: string }>('/settings/whatsapp/status'),
  getWhatsappQRCode: () => api.get<{ qrcode?: string; base64?: string; state: string }>('/settings/whatsapp/qrcode'),
  whatsappLogout: () => api.post<{ success: boolean }>('/settings/whatsapp/logout'),
};

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResponse>('/auth/login', { email, password }),
  register: (token: string, name: string, email: string, password: string) =>
    api.post<AuthResponse>(`/auth/register/${token}`, { name, email, password }),
  refresh: (refreshToken: string) => api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get<AuthUser>('/auth/me'),
  updateProfile: (data: {
    name?: string;
    company?: string;
    password?: string;
    phone?: string;
    whatsappNotify?: boolean;
    healthCheckTimes?: string;
    weeklySummary?: boolean;
  }) => api.put<AuthUser>('/auth/me', data),
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

export interface AlertItem {
  id: string;
  managerId: string;
  clientId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
}

export const alertApi = {
  list: () => api.get<AlertItem[]>('/alerts'),
  countUnread: () => api.get<{ count: number }>('/alerts/unread-count'),
  markRead: (id: string) => api.patch(`/alerts/${id}/read`),
  markAllRead: () => api.post('/alerts/mark-all-read'),
  dismiss: (id: string) => api.delete(`/alerts/${id}`),
};

export interface TaskItem {
  id: string;
  managerId: string;
  clientId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  position: number;
  alertId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const taskApi = {
  list: (params?: { status?: string; clientId?: string; priority?: string }) =>
    api.get<TaskItem[]>('/tasks', { params }),
  counts: () => api.get<Record<string, number>>('/tasks/counts'),
  create: (data: Partial<TaskItem> & { title: string }) => api.post<TaskItem>('/tasks', data),
  update: (id: string, data: Partial<TaskItem>) => api.patch<TaskItem>(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch<TaskItem>(`/tasks/${id}/status`, { status }),
  reorder: (status: string, orderedIds: string[]) => api.patch(`/tasks/reorder`, { status, orderedIds }),
  remove: (id: string) => api.delete(`/tasks/${id}`),
  clearByStatus: (status: string) => api.post<{ success: boolean; deleted: number }>('/tasks/clear', { status }),
};

export const planApi = {
  list: () => api.get<{ plans: PlanInfo[]; billing: BillingInfo }>('/plans'),
  current: () => api.get<CurrentPlan>('/plans/current'),
  change: (planId: string, billingPeriod?: string) => api.post('/plans/change', { planId, billingPeriod }),
};

export interface PlanInfo {
  id: string;
  name: string;
  description: string;
  maxClients: number;
  maxTasks: number;
  maxSeats: number;
  pricePerSeatExtra: number | null;
  features: PlanFeatures;
  prices: Record<string, number>;
}

export interface PlanFeatures {
  autoSync: boolean;
  budgetGoals: boolean;
  whatsapp: boolean;
  exportExcel: boolean;
  weeklySummary: boolean;
  consolidatedDashboard: boolean;
  teamManagement: boolean;
  healthCheck: boolean;
}

export interface BillingInfo {
  label: string;
  discount: number;
  months: number;
}

export interface CurrentPlan {
  plan: PlanInfo;
  usage: { clients: number; tasks: number; seats: number };
  subscription: { status: string; endsAt: string | null; billingPeriod: string | null };
}

export const agencyApi = {
  members: () => api.get<AgencyMember[]>('/agency/members'),
  invite: (data: { name: string; email: string; password: string }) => api.post('/agency/members', data),
  remove: (memberId: string) => api.delete(`/agency/members/${memberId}`),
  consolidated: () => api.get<AgencyConsolidated[]>('/agency/consolidated'),
};

export interface AgencyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  managerClients: { clientId: string }[];
}

export interface AgencyConsolidated {
  id: string;
  name: string;
  clientCount: number;
  clients: { actId: string; clientName: string; status: string }[];
}

export default api;
