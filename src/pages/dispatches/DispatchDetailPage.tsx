import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Truck,
  Building,
  MapPin,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Dispatch, LossReason } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface DispatchDetailPageProps {
  dispatchId: string;
  onBack: () => void;
  onOpenPublicLink: (token: string) => void;
}

export const DispatchDetailPage: React.FC<DispatchDetailPageProps> = ({
  dispatchId,
  onBack,
  onOpenPublicLink,
}) => {
  const { user } = useAuth();
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reconciliation form state
  const [isReconciling, setIsReconciling] = useState(false);
  const [itemReceipts, setItemReceipts] = useState<
    Array<{
      id: string;
      receivedQty: number;
      lossQty: number;
      lossReason: LossReason;
      conditionNote: string;
    }>
  >([]);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('Receiving Supervisor');
  const [signoffComments, setSignoffComments] = useState('');

  // Finalize resolution state
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // UI submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [dispatchId]);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDispatch(dispatchId);
      setDispatch(data);
      // Initialize reconciliation state
      setItemReceipts(
        data.items.map((item) => ({
          id: item.id,
          receivedQty: item.receivedQty !== undefined ? item.receivedQty : item.dispatchedQty,
          lossQty: item.lossQty || 0,
          lossReason: item.lossReason || 'NONE',
          conditionNote: item.conditionNote || '',
        }))
      );
      if (user) {
        setSignerName(user.name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dispatch details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!dispatch) return;
    const url = `${window.location.origin}/?token=${dispatch.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleItemReceiptChange = (
    index: number,
    field: 'receivedQty' | 'lossReason' | 'conditionNote',
    val: any
  ) => {
    const updated = [...itemReceipts];
    const originalItem = dispatch?.items[index];
    if (!originalItem) return;

    if (field === 'receivedQty') {
      const recv = Math.max(0, parseInt(val) || 0);
      const loss = Math.max(0, originalItem.dispatchedQty - recv);
      updated[index].receivedQty = recv;
      updated[index].lossQty = loss;
      if (loss === 0) {
        updated[index].lossReason = 'NONE';
      } else if (updated[index].lossReason === 'NONE') {
        updated[index].lossReason = 'DAMAGED_IN_TRANSIT';
      }
    } else {
      updated[index][field] = val;
    }
    setItemReceipts(updated);
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatch || isSubmitting) return;

    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    try {
      const updated = await api.recordReceipt(dispatch.id, {
        items: itemReceipts,
        signoff: {
          signerName: signerName.trim() || 'Verified Receiver',
          signerRole: signerRole.trim() || 'Receiving Staff',
          comments: signoffComments.trim(),
        },
      });
      setDispatch(updated);
      setIsReconciling(false);
      setActionSuccess('Delivery receipt verified and reconciliation recorded successfully.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to record reconciliation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatch || isSubmitting) return;

    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    try {
      const updated = await api.finalizeReconciliation(dispatch.id, resolutionNotes.trim());
      setDispatch(updated);
      setIsFinalizing(false);
      setActionSuccess('Reconciliation successfully closed and finalized.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to finalize reconciliation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading dispatch manifest & audit trail..." />;
  if (error || !dispatch) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <p className="text-rose-400 mb-4">{error || 'Dispatch not found.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Return to Dispatch List
        </button>
      </div>
    );
  }

  const canReconcile =
    user &&
    ['RECEIVER', 'BUSINESS_OWNER', 'SUPER_ADMIN'].includes(user.role) &&
    ['DISPATCHED', 'VIEWED', 'IN_TRANSIT'].includes(dispatch.status);

  const canFinalize =
    user &&
    ['BUSINESS_OWNER', 'SUPER_ADMIN'].includes(user.role) &&
    dispatch.status === 'PARTIALLY_RECEIVED';

  const shareUrl = `${window.location.origin}/?token=${dispatch.shareToken}`;

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dispatches</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenPublicLink(dispatch.shareToken)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 text-xs font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Partner View</span>
          </button>
        </div>
      </div>

      {/* Manifest Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-mono text-xl font-bold text-white">{dispatch.dispatchNumber}</span>
              <StatusBadge status={dispatch.status} />
            </div>
            <p className="text-xs text-slate-400">
              Dispatched on {new Date(dispatch.createdAt).toLocaleString()} by {dispatch.senderName} ({dispatch.businessName})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-medium text-slate-400">Total Manifest Cargo</div>
              <div className="text-lg font-bold text-white font-mono">{dispatch.totalItemsDispatched} units</div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>Receiving Partner</span>
            </div>
            <div className="font-semibold text-white text-sm">{dispatch.partnerName}</div>
            <div className="text-slate-400 text-[11px] mt-0.5 truncate">{dispatch.destinationAddress}</div>
          </div>

          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Carrier & Driver</span>
            </div>
            <div className="font-semibold text-white text-sm">{dispatch.driverName || 'Self-delivery / Unassigned'}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              {dispatch.vehicleReg ? `Plate: ${dispatch.vehicleReg}` : ''} {dispatch.driverPhone ? `• ${dispatch.driverPhone}` : ''}
            </div>
          </div>

          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 mb-1 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Partner Manifest Tracking</span>
            </div>
            {dispatch.firstViewedAt ? (
              <div>
                <div className="font-semibold text-indigo-300 text-sm">Acknowledged & Viewed</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  First opened: {new Date(dispatch.firstViewedAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-semibold text-slate-400 text-sm">Not Viewed Yet</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Partner hasn't opened link</div>
              </div>
            )}
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden w-full">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Partner Delivery Link:</span>
            <span className="text-xs font-mono text-indigo-300 truncate select-all">{shareUrl}</span>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>

        {dispatch.notes && (
          <div className="text-xs bg-slate-800/30 p-3 rounded-xl text-slate-300 border border-slate-800">
            <span className="font-semibold text-slate-400 block mb-0.5">Dispatcher Instructions:</span>
            <p className="whitespace-pre-line">{dispatch.notes}</p>
          </div>
        )}
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Item Manifest Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            Itemized Manifest Lines ({dispatch.items.length})
          </h2>
          {canReconcile && !isReconciling && (
            <button
              onClick={() => setIsReconciling(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md shadow-amber-600/20"
            >
              Record Dock Receipt & Reconciliation
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">SKU</th>
                <th className="pb-3 font-semibold">Item Description</th>
                <th className="pb-3 font-semibold text-right">Dispatched</th>
                <th className="pb-3 font-semibold text-right">Received</th>
                <th className="pb-3 font-semibold text-right">Shortfall / Loss</th>
                <th className="pb-3 font-semibold">Loss Reason</th>
                <th className="pb-3 font-semibold">Condition Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {dispatch.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30">
                  <td className="py-3 text-slate-400">{item.sku}</td>
                  <td className="py-3 font-sans font-medium text-slate-200">
                    {item.description}
                  </td>
                  <td className="py-3 text-right text-slate-200 font-bold">
                    {item.dispatchedQty} {item.unit}
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-400">
                    {item.receivedQty !== undefined ? `${item.receivedQty} ${item.unit}` : '—'}
                  </td>
                  <td className="py-3 text-right font-bold">
                    {item.lossQty && item.lossQty > 0 ? (
                      <span className="text-rose-400">-{item.lossQty} {item.unit}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3 font-sans">
                    {item.lossReason && item.lossReason !== 'NONE' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                        {item.lossReason.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-3 font-sans text-slate-400 text-[11px]">
                    {item.conditionNote || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receiver Sign-Off Card (if already received) */}
      {dispatch.receiverSignoff && (
        <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Verified Delivery Sign-Off Certificate</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-500">Signed By:</span>
              <div className="font-semibold text-slate-200">{dispatch.receiverSignoff.signerName}</div>
              <div className="text-[11px] text-slate-400">{dispatch.receiverSignoff.signerRole}</div>
            </div>
            <div>
              <span className="text-slate-500">Verification Timestamp:</span>
              <div className="font-semibold text-slate-200">
                {new Date(dispatch.receiverSignoff.signedAt).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Receiver Comments:</span>
              <div className="text-slate-300">{dispatch.receiverSignoff.comments || 'No remarks provided.'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form: Record Dock Receipt (if opened by user) */}
      {isReconciling && canReconcile && (
        <div className="bg-slate-900 border border-amber-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Record Dock Receipt & Physical Count</h3>
            </div>
            <button
              onClick={() => setIsReconciling(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmitReconciliation} className="space-y-4">
            <p className="text-xs text-slate-400">
              Input the exact count received on the loading dock. If there is a shortfall or damaged packaging, pick the appropriate loss categorization code.
            </p>

            <div className="space-y-3">
              {dispatch.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white">
                      {item.sku} - {item.description}
                    </span>
                    <span className="text-slate-400 font-mono">Dispatched: {item.dispatchedQty} {item.unit}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Received Count ({item.unit}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={item.dispatchedQty}
                        value={itemReceipts[idx]?.receivedQty || 0}
                        onChange={(e) => handleItemReceiptChange(idx, 'receivedQty', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Loss Reason (if short)
                      </label>
                      <select
                        value={itemReceipts[idx]?.lossReason || 'NONE'}
                        onChange={(e) => handleItemReceiptChange(idx, 'lossReason', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="NONE">None (Full Count)</option>
                        <option value="DAMAGED_IN_TRANSIT">Damaged In Transit</option>
                        <option value="SHORTAGE_AT_SENDER">Shortage At Sender</option>
                        <option value="EXPIRED_OR_COMPROMISED">Expired / Compromised</option>
                        <option value="WRONG_ITEM_DELIVERED">Wrong Item Delivered</option>
                        <option value="THEFT_OR_PILFERAGE">Theft / Pilferage</option>
                        <option value="REJECTED_BY_RECEIVER">Rejected by Receiver</option>
                        <option value="OTHER">Other Reason</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Damage / Condition Note
                      </label>
                      <input
                        type="text"
                        value={itemReceipts[idx]?.conditionNote || ''}
                        onChange={(e) => handleItemReceiptChange(idx, 'conditionNote', e.target.value)}
                        placeholder="e.g. Carton punctured on bottom"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sign-off inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Receiver Signer Name *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supervisor / Role Title *</label>
                <input
                  type="text"
                  required
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="Receiving Dock Manager"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dock Notes & Cargo Comments</label>
              <textarea
                rows={2}
                value={signoffComments}
                onChange={(e) => setSignoffComments(e.target.value)}
                placeholder="Optional carrier remarks, seals intact, driver signature notes..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReconciling(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-amber-600/30"
              >
                {isSubmitting ? 'Recording receipt...' : 'Confirm Delivery & Submit Sign-Off'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Finalize Reconciliation Action (for Business Owner if shortfall reported) */}
      {canFinalize && !isFinalizing && (
        <div className="bg-slate-900 border border-purple-900/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Discrepancy Pending Resolution: {dispatch.totalItemsLost} units lost
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              As business owner, approve credit note or adjust invoice to close and finalize this manifest.
            </p>
          </div>
          <button
            onClick={() => setIsFinalizing(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl cursor-pointer shrink-0 shadow-lg shadow-purple-600/20"
          >
            Finalize & Close Manifest
          </button>
        </div>
      )}

      {isFinalizing && (
        <div className="bg-slate-900 border border-purple-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Finalize Reconciliation Resolution</h3>
            <button onClick={() => setIsFinalizing(false)} className="text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
          <form onSubmit={handleFinalizeReconciliation} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Resolution Statement & Credit Note Reference *
              </label>
              <textarea
                required
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Credit Note #CN-8809 issued for 4 damaged olive oil boxes. Carrier insurance claim #CLM-102 filed."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFinalizing(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {isSubmitting ? 'Closing...' : 'Close & Finalize Manifest'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
