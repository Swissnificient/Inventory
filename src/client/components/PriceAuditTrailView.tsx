import React, { useState, useMemo } from 'react';
import {
  PriceAuditLog,
  Product,
  User
} from '../../shared/types';
import { formatNaira } from '../../shared/fmcg-utils';
import {
  ShieldAlert,
  Search,
  RotateCcw
} from 'lucide-react';

interface PriceAuditTrailViewProps {
  auditLogs: PriceAuditLog[];
  products: Product[];
  users: User[];
  activeUser: User;
  onRevertPrice: (log: PriceAuditLog) => void;
  onOpenPriceModal: (product: Product) => void;
}

export const PriceAuditTrailView: React.FC<PriceAuditTrailViewProps> = ({
  auditLogs,
  products,
  users,
  onRevertPrice
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditLogs.filter(log => {
      if (staffFilter !== 'ALL' && log.changedByUserId !== staffFilter) return false;
      if (onlyFlagged && !log.flaggedHighRisk) return false;
      if (!q) return true;
      return (
        log.productName.toLowerCase().includes(q) ||
        log.changedByName.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, searchQuery, staffFilter, onlyFlagged]);

  const flaggedTotal = useMemo(
    () => auditLogs.filter(l => l.flaggedHighRisk).length,
    [auditLogs]
  );

  return (
    <div className="space-y-6">
      {/* Clean Filter Bar */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Staff Price Modification Audit Trail
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Permanent, non-deletable record of every price change across warehouse devices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search staff or product..."
              className="input-clean w-full pl-10"
            />
          </div>

          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="input-clean !w-auto"
          >
            <option value="ALL">All Staff</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <button
            onClick={() => setOnlyFlagged(!onlyFlagged)}
            className={`h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              onlyFlagged
                ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-300'
                : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Flagged ({flaggedTotal})</span>
          </button>
        </div>
      </div>

      {/* Clean Forensic Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-5">Date & Time</th>
                <th className="py-4 px-5">Staff Member</th>
                <th className="py-4 px-5">Product & Unit</th>
                <th className="py-4 px-5">Price Change</th>
                <th className="py-4 px-5">Reason & Device</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-sm">
              {filteredLogs.map(log => {
                const product = products.find(p => p.id === log.productId);
                return (
                  <tr
                    key={log.id}
                    className={`transition ${
                      log.flaggedHighRisk
                        ? 'bg-rose-500/5 hover:bg-rose-500/10'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {new Date(log.createdAt).toLocaleString('en-NG')}
                      </div>
                      {log.flaggedHighRisk && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-300">
                          <ShieldAlert className="w-3 h-3" />
                          Flagged
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {log.changedByName}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {log.changedByRole}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {log.productName}
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {log.unitTier}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 line-through">
                          {formatNaira(log.oldPrice)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatNaira(log.newPrice)}
                        </span>
                      </div>
                      <div
                        className={`text-xs font-semibold mt-0.5 ${
                          log.priceDiff >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {log.priceDiff >= 0 ? '+' : ''}
                        {formatNaira(log.priceDiff)} ({log.percentChange >= 0 ? '+' : ''}
                        {log.percentChange}%)
                      </div>
                    </td>

                    <td className="py-4 px-5 max-w-xs">
                      <div className="text-xs text-slate-800 dark:text-slate-200">
                        "{log.reason}"
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {log.deviceFingerprint}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      {product && (
                        <button
                          onClick={() => onRevertPrice(log)}
                          className="btn-secondary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
