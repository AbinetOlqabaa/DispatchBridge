import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Truck,
  Package,
  MapPin,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { DispatchItem, Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dispatchId: string) => void;
}

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [notes, setNotes] = useState('');

  // Item lines
  const [items, setItems] = useState<Array<Omit<DispatchItem, 'id'>>>([
    {
      sku: 'SKU-001',
      description: '',
      unit: 'cases',
      unitPrice: 0,
      dispatchedQty: 10,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPartners();
    }
  }, [isOpen]);

  const loadPartners = async () => {
    try {
      const data = await api.getPartners();
      setPartners(data);
      if (data.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(data[0].id);
        setDestinationAddress(data[0].deliveryAddress);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    const partner = partners.find((p) => p.id === partnerId);
    if (partner) {
      setDestinationAddress(partner.deliveryAddress);
    }
  };

  const handleAddItem = () => {
    const nextIndex = items.length + 1;
    setItems([
      ...items,
      {
        sku: `SKU-${String(nextIndex).padStart(3, '0')}`,
        description: '',
        unit: 'cases',
        unitPrice: 0,
        dispatchedQty: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof Omit<DispatchItem, 'id'>, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submission

    setErrorMessage(null);

    if (!selectedPartnerId) {
      setErrorMessage('Please select a receiving partner.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one line item to the dispatch.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const itm = items[i];
      if (!itm.description.trim()) {
        setErrorMessage(`Item #${i + 1} is missing a description.`);
        return;
      }
      if (itm.dispatchedQty <= 0) {
        setErrorMessage(`Item #${i + 1} (${itm.description}) must have quantity > 0.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload = {
        partnerId: selectedPartnerId,
        destinationAddress,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleReg: vehicleReg.trim(),
        notes: notes.trim(),
        items: items.map((itm, idx) => ({
          ...itm,
          id: `itm_${Date.now()}_${idx}`,
        })),
      };

      const created = await api.createDispatch(payload);
      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create dispatch manifest.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalUnits = items.reduce((sum, itm) => sum + (Number(itm.dispatchedQty) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <Truck className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Create New Delivery Dispatch</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Assemble an itemized delivery manifest with partner delivery destination and driver info.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Receiving Partner *</label>
              <select
                value={selectedPartnerId}
                onChange={(e) => handlePartnerChange(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Address *</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Street address, Dock number, City"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Carrier & Driver Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Driver Name</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Robert Lang"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Driver Phone</label>
              <input
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+1 555-019-9021"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle / Truck Plate</label>
              <input
                type="text"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value)}
                placeholder="TRK-4921"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Itemized Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                Manifest Cargo Items ({items.length})
              </label>
              <span className="text-xs font-mono text-indigo-300">Total Units: {totalUnits}</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 items-center text-xs"
                >
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                    />
                  </div>

                  <div className="col-span-5">
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description (e.g. Organic Almond Milk)"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>

                  <div className="col-span-2">
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200"
                    >
                      <option value="cases">cases</option>
                      <option value="boxes">boxes</option>
                      <option value="cartons">cartons</option>
                      <option value="bags">bags</option>
                      <option value="units">units</option>
                      <option value="kg">kg</option>
                      <option value="pallets">pallets</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={item.dispatchedQty}
                      onChange={(e) => handleItemChange(index, 'dispatchedQty', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-right"
                    />
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-500 hover:text-rose-400 disabled:opacity-30 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 mt-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Item Line</span>
            </button>
          </div>

          {/* Delivery Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Instructions & Handling Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Temperature-sensitive refrigerated goods. Unload at Dock 3."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              {isLoading ? (
                <span>Generating Manifest...</span>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Dispatch & Generate Tracking Link</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
