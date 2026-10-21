import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// Get audit logs (Super Admin and Business Owner only)
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'BUSINESS_OWNER'),
  async (_req: AuthenticatedRequest, res) => {
    try {
      const logs = await sandboxStore.getAuditLogs(100);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
