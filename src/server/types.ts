import {
  AuditLogEntry,
  Business,
  Dispatch,
  Partner,
  SystemStatusInfo,
  User,
  UserRole,
} from '../types/dispatch.js';

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface IAuthAdapter {
  login(email: string, password: string):Promise<AuthSession>;
  register(payload: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    businessName: string;
    role: UserRole;
    partnerId?: string;
  }): Promise<AuthSession>;
  verifyToken(token: string): Promise<User | null>;
  requestPasswordReset(email: string): Promise<{ success: boolean; resetTokenPreview?: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean }>;
  verifyPhoneNumber(userId: string, code: string): Promise<{ success: boolean }>;
  bootstrapSuperAdmin(bootstrapSecret: string, payload: { email: string; password: string; name: string }): Promise<{ success: boolean; user: User }>;
  isSuperAdminBootstrapAvailable(): boolean;
}

export interface IDatabaseAdapter {
  getDispatches(filter?: {
    businessId?: string;
    partnerId?: string;
    status?: string;
    role?: UserRole;
  }): Promise<Dispatch[]>;
  getDispatchById(id: string): Promise<Dispatch | null>;
  getDispatchByShareToken(token: string): Promise<Dispatch | null>;
  createDispatch(dispatch: Omit<Dispatch, 'id' | 'createdAt' | 'updatedAt' | 'shareToken' | 'status'>, actor: User): Promise<Dispatch>;
  markDispatchViewed(id: string, viewerIp?: string): Promise<Dispatch | null>;
  recordReceipt(
    id: string,
    payload: {
      items: Array<{
        id: string;
        receivedQty: number;
        lossQty: number;
        lossReason?: any;
        conditionNote?: string;
      }>;
      signoff: {
        signerName: string;
        signerRole: string;
        comments?: string;
      };
    },
    actor: User
  ): Promise<Dispatch>;
  finalizeReconciliation(
    id: string,
    payload: {
      resolutionNotes: string;
    },
    actor: User
  ): Promise<Dispatch>;
  getPartners(businessId?: string): Promise<Partner[]>;
  createPartner(partner: Omit<Partner, 'id' | 'createdAt'>, actor: User): Promise<Partner>;
  getAuditLogs(limitCount?: number): Promise<AuditLogEntry[]>;
  recordAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
  getSystemStatus(): Promise<SystemStatusInfo>;
  getAllBusinesses(): Promise<Business[]>;
}

export interface INotificationAdapter {
  notifyDispatchCreated(dispatch: Dispatch, partner: Partner): Promise<void>;
  notifyDispatchViewed(dispatch: Dispatch): Promise<void>;
  notifyReconciliationCompleted(dispatch: Dispatch): Promise<void>;
}
