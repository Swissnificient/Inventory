import express from 'express';
import cors from 'cors';
import path from 'path';
import { warehouseStore } from './store';
import {
  computeWeeklyPatternAnalytics,
  buildFormattedReportMessage,
  breakDownStockPieces
} from '../shared/fmcg-utils';
import { SyncMutation, ReportLog } from '../shared/types';

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health & Latency check endpoint for Low-Network Adaptive Sync
app.get('/api/ping', (_req, res) => {
  res.json({
    ok: true,
    serverTime: new Date().toISOString(),
    version: warehouseStore.getSnapshot().version
  });
});

// Pull latest warehouse state snapshot
app.get('/api/sync/pull', (_req, res) => {
  const snapshot = warehouseStore.getSnapshot();
  res.json(snapshot);
});

// Push batched delta mutations from client Offline Outbox Queue
app.post('/api/sync/push', (req, res) => {
  const mutations = (req.body?.mutations || []) as SyncMutation[];
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) ||
    '102.89.43.105';

  const result = warehouseStore.applyBatchMutations(mutations, clientIp);
  res.json({
    ok: true,
    appliedCount: result.appliedCount,
    snapshot: result.snapshot
  });
});

// Immutable Price Modification Audit Logs ("Staff Digital Fingerprint")
app.get('/api/audit-logs', (_req, res) => {
  const snapshot = warehouseStore.getSnapshot();
  res.json({
    total: snapshot.priceAuditLogs.length,
    flaggedCount: snapshot.priceAuditLogs.filter(a => a.flaggedHighRisk).length,
    logs: snapshot.priceAuditLogs
  });
});

// Weekly Pattern Recognition & Profit Analytics
app.get('/api/analytics/patterns', (_req, res) => {
  const snap = warehouseStore.getSnapshot();
  const analytics = computeWeeklyPatternAnalytics(
    snap.products,
    snap.batches,
    snap.sales,
    snap.expenses,
    snap.priceAuditLogs
  );
  res.json(analytics);
});

// Dispatch Daily / Weekly Report via WhatsApp or Email
app.post('/api/reports/dispatch', (req, res) => {
  const { reportType = 'DAILY', channel = 'WHATSAPP', customRecipient } = req.body || {};
  const snap = warehouseStore.getSnapshot();
  const analytics = computeWeeklyPatternAnalytics(
    snap.products,
    snap.batches,
    snap.sales,
    snap.expenses,
    snap.priceAuditLogs
  );

  const { subject, whatsappText, emailBody } = buildFormattedReportMessage(
    reportType,
    analytics,
    snap.products,
    snap.priceAuditLogs,
    snap.expenses
  );

  const recipient =
    customRecipient ||
    (channel === 'WHATSAPP'
      ? snap.reportConfig.ceoWhatsAppNumber
      : snap.reportConfig.ceoEmail);

  const logEntry: ReportLog = {
    id: `rpt-${Date.now()}`,
    reportType,
    channel,
    recipient,
    subject,
    messageBody: channel === 'WHATSAPP' ? whatsappText : emailBody,
    sentAt: new Date().toISOString(),
    status: 'DELIVERED'
  };

  warehouseStore.appendReportLog(logEntry);

  const cleanPhone = recipient.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`;

  res.json({
    ok: true,
    reportLog: logEntry,
    whatsappUrl,
    mailtoUrl,
    snapshot: warehouseStore.getSnapshot()
  });
});

// CSV Export for CEO Email / Excel Analysis
app.get('/api/reports/export-csv', (_req, res) => {
  const snap = warehouseStore.getSnapshot();
  const rows: string[][] = [
    ['SECTION', 'SKU / ID', 'ITEM / STAFF', 'DETAIL 1', 'DETAIL 2', 'AMOUNT (NGN)', 'TIMESTAMP']
  ];

  for (const p of snap.products) {
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

  for (const a of snap.priceAuditLogs) {
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

  for (const s of snap.sales) {
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

  for (const e of snap.expenses) {
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

  const csvContent = rows
    .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="fmcg-warehouse-report-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send(csvContent);
});

// Reset demo database to clean initial Nigerian FMCG warehouse seed
app.post('/api/demo/reset', (_req, res) => {
  const snapshot = warehouseStore.resetToSeed();
  res.json({ ok: true, snapshot });
});

// Serve static PWA client
const publicDir = path.resolve('dist/public');
app.use(express.static(publicDir));

app.use((_req: any, res: any) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

export function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`🚀 FMCG Warehouse Offline-First Server running at http://localhost:${port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
