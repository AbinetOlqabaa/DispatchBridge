import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// List dispatches for current authenticated user
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { status } = req.query as { status?: string };

    const dispatches = await sandboxStore.getDispatches({
      role: user.role,
      businessId: user.businessId,
      partnerId: user.partnerId,
      status,
    });

    res.json(dispatches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public partner view (via share token) - automatically records viewing
router.get('/public/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    const dispatch = await sandboxStore.getDispatchByShareToken(shareToken);

    if (!dispatch) {
      res.status(404).json({ error: 'Delivery list not found or link has expired.' });
      return;
    }

    // Mark as viewed
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const updated = await sandboxStore.markDispatchViewed(dispatch.id, String(clientIp));

    res.json(updated || dispatch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get dispatch by ID (authenticated)
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const dispatch = await sandboxStore.getDispatchById(id);

    if (!dispatch) {
      res.status(404).json({ error: 'Dispatch not found.' });
      return;
    }

    // Authorization check: sender/owner must match business, receiver must match partner (unless SUPER_ADMIN)
    const user = req.user!;
    if (user.role !== 'SUPER_ADMIN') {
      if (user.role === 'RECEIVER') {
        if (user.partnerId && dispatch.partnerId !== user.partnerId) {
          res.status(403).json({ error: 'Forbidden: You do not have access to this dispatch.' });
          return;
        }
      } else if (dispatch.businessId !== user.businessId) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this dispatch.' });
        return;
      }
    }

    res.json(dispatch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new dispatch (Senders, Owners, SuperAdmins)
router.post(
  '/',
  authenticate,
  requireRole('SENDER', 'BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const newDispatch = await sandboxStore.createDispatch(req.body, user);
      res.status(201).json(newDispatch);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create dispatch.' });
    }
  }
);

// Record delivery receipt & reconcile quantities (Receivers, Owners, SuperAdmins)
router.post(
  '/:id/reconcile',
  authenticate,
  requireRole('RECEIVER', 'BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updated = await sandboxStore.recordReceipt(id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to record receipt.' });
    }
  }
);

// Finalize reconciliation (Business Owner or Super Admin resolution)
router.post(
  '/:id/finalize',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updated = await sandboxStore.finalizeReconciliation(id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to finalize reconciliation.' });
    }
  }
);

export default router;
