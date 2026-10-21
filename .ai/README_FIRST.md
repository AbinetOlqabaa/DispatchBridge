# DispatchBridge AI Context & Extension Guidelines

Welcome to the DispatchBridge repository.

## Project Summary
DispatchBridge is an enterprise Business Dispatch & Delivery Reconciliation system designed for B2B logistics, wholesale suppliers, and retail store distribution. It provides:
1. Dispatch creation with item-level manifests.
2. Secure partner sharing links and automatic "viewed" tracking.
3. Delivery reconciliation with item-level quantity checks (dispatched vs. received vs. lost) and loss categorization.
4. Immutable, tamper-evident audit logging for all changes.
5. Role-based access control (`SUPER_ADMIN`, `BUSINESS_OWNER`, `SENDER`, `RECEIVER`).

## Current Kernel State
The workspace has completed the **Kernel Phase** (Phase 1).
Refer to `BUILD_STATE.md` for current platform status, test accounts, and architectural layout.

## Extension Guidelines
- When implementing further phases, maintain the adapter architecture (`src/server/adapters/` and `src/services/`).
- Do not introduce mock data into production adapters; keep mock data strictly isolated within the development sandbox adapter.
- Privileged operations must always remain server-validated via Express middleware.
