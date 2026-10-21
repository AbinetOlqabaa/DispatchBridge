import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Building,
  MapPin,
  Calendar,
  Clock,
  Printer,
  ShieldCheck,
  UserCheck,
  Package,
} from 'lucide-react';
import { Dispatch, LossReason } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface PublicPartnerViewProps {
  shareToken: string;
  onExit?: () => void;
}

export const PublicPartnerView: React.FC<PublicPartnerViewProps> = ({ shareToken, onExit }) => {
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt verification form
  const [isVerifying, setIsVerifying] = useState(false);
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
  const [signerRole, setSignerRole] = useState('Receiving Manager');
  const [comments, setComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicDispatch();
  }, [shareToken]);

  const loadPublicDispatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPublicDispatch(shareToken);
      setDispatch(data);
      setItemReceipts(
        data.items.map((i) => ({
          id: i.id,
          receivedQty: i.receivedQty !== undefined ? i.receivedQty : i.dispatchedQty,
          lossQty: i.lossQty || 0,
          lossReason: i.lossReason || 'NONE',
          conditionNote: i.conditionNote || '',
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Delivery manifest not found or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemCountChange = (index: number, receivedCount: number) => {
    if (!dispatch) return;
    const original = dispatch.items[index];
    const recv = Math.max(0, receivedCount);
    const loss = Math.max(0, original.dispatchedQty - recv);

    const updated = [...itemReceipts];
    updated[index].receivedQty = recv;
    updated[index].lossQty = loss;
    if (loss === 0) {
      updated[index].lossReason = 'NONE';
    } else if (updated[index].lossReason === 'NONE') {
      updated[index].lossReason = 'DAMAGED_IN_TRANSIT';
    }
    setItemReceipts(updated);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatch || isSubmitting) return;

    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    try {
      const updated = await api.recordReceipt(dispatch.id, {
        items: itemReceipts,
        signoff: {
          signerName: signerName.trim() || 'Verified Receiver',
          signerRole: signerRole.trim() || 'Dock Lead',
          comments: comments.trim(),
        },
      });
      setDispatch(updated);
      setIsVerifying(false);
      setSubmitSuccess('Official delivery receipt signed and verified! The sender has been notified.');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit receipt confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Retrieving secure delivery manifest..." />;

  if (error || !dispatch) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Invalid or Expired Link</h2>
        <p className="text-xs text-slate-400">{error || 'This delivery link could not be verified.'}</p>
        {onExit && (
          <button
            onClick={onExit}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Return to App
          </button>
        )}
      </div>
    );
  }

  const isAlreadyReceived = ['PARTIALLY_RECEIVED', 'RECEIVED', 'RECONCILED'].includes(dispatch.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-6">
      {/* Top Banner with exit and print */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">DispatchBridge Partner Portal</div>
            <div className="text-[10px] text-slate-400">Authenticated Delivery Slip</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Slip</span>
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Slip Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              Supplier Delivery Manifest
            </div>
            <h1 className="text-2xl font-bold font-mono text-white mt-0.5">{dispatch.dispatchNumber}</h1>
            <p className="text-xs text-slate-400">Issued by {dispatch.businessName}</p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
            <StatusBadge status={dispatch.status} />
            <span className="text-[11px] text-slate-400 font-mono">
              Sent: {dispatch.dispatchedAt ? new Date(dispatch.dispatchedAt).toLocaleDateString() : 'Today'}
            </span>
          </div>
        </div>

        {/* Shipper & Receiver details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Delivering Shipper:</span>
            <div className="font-bold text-white text-sm">{dispatch.businessName}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">Dispatcher: {dispatch.senderName}</div>
            <div className="text-slate-400 text-[11px]">
              Driver: {dispatch.driverName || 'Standard Freight'} ({dispatch.vehicleReg || 'TRK'})
            </div>
          </div>

          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Receiving Destination:</span>
            <div className="font-bold text-white text-sm">{dispatch.partnerName}</div>
            <div className="text-slate-400 text-[11px] mt-0.5 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>{dispatch.destinationAddress}</span>
            </div>
          </div>
        </div>

        {/* Live Tracking Confirmation */}
        <div className="bg-indigo-950/40 border border-indigo-900/60 p-3 rounded-xl flex items-center gap-2.5 text-xs text-indigo-200">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">Receipt Acknowledged:</span> Opening this delivery manifest confirmed receipt viewing on the shipper's dispatch audit board.
          </div>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Manifest Items List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-400" />
            Cargo Checklist ({dispatch.items.length} items)
          </h2>
          <span className="text-xs font-mono font-semibold text-slate-300">
            Total Dispatched: {dispatch.totalItemsDispatched} units
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {dispatch.items.map((item, idx) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-mono text-[11px] text-indigo-300 font-semibold mr-2">{item.sku}</span>
                <span className="font-semibold text-slate-200">{item.description}</span>
                {item.conditionNote && (
                  <p className="text-[11px] text-rose-300 mt-0.5">Note: {item.conditionNote}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <span className="text-[11px] text-slate-500 block">Sent</span>
                  <span className="font-mono font-bold text-slate-200">
                    {item.dispatchedQty} {item.unit}
                  </span>
                </div>

                {item.receivedQty !== undefined && (
                  <div>
                    <span className="text-[11px] text-slate-500 block">Received</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {item.receivedQty} {item.unit}
                    </span>
                  </div>
                )}

                {item.lossQty && item.lossQty > 0 ? (
                  <div>
                    <span className="text-[11px] text-rose-400 block font-semibold">Short</span>
                    <span className="font-mono font-bold text-rose-400">
                      -{item.lossQty} {item.unit}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Certificate if received */}
      {isAlreadyReceived && dispatch.receiverSignoff && (
        <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-5 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Delivery Acknowledged & Signed</span>
          </div>
          <div className="text-slate-300">
            Signer: <strong className="text-white">{dispatch.receiverSignoff.signerName}</strong> (
            {dispatch.receiverSignoff.signerRole}) on{' '}
            {new Date(dispatch.receiverSignoff.signedAt).toLocaleString()}
          </div>
          {dispatch.receiverSignoff.comments && (
            <div className="text-slate-400 italic">"{dispatch.receiverSignoff.comments}"</div>
          )}
        </div>
      )}

      {/* Interactive Verification Form on Dock */}
      {!isAlreadyReceived && !isVerifying && (
        <div className="bg-slate-900 border border-amber-900/60 rounded-2xl p-6 text-center space-y-3">
          <h3 className="text-sm font-bold text-white">Unload & Confirm Delivery on Dock</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Receiving supervisor: Count items offloaded from the carrier truck. Verify physical items match this manifest.
          </p>
          <button
            onClick={() => setIsVerifying(true)}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer"
          >
            Start Dock Count & Sign Off
          </button>
        </div>
      )}

      {isVerifying && (
        <div className="bg-slate-900 border border-amber-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Confirm Dock Count & Sign Off</h3>
            <button onClick={() => setIsVerifying(false)} className="text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReceipt} className="space-y-4">
            <div className="space-y-3">
              {dispatch.items.map((item, idx) => (
                <div key={item.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">{item.description}</span>
                    <span className="text-slate-400 font-mono">Dispatched: {item.dispatchedQty} {item.unit}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Received ({item.unit})</label>
                      <input
                        type="number"
                        min={0}
                        max={item.dispatchedQty}
                        value={itemReceipts[idx]?.receivedQty || 0}
                        onChange={(e) => handleItemCountChange(idx, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Loss Reason (if short)</label>
                      <select
                        value={itemReceipts[idx]?.lossReason || 'NONE'}
                        onChange={(e) => {
                          const updated = [...itemReceipts];
                          updated[idx].lossReason = e.target.value as LossReason;
                          setItemReceipts(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      >
                        <option value="NONE">None (Full Count)</option>
                        <option value="DAMAGED_IN_TRANSIT">Damaged In Transit</option>
                        <option value="SHORTAGE_AT_SENDER">Shortage At Sender</option>
                        <option value="WRONG_ITEM_DELIVERED">Wrong Item</option>
                        <option value="EXPIRED_OR_COMPROMISED">Expired / Spoiled</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Damage / Shortage Note</label>
                      <input
                        type="text"
                        value={itemReceipts[idx]?.conditionNote || ''}
                        onChange={(e) => {
                          const updated = [...itemReceipts];
                          updated[idx].conditionNote = e.target.value;
                          setItemReceipts(updated);
                        }}
                        placeholder="e.g. 2 boxes crushed"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Signer Full Name *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. David Miller"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title / Role *</label>
                <input
                  type="text"
                  required
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="e.g. Receiving Dock Lead"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dock Comments & Seal Inspection</label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional comments regarding vehicle cleanliness, pallet condition..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsVerifying(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                {isSubmitting ? 'Submitting receipt...' : 'Submit Official Dock Sign-Off'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
