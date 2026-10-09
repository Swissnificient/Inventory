import React, { useState } from 'react';
import { Product, User, UnitTier } from '../../shared/types';
import { formatNaira, getUnitPrice } from '../../shared/fmcg-utils';
import { Fingerprint, ShieldAlert, Lock, CheckCircle2, X } from 'lucide-react';

interface PriceModifyModalProps {
  product: Product;
  users: User[];
  activeUser: User;
  deviceFingerprint: string;
  onClose: () => void;
  onConfirmPriceChange: (params: {
    productId: string;
    unitTier: UnitTier;
    newPrice: number;
    reason: string;
    staffUser: User;
  }) => void;
}

const REASON_PRESETS = [
  'Supplier batch price increase',
  'CEO approved bulk discount',
  'Market day price alignment'
];

export const PriceModifyModal: React.FC<PriceModifyModalProps> = ({
  product,
  users,
  activeUser,
  onClose,
  onConfirmPriceChange
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(activeUser.id);
  const [unitTier, setUnitTier] = useState<UnitTier>('CARTON');
  const [newPriceInput, setNewPriceInput] = useState<string>(String(product.cartonPrice));
  const [pinInput, setPinInput] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedStaff = users.find(u => u.id === selectedUserId) || activeUser;
  const currentPrice = getUnitPrice(product, unitTier);
  const parsedNewPrice = Math.round(Number(newPriceInput) || 0);

  const handleTierSwitch = (tier: UnitTier) => {
    setUnitTier(tier);
    setNewPriceInput(String(getUnitPrice(product, tier)));
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (parsedNewPrice <= 0) {
      setErrorMsg('Please enter a valid price greater than ₦0.');
      return;
    }
    if (parsedNewPrice === currentPrice) {
      setErrorMsg('New price is the same as the current price.');
      return;
    }
    if (pinInput.trim() !== selectedStaff.pin) {
      setErrorMsg(
        `Invalid PIN for ${selectedStaff.name}. (Demo hint: PIN is ${selectedStaff.pin})`
      );
      return;
    }
    if (reason.trim().length < 4) {
      setErrorMsg('Please enter a reason for the audit record.');
      return;
    }

    onConfirmPriceChange({
      productId: product.id,
      unitTier,
      newPrice: parsedNewPrice,
      reason: reason.trim(),
      staffUser: selectedStaff
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="surface-card max-w-lg w-full shadow-2xl overflow-hidden my-8">
        {/* Clean Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Modify Price • {product.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recorded permanently under staff ID
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Packaging Tier */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              Unit Tier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { tier: 'CARTON', label: 'Carton', price: product.cartonPrice },
                  { tier: 'PACK', label: 'Pack', price: product.packPrice },
                  { tier: 'PIECE', label: 'Piece', price: product.piecePrice },
                  { tier: 'COST_CARTON', label: 'Cost/Ctn', price: product.costPriceCarton }
                ] as const
              ).map(item => (
                <button
                  type="button"
                  key={item.tier}
                  onClick={() => handleTierSwitch(item.tier)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    unitTier === item.tier
                      ? 'bg-emerald-500/15 border-emerald-500 text-slate-900 dark:text-white'
                      : 'surface-muted text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-medium">{item.label}</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatNaira(item.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current vs New Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Current Price
              </label>
              <div className="input-clean flex items-center font-semibold bg-slate-50 dark:bg-slate-900">
                {formatNaira(currentPrice)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                New Price (₦)
              </label>
              <input
                type="number"
                min={1}
                step="any"
                value={newPriceInput}
                onChange={e => setNewPriceInput(e.target.value)}
                className="input-clean w-full font-bold !text-base"
                required
              />
            </div>
          </div>

          {/* Staff Member & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Staff Member
              </label>
              <select
                value={selectedUserId}
                onChange={e => {
                  setSelectedUserId(e.target.value);
                  setErrorMsg('');
                }}
                className="input-clean w-full"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Staff PIN</span>
                <button
                  type="button"
                  onClick={() => setPinInput(selectedStaff.pin)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Use Demo PIN ({selectedStaff.pin})
                </button>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder={`PIN (${selectedStaff.pin})`}
                  className="input-clean w-full pl-10 font-mono tracking-widest"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Reason for Price Change
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="input-clean w-full"
              required
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {REASON_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setReason(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Price Change</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
