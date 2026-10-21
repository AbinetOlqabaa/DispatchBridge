import crypto from 'crypto';
import {
  AuditLogEntry,
  Business,
  Dispatch,
  Partner,
  SystemStatusInfo,
  User,
  UserRole,
} from '../../types/dispatch.js';
import {
  createSessionToken,
  verifySessionToken,
  generatePasswordResetToken,
  generatePhoneCode,
  getBootstrapStatus,
  passwordResetStore,
  phoneVerificationStore,
  redeemBootstrapToken,
} from '../security.js';
import { AuthSession, IAuthAdapter, IDatabaseAdapter, INotificationAdapter } from '../types.js';

// Pre-seeded Businesses
const businesses: Business[] = [
  {
    id: 'biz_apex_supply',
    name: 'Apex Supply Logistics',
    registrationNumber: 'REG-883921-US',
    contactEmail: 'ops@apexsupply.com',
    contactPhone: '+1-555-019-2831',
    address: '104 Logistics Blvd, Industrial Park, Hub 4, Chicago, IL',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'biz_metro_retail',
    name: 'Metro Retail Distribution',
    registrationNumber: 'REG-441209-US',
    contactEmail: 'supply@metroretail.com',
    contactPhone: '+1-555-014-9922',
    address: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    createdAt: '2026-02-10T09:30:00.000Z',
  },
];

// Pre-seeded Partners (associated with Apex Supply)
const partners: Partner[] = [
  {
    id: 'part_metro_north',
    businessId: 'biz_apex_supply',
    name: 'Metro Retail North Branch',
    type: 'RETAILER',
    contactPerson: 'David Miller (Receiving Manager)',
    email: 'store@metroretail.com',
    phone: '+1-555-014-4411',
    deliveryAddress: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    status: 'ACTIVE',
    createdAt: '2026-02-11T10:00:00.000Z',
  },
  {
    id: 'part_summit_depot',
    businessId: 'biz_apex_supply',
    name: 'Summit Wholesale Depot',
    type: 'WHOLESALER',
    contactPerson: 'Sarah Jenkins',
    email: 'logistics@summitwholesale.com',
    phone: '+1-555-017-3388',
    deliveryAddress: '2300 Prairie Parkway, Bay 4, Des Moines, IA',
    status: 'ACTIVE',
    createdAt: '2026-03-01T11:20:00.000Z',
  },
  {
    id: 'part_urban_market',
    businessId: 'biz_apex_supply',
    name: 'Urban Core Supermarkets',
    type: 'RETAILER',
    contactPerson: 'Marcus Vance',
    email: 'receiving@urbancore.com',
    phone: '+1-555-018-9102',
    deliveryAddress: '450 Michigan Ave, Freight Entrance, Chicago, IL',
    status: 'ACTIVE',
    createdAt: '2026-03-12T14:45:00.000Z',
  },
];

// In-memory Users store
const users: Array<User & { passwordHash: string }> = [
  {
    id: 'usr_business_owner',
    email: 'owner@apexsupply.com',
    passwordHash: 'Password123!', // dev mock password
    name: 'Eleanor Vance',
    phoneNumber: '+1-555-019-2831',
    phoneVerified: true,
    role: 'BUSINESS_OWNER',
    businessId: 'biz_apex_supply',
    businessName: 'Apex Supply Logistics',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'usr_sender_dispatcher',
    email: 'dispatcher@apexsupply.com',
    passwordHash: 'Password123!',
    name: 'Carlos Ruiz',
    phoneNumber: '+1-555-019-5572',
    phoneVerified: true,
    role: 'SENDER',
    businessId: 'biz_apex_supply',
    businessName: 'Apex Supply Logistics',
    createdAt: '2026-02-01T08:30:00.000Z',
    updatedAt: '2026-02-01T08:30:00.000Z',
  },
  {
    id: 'usr_receiver_metro',
    email: 'store@metroretail.com',
    passwordHash: 'Password123!',
    name: 'David Miller',
    phoneNumber: '+1-555-014-4411',
    phoneVerified: true,
    role: 'RECEIVER',
    businessId: 'biz_metro_retail',
    businessName: 'Metro Retail Distribution',
    partnerId: 'part_metro_north',
    createdAt: '2026-02-11T10:00:00.000Z',
    updatedAt: '2026-02-11T10:00:00.000Z',
  },
  {
    id: 'usr_super_admin',
    email: 'admin@dispatchbridge.internal',
    passwordHash: 'Password123!',
    name: 'System Administrator (Initial Seed)',
    phoneNumber: '+1-555-010-0001',
    phoneVerified: true,
    role: 'SUPER_ADMIN',
    businessId: 'biz_platform',
    businessName: 'DispatchBridge Platform Engine',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// Pre-seeded Dispatches across lifecycle states
const dispatches: Dispatch[] = [
  {
    id: 'dsp_001',
    dispatchNumber: 'DSP-2026-0081',
    businessId: 'biz_apex_supply',
    businessName: 'Apex Supply Logistics',
    senderId: 'usr_sender_dispatcher',
    senderName: 'Carlos Ruiz',
    partnerId: 'part_metro_north',
    partnerName: 'Metro Retail North Branch',
    destinationAddress: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    status: 'VIEWED',
    shareToken: 'sh_a91b2c4d8e7f',
    driverName: 'Robert Lang',
    driverPhone: '+1-555-019-9021',
    vehicleReg: 'TRK-4921',
    dispatchedAt: '2026-10-21T07:30:00.000Z',
    firstViewedAt: '2026-10-21T08:15:00.000Z',
    lastViewedAt: '2026-10-21T08:45:00.000Z',
    totalItemsDispatched: 140,
    items: [
      {
        id: 'itm_101',
        sku: 'SKU-BEV-001',
        description: 'Organic Cold-Brew Espresso (Case of 24 cans)',
        unit: 'cases',
        unitPrice: 38.5,
        dispatchedQty: 50,
      },
      {
        id: 'itm_102',
        sku: 'SKU-SNK-009',
        description: 'Artisan Sea Salt Crackers (Carton of 12 boxes)',
        unit: 'cartons',
        unitPrice: 24.0,
        dispatchedQty: 60,
      },
      {
        id: 'itm_103',
        sku: 'SKU-DRY-042',
        description: 'Fair-Trade Rolled Oats 25kg Bulk Bag',
        unit: 'bags',
        unitPrice: 42.0,
        dispatchedQty: 30,
      },
    ],
    notes: 'Priority morning delivery. Unload at Bay 3; refrigerated section.',
    createdAt: '2026-10-21T07:15:00.000Z',
    updatedAt: '2026-10-21T08:15:00.000Z',
  },
  {
    id: 'dsp_002',
    dispatchNumber: 'DSP-2026-0078',
    businessId: 'biz_apex_supply',
    businessName: 'Apex Supply Logistics',
    senderId: 'usr_sender_dispatcher',
    senderName: 'Carlos Ruiz',
    partnerId: 'part_metro_north',
    partnerName: 'Metro Retail North Branch',
    destinationAddress: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    status: 'PARTIALLY_RECEIVED',
    shareToken: 'sh_e83c7d6b1a09',
    driverName: 'Samira Patel',
    driverPhone: '+1-555-019-4402',
    vehicleReg: 'VAN-8802',
    dispatchedAt: '2026-10-20T09:00:00.000Z',
    firstViewedAt: '2026-10-20T10:05:00.000Z',
    receivedAt: '2026-10-20T14:20:00.000Z',
    totalItemsDispatched: 100,
    totalItemsReceived: 93,
    totalItemsLost: 7,
    items: [
      {
        id: 'itm_201',
        sku: 'SKU-GLS-101',
        description: 'Premium Olive Oil 750ml (Box of 6 glass bottles)',
        unit: 'boxes',
        unitPrice: 54.0,
        dispatchedQty: 40,
        receivedQty: 36,
        lossQty: 4,
        lossReason: 'DAMAGED_IN_TRANSIT',
        conditionNote: '4 boxes crushed and leaking onto truck floor upon opening tailgate.',
      },
      {
        id: 'itm_202',
        sku: 'SKU-SPA-303',
        description: 'Artisan Bronze-Die Pasta 500g (Pack of 20)',
        unit: 'packs',
        unitPrice: 32.0,
        dispatchedQty: 60,
        receivedQty: 57,
        lossQty: 3,
        lossReason: 'SHORTAGE_AT_SENDER',
        conditionNote: 'Pallet shrinkwrap intact; only 57 packs inside sealed crate.',
      },
    ],
    receiverSignoff: {
      signerName: 'David Miller',
      signerRole: 'Receiving Dock Supervisor',
      signedAt: '2026-10-20T14:22:00.000Z',
      comments: 'Loss verified with carrier driver before departure. Credit note requested.',
    },
    notes: 'Fragile liquids included. Handle with forklift only.',
    createdAt: '2026-10-20T08:45:00.000Z',
    updatedAt: '2026-10-20T14:22:00.000Z',
  },
  {
    id: 'dsp_003',
    dispatchNumber: 'DSP-2026-0065',
    businessId: 'biz_apex_supply',
    businessName: 'Apex Supply Logistics',
    senderId: 'usr_sender_dispatcher',
    senderName: 'Carlos Ruiz',
    partnerId: 'part_summit_depot',
    partnerName: 'Summit Wholesale Depot',
    destinationAddress: '2300 Prairie Parkway, Bay 4, Des Moines, IA',
    status: 'RECONCILED',
    shareToken: 'sh_f12a34b56c78',
    driverName: 'Robert Lang',
    driverPhone: '+1-555-019-9021',
    vehicleReg: 'TRK-4921',
    dispatchedAt: '2026-10-18T06:00:00.000Z',
    firstViewedAt: '2026-10-18T07:10:00.000Z',
    receivedAt: '2026-10-18T13:30:00.000Z',
    reconciledAt: '2026-10-19T10:00:00.000Z',
    totalItemsDispatched: 200,
    totalItemsReceived: 200,
    totalItemsLost: 0,
    items: [
      {
        id: 'itm_301',
        sku: 'SKU-FLR-001',
        description: 'Unbleached Bakers Flour 50lb Sack',
        unit: 'sacks',
        unitPrice: 28.0,
        dispatchedQty: 200,
        receivedQty: 200,
        lossQty: 0,
        lossReason: 'NONE',
        conditionNote: 'All bags received intact and dry.',
      },
    ],
    receiverSignoff: {
      signerName: 'Sarah Jenkins',
      signerRole: 'Warehouse Manager',
      signedAt: '2026-10-18T13:35:00.000Z',
      comments: 'Full shipment verified 100% complete.',
    },
    notes: 'Standard freight delivery.',
    createdAt: '2026-10-18T05:30:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  },
];

// Append-only Audit Log Store
const auditLogs: AuditLogEntry[] = [
  {
    id: 'aud_001',
    timestamp: '2026-10-18T05:30:00.000Z',
    actorId: 'usr_sender_dispatcher',
    actorName: 'Carlos Ruiz',
    actorRole: 'SENDER',
    action: 'DISPATCH_CREATED',
    entityType: 'DISPATCH',
    entityId: 'dsp_003',
    details: 'Created dispatch DSP-2026-0065 with 200 items for Summit Wholesale Depot.',
  },
  {
    id: 'aud_002',
    timestamp: '2026-10-18T07:10:00.000Z',
    actorId: 'partner_anonymous',
    actorName: 'Summit Wholesale Depot (Receiver)',
    actorRole: 'RECEIVER',
    action: 'DISPATCH_VIEWED',
    entityType: 'DISPATCH',
    entityId: 'dsp_003',
    details: 'Delivery list viewed via partner link.',
  },
  {
    id: 'aud_003',
    timestamp: '2026-10-18T13:35:00.000Z',
    actorId: 'usr_receiver_metro',
    actorName: 'Sarah Jenkins',
    actorRole: 'RECEIVER',
    action: 'RECEIPT_RECORDED',
    entityType: 'RECONCILIATION',
    entityId: 'dsp_003',
    details: 'Confirmed 200 items received with 0 loss. Signed by Sarah Jenkins.',
  },
  {
    id: 'aud_004',
    timestamp: '2026-10-20T08:45:00.000Z',
    actorId: 'usr_sender_dispatcher',
    actorName: 'Carlos Ruiz',
    actorRole: 'SENDER',
    action: 'DISPATCH_CREATED',
    entityType: 'DISPATCH',
    entityId: 'dsp_002',
    details: 'Created dispatch DSP-2026-0078 with 100 items for Metro Retail North Branch.',
  },
  {
    id: 'aud_005',
    timestamp: '2026-10-20T10:05:00.000Z',
    actorId: 'partner_metro_north',
    actorName: 'Metro Retail North Branch',
    actorRole: 'RECEIVER',
    action: 'DISPATCH_VIEWED',
    entityType: 'DISPATCH',
    entityId: 'dsp_002',
    details: 'Partner opened the delivery list URL.',
  },
  {
    id: 'aud_006',
    timestamp: '2026-10-20T14:22:00.000Z',
    actorId: 'usr_receiver_metro',
    actorName: 'David Miller',
    actorRole: 'RECEIVER',
    action: 'RECEIPT_DISCREPANCY_RECORDED',
    entityType: 'RECONCILIATION',
    entityId: 'dsp_002',
    details: 'Recorded shortfall: 7 items lost (4 Damaged In Transit, 3 Shortage At Sender). Signed off.',
  },
  {
    id: 'aud_007',
    timestamp: '2026-10-21T07:15:00.000Z',
    actorId: 'usr_sender_dispatcher',
    actorName: 'Carlos Ruiz',
    actorRole: 'SENDER',
    action: 'DISPATCH_CREATED',
    entityType: 'DISPATCH',
    entityId: 'dsp_001',
    details: 'Created dispatch DSP-2026-0081 with 140 items for Metro Retail North Branch.',
  },
  {
    id: 'aud_008',
    timestamp: '2026-10-21T08:15:00.000Z',
    actorId: 'partner_metro_north',
    actorName: 'David Miller',
    actorRole: 'RECEIVER',
    action: 'DISPATCH_VIEWED',
    entityType: 'DISPATCH',
    entityId: 'dsp_001',
    details: 'Partner acknowledged and viewed manifest DSP-2026-0081.',
  },
];

export class SandboxStore implements IAuthAdapter, IDatabaseAdapter, INotificationAdapter {
  readonly isMock = true;
  readonly providerName = 'Sandbox In-Memory / Dev State';

  // --- Auth Adapter ---
  async login(email: string, password: string): Promise<AuthSession> {
    const userRecord = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!userRecord) {
      throw new Error('Invalid email or password.');
    }

    if (userRecord.passwordHash !== password) {
      throw new Error('Invalid email or password.');
    }

    const { passwordHash, ...safeUser } = userRecord;
    const token = createSessionToken(safeUser.id, safeUser.role);

    // Record login audit
    await this.recordAudit({
      actorId: safeUser.id,
      actorName: safeUser.name,
      actorRole: safeUser.role,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: safeUser.id,
      details: `User ${safeUser.email} logged in.`,
    });

    return {
      token,
      user: safeUser,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };
  }

  async register(payload: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    businessName: string;
    role: UserRole;
    partnerId?: string;
  }): Promise<AuthSession> {
    const normalizedEmail = payload.email.toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    if (payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    // Provision or attach business
    let businessId = 'biz_' + crypto.randomBytes(4).toString('hex');
    businesses.push({
      id: businessId,
      name: payload.businessName,
      contactEmail: normalizedEmail,
      contactPhone: payload.phoneNumber,
      address: 'Registered Office',
      createdAt: new Date().toISOString(),
    });

    const newUserRecord: User & { passwordHash: string } = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: normalizedEmail,
      passwordHash: payload.password,
      name: payload.name,
      phoneNumber: payload.phoneNumber,
      phoneVerified: false,
      role: payload.role,
      businessId,
      businessName: payload.businessName,
      partnerId: payload.partnerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUserRecord);

    const { passwordHash, ...safeUser } = newUserRecord;
    const token = createSessionToken(safeUser.id, safeUser.role);

    // Generate initial SMS verification code
    generatePhoneCode(safeUser.id);

    await this.recordAudit({
      actorId: safeUser.id,
      actorName: safeUser.name,
      actorRole: safeUser.role,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: safeUser.id,
      details: `New account registered as ${safeUser.role} for business ${safeUser.businessName}.`,
    });

    return {
      token,
      user: safeUser,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };
  }

  async verifyToken(token: string): Promise<User | null> {
    const session = verifySessionToken(token);
    if (!session) return null;
    const found = users.find((u) => u.id === session.userId);
    if (!found) return null;
    const { passwordHash, ...safeUser } = found;
    return safeUser;
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; resetTokenPreview?: string }> {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Don't leak existence in production; in mock dev mode return preview for testing convenience
      return { success: true };
    }

    const token = generatePasswordResetToken(user.email);
    console.log(`[PASSWORD RESET MOCK] Reset link generated for ${email}: /reset-password?token=${token}`);

    await this.recordAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      details: `Password reset link requested for ${user.email}.`,
    });

    return { success: true, resetTokenPreview: token };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const entry = passwordResetStore.get(token);
    if (!entry) {
      throw new Error('Invalid or expired password reset token.');
    }
    if (Date.now() > entry.expiresAt) {
      passwordResetStore.delete(token);
      throw new Error('Password reset token has expired. Please request a new one.');
    }

    const user = users.find((u) => u.email.toLowerCase() === entry.email.toLowerCase());
    if (!user) {
      throw new Error('User not found.');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    user.passwordHash = newPassword;
    user.updatedAt = new Date().toISOString();
    passwordResetStore.delete(token);

    await this.recordAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: user.id,
      details: `Password changed successfully for ${user.email}.`,
    });

    return { success: true };
  }

  async verifyPhoneNumber(userId: string, code: string): Promise<{ success: boolean }> {
    const entry = phoneVerificationStore.get(userId);
    if (!entry) {
      throw new Error('No active verification code for this user.');
    }
    if (Date.now() > entry.expiresAt) {
      phoneVerificationStore.delete(userId);
      throw new Error('Verification code expired. Please request a new code.');
    }
    if (entry.code !== code.trim()) {
      throw new Error('Incorrect verification code. Please check your SMS and try again.');
    }

    const user = users.find((u) => u.id === userId);
    if (user) {
      user.phoneVerified = true;
      user.updatedAt = new Date().toISOString();
    }
    phoneVerificationStore.delete(userId);

    return { success: true };
  }

  isSuperAdminBootstrapAvailable(): boolean {
    return getBootstrapStatus().isAvailable;
  }

  async bootstrapSuperAdmin(
    secret: string,
    payload: { email: string; password: string; name: string }
  ): Promise<{ success: boolean; user: User }> {
    const isValid = redeemBootstrapToken(secret);
    if (!isValid) {
      throw new Error('Invalid or already consumed Super-Administrator bootstrap token.');
    }

    const normalizedEmail = payload.email.toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      existing.role = 'SUPER_ADMIN';
      existing.name = payload.name;
      existing.passwordHash = payload.password;
      existing.updatedAt = new Date().toISOString();

      const { passwordHash, ...safeUser } = existing;
      await this.recordAudit({
        actorId: safeUser.id,
        actorName: safeUser.name,
        actorRole: 'SUPER_ADMIN',
        action: 'SUPERADMIN_BOOTSTRAP',
        entityType: 'USER',
        entityId: safeUser.id,
        details: `Existing user ${safeUser.email} promoted to first Super-Admin via one-time bootstrap token.`,
      });
      return { success: true, user: safeUser };
    }

    const newAdmin: User & { passwordHash: string } = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: normalizedEmail,
      passwordHash: payload.password,
      name: payload.name,
      phoneNumber: '+1-000-000-0000',
      phoneVerified: true,
      role: 'SUPER_ADMIN',
      businessId: 'biz_platform',
      businessName: 'DispatchBridge Platform Engine',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newAdmin);
    const { passwordHash, ...safeUser } = newAdmin;

    await this.recordAudit({
      actorId: safeUser.id,
      actorName: safeUser.name,
      actorRole: 'SUPER_ADMIN',
      action: 'SUPERADMIN_BOOTSTRAP',
      entityType: 'USER',
      entityId: safeUser.id,
      details: `New Super-Admin ${safeUser.email} provisioned via verified one-time bootstrap token.`,
    });

    return { success: true, user: safeUser };
  }

  // --- Database Adapter ---
  async getDispatches(filter?: {
    businessId?: string;
    partnerId?: string;
    status?: string;
    role?: UserRole;
  }): Promise<Dispatch[]> {
    let result = [...dispatches];

    if (filter?.role === 'SUPER_ADMIN') {
      // Super admin sees all dispatches
      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filter?.role === 'RECEIVER') {
      if (filter.partnerId) {
        result = result.filter((d) => d.partnerId === filter.partnerId);
      }
    } else if (filter?.businessId) {
      result = result.filter((d) => d.businessId === filter.businessId);
    }

    if (filter?.status) {
      result = result.filter((d) => d.status === filter.status);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDispatchById(id: string): Promise<Dispatch | null> {
    const found = dispatches.find((d) => d.id === id);
    return found ? { ...found } : null;
  }

  async getDispatchByShareToken(token: string): Promise<Dispatch | null> {
    const found = dispatches.find((d) => d.shareToken === token);
    return found ? { ...found } : null;
  }

  async createDispatch(
    payload: Omit<Dispatch, 'id' | 'createdAt' | 'updatedAt' | 'shareToken' | 'status'>,
    actor: User
  ): Promise<Dispatch> {
    // Validation
    if (!payload.items || payload.items.length === 0) {
      throw new Error('A dispatch must include at least one item line.');
    }

    for (const item of payload.items) {
      if (!item.description || item.dispatchedQty <= 0) {
        throw new Error('All items must have a valid description and positive quantity.');
      }
    }

    const partner = partners.find((p) => p.id === payload.partnerId);
    if (!partner) {
      throw new Error('Selected partner does not exist.');
    }

    const nextId = 'dsp_' + crypto.randomBytes(4).toString('hex');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const dispatchNumber = `DSP-2026-${randomCode}`;
    const shareToken = 'sh_' + crypto.randomBytes(8).toString('hex');

    const totalDispatched = payload.items.reduce((sum, item) => sum + item.dispatchedQty, 0);

    const now = new Date().toISOString();
    const newDispatch: Dispatch = {
      ...payload,
      id: nextId,
      dispatchNumber,
      businessId: actor.businessId,
      businessName: actor.businessName,
      senderId: actor.id,
      senderName: actor.name,
      partnerId: partner.id,
      partnerName: partner.name,
      destinationAddress: payload.destinationAddress || partner.deliveryAddress,
      status: 'DISPATCHED',
      shareToken,
      dispatchedAt: now,
      totalItemsDispatched: totalDispatched,
      createdAt: now,
      updatedAt: now,
    };

    dispatches.unshift(newDispatch);

    // Audit log
    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DISPATCH_CREATED',
      entityType: 'DISPATCH',
      entityId: newDispatch.id,
      details: `Created dispatch ${newDispatch.dispatchNumber} to ${partner.name} (${totalDispatched} items).`,
      metadata: {
        partnerId: partner.id,
        itemCount: newDispatch.items.length,
        driver: newDispatch.driverName,
      },
    });

    // Send partner notification
    await this.notifyDispatchCreated(newDispatch, partner);

    return { ...newDispatch };
  }

  async markDispatchViewed(id: string, viewerIp?: string): Promise<Dispatch | null> {
    const dispatch = dispatches.find((d) => d.id === id);
    if (!dispatch) return null;

    const now = new Date().toISOString();
    const wasNeverViewed = !dispatch.firstViewedAt;

    if (wasNeverViewed) {
      dispatch.firstViewedAt = now;
      if (dispatch.status === 'DISPATCHED') {
        dispatch.status = 'VIEWED';
      }
    }
    dispatch.lastViewedAt = now;
    dispatch.updatedAt = now;

    if (wasNeverViewed) {
      await this.recordAudit({
        actorId: 'partner_link',
        actorName: `Partner (${dispatch.partnerName})`,
        actorRole: 'RECEIVER',
        action: 'DISPATCH_VIEWED',
        entityType: 'DISPATCH',
        entityId: dispatch.id,
        details: `Partner viewed delivery manifest ${dispatch.dispatchNumber} for the first time.`,
        metadata: { viewerIp: viewerIp || 'unknown' },
      });

      await this.notifyDispatchViewed(dispatch);
    }

    return { ...dispatch };
  }

  async recordReceipt(
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
  ): Promise<Dispatch> {
    const dispatch = dispatches.find((d) => d.id === id);
    if (!dispatch) {
      throw new Error('Dispatch not found.');
    }

    let totalRecv = 0;
    let totalLoss = 0;

    // Apply item level updates
    const updatedItems = dispatch.items.map((originalItem) => {
      const update = payload.items.find((i) => i.id === originalItem.id);
      if (!update) return originalItem;

      const received = Math.max(0, update.receivedQty);
      const loss = Math.max(0, update.lossQty);
      totalRecv += received;
      totalLoss += loss;

      return {
        ...originalItem,
        receivedQty: received,
        lossQty: loss,
        lossReason: loss > 0 ? update.lossReason || 'OTHER' : 'NONE',
        conditionNote: update.conditionNote || '',
      };
    });

    const now = new Date().toISOString();
    dispatch.items = updatedItems;
    dispatch.totalItemsReceived = totalRecv;
    dispatch.totalItemsLost = totalLoss;
    dispatch.receivedAt = now;
    dispatch.receiverSignoff = {
      signerName: payload.signoff.signerName,
      signerRole: payload.signoff.signerRole,
      signedAt: now,
      comments: payload.signoff.comments,
    };

    // Determine status
    if (totalLoss > 0) {
      dispatch.status = 'PARTIALLY_RECEIVED';
    } else {
      dispatch.status = 'RECEIVED';
    }
    dispatch.updatedAt = now;

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: totalLoss > 0 ? 'RECEIPT_DISCREPANCY_RECORDED' : 'RECEIPT_RECORDED',
      entityType: 'RECONCILIATION',
      entityId: dispatch.id,
      details: `Delivery receipt confirmed by ${payload.signoff.signerName}. Dispatched: ${dispatch.totalItemsDispatched}, Received: ${totalRecv}, Loss: ${totalLoss}.`,
      metadata: {
        totalReceived: totalRecv,
        totalLoss,
        status: dispatch.status,
      },
    });

    return { ...dispatch };
  }

  async finalizeReconciliation(
    id: string,
    payload: { resolutionNotes: string },
    actor: User
  ): Promise<Dispatch> {
    const dispatch = dispatches.find((d) => d.id === id);
    if (!dispatch) {
      throw new Error('Dispatch not found.');
    }

    const now = new Date().toISOString();
    dispatch.status = 'RECONCILED';
    dispatch.reconciledAt = now;
    dispatch.notes = (dispatch.notes ? dispatch.notes + '\n\n' : '') + `[Reconciliation Finalized by ${actor.name} on ${new Date().toLocaleDateString()}]: ${payload.resolutionNotes}`;
    dispatch.updatedAt = now;

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'RECONCILIATION_FINALIZED',
      entityType: 'RECONCILIATION',
      entityId: dispatch.id,
      details: `Reconciliation closed and finalized for ${dispatch.dispatchNumber}. Resolution: ${payload.resolutionNotes}`,
    });

    await this.notifyReconciliationCompleted(dispatch);

    return { ...dispatch };
  }

  async getPartners(businessId?: string): Promise<Partner[]> {
    if (businessId) {
      return partners.filter((p) => p.businessId === businessId);
    }
    return [...partners];
  }

  async createPartner(partner: Omit<Partner, 'id' | 'createdAt'>, actor: User): Promise<Partner> {
    if (!partner.name || !partner.email) {
      throw new Error('Partner company name and email are required.');
    }

    const nextId = 'part_' + crypto.randomBytes(4).toString('hex');
    const newPartner: Partner = {
      ...partner,
      id: nextId,
      businessId: actor.businessId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    partners.push(newPartner);

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PARTNER_REGISTERED',
      entityType: 'PARTNER',
      entityId: newPartner.id,
      details: `Registered partner ${newPartner.name} (${newPartner.type}).`,
    });

    return { ...newPartner };
  }

  async getAuditLogs(limitCount = 100): Promise<AuditLogEntry[]> {
    return [...auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  }

  async recordAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: 'aud_' + crypto.randomBytes(4).toString('hex'),
      timestamp: new Date().toISOString(),
    };
    auditLogs.unshift(fullEntry);
    return fullEntry;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return [...businesses];
  }

  async getSystemStatus(): Promise<SystemStatusInfo> {
    return {
      kernelVersion: '0.1.0-kernel',
      environment: (process.env.NODE_ENV as any) || 'development',
      platform: 'Progressive Web App (PWA) / Node.js Express Container',
      isNativeAndroid: false,
      databaseProvider: 'Sandbox In-Memory / Dev State',
      authProvider: 'Sandbox Mock JWT',
      notificationProvider: 'Console & Event Hub (Dev)',
      isMockActive: true,
      totalDispatches: dispatches.length,
      totalAuditEvents: auditLogs.length,
      totalPartners: partners.length,
      superAdminBootstrapAvailable: getBootstrapStatus().isAvailable,
      serverTime: new Date().toISOString(),
    };
  }

  // --- Notification Adapter ---
  async notifyDispatchCreated(dispatch: Dispatch, partner: Partner): Promise<void> {
    console.log(
      `[NOTIFICATION DISPATCH] Alert sent to partner ${partner.name} <${partner.email}> / ${partner.phone} for dispatch ${dispatch.dispatchNumber}. Tracking URL token: ${dispatch.shareToken}`
    );
  }

  async notifyDispatchViewed(dispatch: Dispatch): Promise<void> {
    console.log(
      `[NOTIFICATION VIEWED] Alert sent to sender ${dispatch.senderName} (${dispatch.businessName}): Delivery manifest ${dispatch.dispatchNumber} was viewed by partner.`
    );
  }

  async notifyReconciliationCompleted(dispatch: Dispatch): Promise<void> {
    console.log(
      `[NOTIFICATION RECONCILED] Finalized summary sent to sender and receiver for ${dispatch.dispatchNumber}.`
    );
  }
}

export const sandboxStore = new SandboxStore();
