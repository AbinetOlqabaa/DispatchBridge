import {
  AuditLogEntry,
  Dispatch,
  Partner,
  SystemStatusInfo,
  User,
  UserRole,
} from '../types/dispatch.js';

const TOKEN_KEY = 'dispatchbridge_auth_token';
const USER_KEY = 'dispatchbridge_auth_user';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

class ApiService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch {
        this.user = null;
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  setSession(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    } catch (err: any) {
      throw new ApiError('Network connection failure. Please check your connection and retry.', 0);
    }

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Fallback to text
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    return response.json() as Promise<T>;
  }

  // Auth Endpoints
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async register(payload: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    businessName: string;
    role: UserRole;
    partnerId?: string;
  }): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async getProfile(): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/me');
    this.user = res.user;
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; resetTokenPreview?: string }> {
    return this.request('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async verifyPhone(code: string): Promise<{ success: boolean }> {
    const res = await this.request<{ success: boolean }>('/api/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (this.user) {
      this.user.phoneVerified = true;
      localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    }
    return res;
  }

  async getBootstrapStatus(): Promise<{ isAvailable: boolean; superAdminProvisioned: boolean }> {
    return this.request('/api/auth/bootstrap-status');
  }

  async bootstrapSuperAdmin(payload: {
    bootstrapSecret: string;
    email: string;
    password: string;
    name: string;
  }): Promise<{ success: boolean; message: string; user: User }> {
    return this.request('/api/auth/bootstrap-superadmin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Dispatches
  async getDispatches(statusFilter?: string): Promise<Dispatch[]> {
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    return this.request(`/api/dispatches${query}`);
  }

  async getDispatch(id: string): Promise<Dispatch> {
    return this.request(`/api/dispatches/${id}`);
  }

  async getPublicDispatch(shareToken: string): Promise<Dispatch> {
    return this.request(`/api/dispatches/public/${shareToken}`);
  }

  async createDispatch(payload: any): Promise<Dispatch> {
    return this.request('/api/dispatches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async recordReceipt(
    id: string,
    payload: {
      items: Array<{
        id: string;
        receivedQty: number;
        lossQty: number;
        lossReason?: string;
        conditionNote?: string;
      }>;
      signoff: {
        signerName: string;
        signerRole: string;
        comments?: string;
      };
    }
  ): Promise<Dispatch> {
    return this.request(`/api/dispatches/${id}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async finalizeReconciliation(id: string, resolutionNotes: string): Promise<Dispatch> {
    return this.request(`/api/dispatches/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes }),
    });
  }

  // Partners
  async getPartners(): Promise<Partner[]> {
    return this.request('/api/partners');
  }

  async createPartner(payload: any): Promise<Partner> {
    return this.request('/api/partners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return this.request('/api/audit');
  }

  // System Diagnostics
  async getSystemStatus(): Promise<SystemStatusInfo> {
    return this.request('/api/system/status');
  }
}

export const api = new ApiService();
