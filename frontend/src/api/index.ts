import { eventsApi } from './events';
import { registrationsApi } from './registrations';
import { authApi } from './auth';
import { adminApi } from './admin';

export const api = {
  events: eventsApi,
  registrations: registrationsApi,
  auth: authApi,
  admin: adminApi
};

export * from './apiClient';
