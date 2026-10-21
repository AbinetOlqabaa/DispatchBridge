/**
 * Domain types for Business Dispatch & Delivery Reconciliation
 */

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'SENDER' | 'RECEIVER';

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  phoneVerified: boolean;
  role: UserRole;
  businessId: string;
  businessName: string;
  partnerId?: string; // If RECEIVER role, binds to specific partner entity
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  registrationNumber?: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  businessId: string; // The supplier/distributor who registered this partner
  name: string;
  type: 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'FRANCHISE' | 'CONSTRUCTION_SITE';
  contactPerson: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export type LossReason =
  | 'NONE'
  | 'DAMAGED_IN_TRANSIT'
  | 'SHORTAGE_AT_SENDER'
  | 'EXPIRED_OR_COMPROMISED'
  | 'WRONG_ITEM_DELIVERED'
  | 'LEAKAGE_OR_SPILL'
  | 'THEFT_OR_PILFERAGE'
  | 'REJECTED_BY_RECEIVER'
  | 'OTHER';

export interface DispatchItem {
  id: string;
  sku: string;
  description: string;
  unit: string; // 'boxes', 'pallets', 'kg', 'units', 'cartons'
  unitPrice?: number;
  dispatchedQty: number;
  receivedQty?: number;
  lossQty?: number;
  lossReason?: LossReason;
  conditionNote?: string;
}

export type DispatchStatus =
  | 'DRAFT'
  | 'DISPATCHED'
  | 'VIEWED'
  | 'IN_TRANSIT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'DISPUTED'
  | 'RECONCILED';

export interface ReceiverSignoff {
  signerName: string;
  signerRole: string;
  signedAt: string;
  comments?: string;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  businessId: string;
  businessName: string;
  senderId: string;
  senderName: string;
  partnerId: string;
  partnerName: string;
  destinationAddress: string;
  status: DispatchStatus;
  items: DispatchItem[];
  totalItemsDispatched: number;
  totalItemsReceived?: number;
  totalItemsLost?: number;
  shareToken: string;
  driverName?: string;
  driverPhone?: string;
  vehicleReg?: string;
  dispatchedAt?: string;
  firstViewedAt?: string;
  lastViewedAt?: string;
  receivedAt?: string;
  reconciledAt?: string;
  notes?: string;
  receiverSignoff?: ReceiverSignoff;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'DISPATCH' | 'PARTNER' | 'USER' | 'BUSINESS' | 'SYSTEM' | 'RECONCILIATION';
  entityId: string;
  details: string;
  metadata?: Record<string, any>;
  ipHash?: string;
}

export interface SystemStatusInfo {
  kernelVersion: string;
  environment: 'development' | 'production';
  platform: 'Progressive Web App (PWA) / Node.js Express Container';
  isNativeAndroid: false;
  databaseProvider: 'Sandbox In-Memory / Dev State' | 'Cloud Firestore';
  authProvider: 'Sandbox Mock JWT' | 'Firebase Auth';
  notificationProvider: 'Console & Event Hub (Dev)' | 'SMS / WhatsApp Gateway';
  isMockActive: boolean;
  totalDispatches: number;
  totalAuditEvents: number;
  totalPartners: number;
  superAdminBootstrapAvailable: boolean;
  serverTime: string;
}
