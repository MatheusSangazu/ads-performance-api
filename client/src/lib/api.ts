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

export const clientApi = {
  list: () => api.get<Client[]>('/clients'),
  create: (data: CreateClientPayload) => api.post('/clients', data),
  updateToken: (actId: string, access_token: string) =>
    api.patch(`/clients/${actId}/token`, { access_token }),
  delete: (actId: string) => api.delete(`/clients/${actId}`),
  downloadReport: (actId: string) =>
    api.get(`/clients/${actId}/download`, { responseType: 'blob' }),
};

export const syncApi = {
  manual: (data: SyncPayload) => api.post('/sync/manual', data),
};

export const settingsApi = {
  getGlobalToken: () => api.get<{ globalToken: string | null }>('/settings/global-token'),
  setGlobalToken: (token: string) => api.put('/settings/global-token', { token }),
};

export default api;
