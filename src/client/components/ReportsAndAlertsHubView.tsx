import React, { useState, useMemo } from 'react';
import {
  WeeklyPatternAnalytics,
  Product,
  PriceAuditLog,
  Expense,
  Sale,
  ReportConfig,
  ReportLog
} from '../../shared/types';
import {
  breakDownStockPieces,
  buildFormattedReportMessage
} from '../../shared/fmcg-utils';
import {
  Mail,
  Download,
  Copy,
  CheckCircle2,
  Send
} from 'lucide-react';

interface ReportsAndAlertsHubViewProps {
  analytics: WeeklyPatternAnalytics;
  products: Product[];
  auditLogs: PriceAuditLog[];
  expenses: Expense[];
  sales: Sale[];
  reportConfig: ReportConfig;
  reportLogs: ReportLog[];
  onUpdateReportConfig: (cfg: Partial<ReportConfig>) => void;
  onDispatchReport: (reportType: 'DAILY' | 'WEEKLY', channel: 'WHATSAPP' | 'EMAIL') => Promise<void>;
}

export const ReportsAndAlertsHubView: React.FC<ReportsAndAlertsHubViewProps> = ({
  analytics,
  products,
  auditLogs,
  expenses,
  sales,
  reportConfig,
  reportLogs,
  onUpdateReportConfig,
  onDispatchReport
}) => {
  const [reportType, setReportType] = useState<'DAILY' | 'WEEKLY'>('WEEKLY');
  const [copied, setCopied] = useState(false);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const [whatsappNum, setWhatsappNum] = useState(reportConfig.ceoWhatsAppNumber);
  const [emailAddr, setEmailAddr] = useState(reportConfig.ceoEmail);
  const [dailyTime, setDailyTime] = useState(reportConfig.dailyReportTime);
  const [weeklyDay, setWeeklyDay] = useState(reportConfig.weeklyReportDay);

  const formatted = useMemo(
    () =>
      buildFormattedReportMessage(reportType, analytics, products, auditLogs, expenses),
    [reportType, analytics, products, auditLogs, expenses]
  );

  const handleCopyText = () => {
    navigator.clipboard?.writeText(formatted.whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTriggerReport = async (channel: 'WHATSAPP' | 'EMAIL') => {
    await onDispatchReport(reportType, channel);
    setDispatchNotice(
      `${reportType} report sent via ${channel} to ${
        channel === 'WHATSAPP' ? whatsappNum : emailAddr
      }.`
    );
    setTimeout(() => setDispatchNotice(null), 4000);
  };

  const handleOfflineReadyCsvDownload = () => {
    const rows: string[][] = [
      ['SECTION', 'SKU / ID', 'ITEM / STAFF', 'DETAIL 1', 'DETAIL 2', 'AMOUNT (NGN)', 'TIMESTAMP']
    ];
    for (const p of products) {
      const bd = breakDownStockPieces(p.totalPiecesInStock, p);
      rows.push([
        'INVENTORY',
        p.sku,
        p.name,
        `Stock: ${bd.shortFormatted}`,
        `Cost/Ctn: ${p.costPriceCarton}`,
        String(p.cartonPrice),
        p.updatedAt
      ]);
    }
    for (const a of auditLogs) {
      rows.push([
        'PRICE_FINGERPRINT_AUDIT',
        a.sku,
        `${a.changedByName} (${a.changedByRole})`,
        `${a.productName} [${a.unitTier}]: ${a.oldPrice} -> ${a.newPrice}`,
        `Reason: ${a.reason} | Device: ${a.deviceFingerprint}`,
        String(a.priceDiff),
        a.createdAt
      ]);
    }
    for (const s of sales) {
      rows.push([
        'SALE_INVOICE',
        s.invoiceNumber,
        s.customerName,
        `Pay: ${s.paymentMethod} (${s.transferStatus})`,
        `Profit: ${s.grossProfit} | Sold By: ${s.soldByName}`,
        String(s.totalAmount),
        s.createdAt
      ]);
    }
    for (const e of expenses) {
      rows.push([
        'EXPENSE',
        e.id,
        e.category,
        e.description,
        `Recorded by: ${e.recordedByName}`,
        String(-e.amount),
        e.createdAt
      ]);
    }

    const csv = rows
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fmcg-warehouse-${reportType.toLowerCase()}-report-${analytics.periodEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateReportConfig({
      ceoWhatsAppNumber: whatsappNum,
      ceoEmail: emailAddr,
      dailyReportTime: dailyTime,
      weeklyReportDay: weeklyDay
    });
    setDispatchNotice('Report schedule saved.');
    setTimeout(() => setDispatchNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {dispatchNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{dispatchNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Report Preview & Actions (7 cols) */}
        <div className="lg:col-span-7 surface-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Executive Report Summary
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ready for WhatsApp, Email, or Excel CSV export
              </p>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 self-start">
              <button
                onClick={() => setReportType('DAILY')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  reportType === 'DAILY'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setReportType('WEEKLY')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  reportType === 'WEEKLY'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="surface-muted p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span>REPORT PREVIEW</span>
              <button
                onClick={handleCopyText}
                className="btn-secondary !py-1 !px-2.5 !text-xs inline-flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {formatted.whatsappText}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleTriggerReport('WHATSAPP')}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send to WhatsApp</span>
            </button>

            <button
              onClick={() => handleTriggerReport('EMAIL')}
              className="btn-secondary flex items-center gap-2 !py-2.5"
            >
              <Mail className="w-4 h-4 text-sky-500" />
              <span>Send to Email</span>
            </button>

            <button
              onClick={handleOfflineReadyCsvDownload}
              className="btn-secondary flex items-center gap-2 !py-2.5"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Right: Schedule & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="surface-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Report Schedule & Recipients
            </h3>
            <form onSubmit={handleSaveSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  CEO WhatsApp Number
                </label>
                <input
                  type="text"
                  value={whatsappNum}
                  onChange={e => setWhatsappNum(e.target.value)}
                  className="input-clean w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  CEO Email Address
                </label>
                <input
                  type="email"
                  value={emailAddr}
                  onChange={e => setEmailAddr(e.target.value)}
                  className="input-clean w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">
                    Daily Time
                  </label>
                  <input
                    type="time"
                    value={dailyTime}
                    onChange={e => setDailyTime(e.target.value)}
                    className="input-clean w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">
                    Weekly Day
                  </label>
                  <select
                    value={weeklyDay}
                    onChange={e => setWeeklyDay(e.target.value)}
                    className="input-clean w-full"
                  >
                    {['Sunday', 'Monday', 'Friday', 'Saturday'].map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                Save Schedule
              </button>
            </form>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Delivery Log ({reportLogs.length})
              </h4>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {reportLogs.map(log => (
                <div key={log.id} className="p-4 text-xs flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {log.reportType} • {log.channel}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {log.recipient} • {new Date(log.sentAt).toLocaleDateString('en-NG')}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
