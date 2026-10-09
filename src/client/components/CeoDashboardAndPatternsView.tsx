import React from 'react';
import {
  WeeklyPatternAnalytics,
  Product,
  PriceAuditLog
} from '../../shared/types';
import {
  formatCompactNaira,
  formatNaira,
  isLowStock
} from '../../shared/fmcg-utils';
import {
  TrendingUp,
  AlertTriangle,
  Fingerprint,
  Flame,
  Calendar,
  ArrowUpRight,
  Wallet
} from 'lucide-react';

interface CeoDashboardAndPatternsViewProps {
  analytics: WeeklyPatternAnalytics;
  products: Product[];
  auditLogs: PriceAuditLog[];
  onNavigateTab: (tab: 'INVENTORY' | 'AUDIT' | 'POS' | 'REPORTS') => void;
  onOpenPriceModal: (product: Product) => void;
}

export const CeoDashboardAndPatternsView: React.FC<CeoDashboardAndPatternsViewProps> = ({
  analytics,
  products,
  auditLogs,
  onNavigateTab,
  onOpenPriceModal
}) => {
  const lowStockItems = products.filter(isLowStock);
  const flaggedAudits = auditLogs.filter(a => a.flaggedHighRisk);
  const maxDayRevenue = Math.max(1, ...analytics.dayOfWeekPatterns.map(d => d.revenue));
  const peakDay = [...analytics.dayOfWeekPatterns].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div className="space-y-8">
      {/* Row 1: 4 Clean, Breathable Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Revenue */}
        <div className="surface-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              7-Day Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatNaira(analytics.totalRevenue7d)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Today's Sales:{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatNaira(analytics.revenueToday)}
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Net Profit & Expenses */}
        <div className="surface-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              7-Day Net Profit
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatNaira(analytics.netProfit7d)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Gross: {formatCompactNaira(analytics.grossProfit7d)} • Expenses:{' '}
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                -{formatCompactNaira(analytics.totalExpenses7d)}
              </span>
            </p>
          </div>
        </div>

        {/* Card 3: Low Stock & Expiry Watch */}
        <button
          onClick={() => onNavigateTab('INVENTORY')}
          className="surface-card p-6 text-left flex flex-col justify-between hover:border-rose-500/50 transition group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock & Expiry Alerts
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{lowStockItems.length} Low Stock</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
              {analytics.expiringBatchesCount} batches expiring soon • Click to restock
            </p>
          </div>
        </button>

        {/* Card 4: Staff Price Fingerprint Audit */}
        <button
          onClick={() => onNavigateTab('AUDIT')}
          className="surface-card p-6 text-left flex flex-col justify-between hover:border-amber-500/50 transition group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Price Fingerprint Log
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{auditLogs.length} Changes</span>
              {flaggedAudits.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  {flaggedAudits.length} Flagged
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
              {auditLogs[0]
                ? `Last by ${auditLogs[0].changedByName} (${auditLogs[0].unitTier})`
                : 'No recent price changes'}
            </p>
          </div>
        </button>
      </div>

      {/* Row 2: Weekly Pattern Recognition (2 Spacious Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 7-Day Market Demand Curve (5 cols) */}
        <div className="lg:col-span-5 surface-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Weekly Demand Pattern</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Daily revenue & carton volume across the last 7 days
              </p>
            </div>
            {peakDay && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                Peak: {peakDay.dayName}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {analytics.dayOfWeekPatterns.map(day => {
              const widthPct = Math.max(6, Math.round((day.revenue / maxDayRevenue) * 100));
              const isPeak = peakDay && day.dateStr === peakDay.dateStr && day.revenue > 0;

              return (
                <div key={day.dateStr} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 w-8">
                        {day.dayName}
                      </span>
                      <span className="text-slate-400">{day.dateStr.slice(5)}</span>
                      {isPeak && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          Peak Day
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">
                        {day.cartonsMoved} Ctns
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white w-24 text-right">
                        {formatNaira(day.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isPeak ? 'bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Highest Selling Stock in the Week (7 cols) */}
        <div className="lg:col-span-7 surface-card overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Highest-Selling Stock This Week</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ranked by 7-day sales velocity, peak day pattern, and stockout countdown
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('INVENTORY')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View All Stock →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-4">7-Day Volume</th>
                  <th className="py-3.5 px-4">Revenue & Profit</th>
                  <th className="py-3.5 px-4">Burn Rate & Stock</th>
                  <th className="py-3.5 px-5 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70 text-sm">
                {analytics.topSellingProducts.slice(0, 6).map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  return (
                    <tr
                      key={item.productId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                              idx === 0
                                ? 'bg-amber-500 text-white dark:text-slate-950'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.productName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Peak Day: <strong className="font-medium">{item.peakDayOfWeek}</strong>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.cartonsSold7d} Ctns
                        </div>
                        <span
                          className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.trendLabel === 'SURGING'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.trendLabel}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatNaira(item.revenue7d)}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          +{formatNaira(item.profit7d)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {item.dailyBurnRateCartons} Ctn/day
                        </div>
                        {item.daysUntilStockout !== null && (
                          <div
                            className={`text-xs mt-0.5 ${
                              item.daysUntilStockout <= 7
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            ~{item.daysUntilStockout}d left ({item.currentStockCartons} Ctn)
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        {prod && (
                          <button
                            onClick={() => onOpenPriceModal(prod)}
                            className="btn-secondary !py-1.5 !px-3 !text-xs"
                          >
                            {formatNaira(prod.cartonPrice)}
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
    </div>
  );
};
