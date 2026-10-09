import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { warehouseStore } from '../src/server/store';
import {
  breakDownStockPieces,
  computeWeeklyPatternAnalytics,
  buildFormattedReportMessage
} from '../src/shared/fmcg-utils';
import { SyncMutation } from '../src/shared/types';

async function runVerification() {
  console.log('=== Running End-to-End FMCG Warehouse System Verification ===\n');

  // Reset store to clean seed state for deterministic verification
  const initial = warehouseStore.resetToSeed();
  assert.strictEqual(initial.products.length, 10, 'Should have 10 seeded Nigerian FMCG products');
  assert.strictEqual(initial.users.length, 4, 'Should have 4 staff/CEO accounts');
  console.log('✓ 1. Seed Catalog, Multi-Unit Hierarchy & Staff Accounts verified.');

  // Verify Multi-Unit Breakdown math on Indomie Super Pack (1 Carton = 4 Packs x 10 Pcs = 40 Pcs)
  const indomie = initial.products.find(p => p.id === 'prd-indomie-super')!;
  const bd = breakDownStockPieces(indomie.totalPiecesInStock, indomie);
  assert.strictEqual(bd.cartons, 185);
  assert.strictEqual(bd.packs, 2);
  assert.strictEqual(bd.pieces, 0);
  console.log(`✓ 2. Multi-Unit Stock Breakdown verified: ${indomie.name} -> ${bd.formatted}`);

  // Simulate Offline Outbox Queue batch (Price Change by Staff + Multi-Unit Sale + Diesel Expense)
  const offlineBatch: SyncMutation[] = [
    {
      id: 'test-mut-price-1',
      type: 'MODIFY_PRICE',
      userId: 'usr-stf-03',
      userName: 'Amina Bello',
      deviceFingerprint: 'POS-Counter-Terminal-A • Chrome / Linux',
      createdAt: new Date().toISOString(),
      payload: {
        auditId: 'aud-test-99',
        productId: 'prd-indomie-super',
        unitTier: 'CARTON',
        newPrice: 10100, // Lowered from 10400 by STAFF -> should flag high risk!
        reason: 'Offline customer discount override test',
        changedByUserId: 'usr-stf-03',
        changedByName: 'Amina Bello',
        changedByRole: 'STAFF'
      }
    },
    {
      id: 'test-mut-sale-2',
      type: 'CREATE_SALE',
      userId: 'usr-stf-03',
      userName: 'Amina Bello',
      deviceFingerprint: 'POS-Counter-Terminal-A • Chrome / Linux',
      createdAt: new Date().toISOString(),
      payload: {
        id: 'sal-test-99',
        invoiceNumber: 'INV-2026-9999',
        customerName: 'Balogun Market Trader',
        customerPhone: '08031234567',
        items: [
          {
            id: 'sli-test-1',
            productId: 'prd-peak-sachet',
            productName: 'Peak Milk Powder Sachet (14g x 210)',
            sku: 'FMCG-DRY-002',
            unitTier: 'CARTON',
            quantity: 10,
            piecesDeducted: 2100, // 10 Cartons * 210 pcs
            unitPrice: 29400,
            unitCost: 26500,
            subtotal: 294000,
            cogs: 265000,
            profit: 29000
          }
        ],
        totalAmount: 294000,
        totalCogs: 265000,
        grossProfit: 29000,
        paymentMethod: 'TRANSFER',
        transferBank: 'GTBank',
        transferSender: 'Balogun Market Trader',
        transferReference: 'NIP/GTB/9999',
        transferStatus: 'PENDING',
        amountPaid: 294000,
        balanceDue: 0,
        soldByUserId: 'usr-stf-03',
        soldByName: 'Amina Bello',
        deviceFingerprint: 'POS-Counter-Terminal-A',
        createdAt: new Date().toISOString()
      }
    },
    {
      id: 'test-mut-exp-3',
      type: 'CREATE_EXPENSE',
      userId: 'usr-mgr-02',
      userName: 'Chinedu Okafor',
      deviceFingerprint: 'WH-Supervisor-PC01',
      createdAt: new Date().toISOString(),
      payload: {
        id: 'exp-test-99',
        category: 'Diesel & Generator Fuel',
        description: '50L Diesel top-up',
        amount: 62000,
        recordedByUserId: 'usr-mgr-02',
        recordedByName: 'Chinedu Okafor',
        createdAt: new Date().toISOString()
      }
    }
  ];

  const syncResult = warehouseStore.applyBatchMutations(offlineBatch, '102.89.43.199');
  assert.strictEqual(syncResult.appliedCount, 3, 'All 3 offline mutations should be applied');

  // Verify idempotency (re-sending same offline batch on flaky Nigerian network must not duplicate)
  const retryResult = warehouseStore.applyBatchMutations(offlineBatch, '102.89.43.199');
  assert.strictEqual(retryResult.appliedCount, 0, 'Duplicate retry batch must be ignored idempotently');
  console.log('✓ 3. Offline Outbox Delta Sync & Flaky-Network Idempotency verified.');

  // Verify Immutable Price Fingerprint Audit Log
  const latestAudit = syncResult.snapshot.priceAuditLogs[0];
  assert.strictEqual(latestAudit.id, 'aud-test-99');
  assert.strictEqual(latestAudit.changedByName, 'Amina Bello');
  assert.strictEqual(latestAudit.oldPrice, 10400);
  assert.strictEqual(latestAudit.newPrice, 10100);
  assert.strictEqual(latestAudit.flaggedHighRisk, true, 'Downward price change by staff must be flagged');
  const ledgerPath = path.resolve('data/price-fingerprint-audit.jsonl');
  assert.ok(fs.existsSync(ledgerPath), 'Append-only disk audit ledger must exist');
  console.log('✓ 4. Staff Price Modification Fingerprint & High-Risk Tamper Flag verified.');

  // Verify FEFO Batch Deduction on Peak Milk Sachet (earliest batch bat-002 had 3150 pieces -> should now have 1050 pieces)
  const earliestPeakBatch = syncResult.snapshot.batches.find(b => b.id === 'bat-002')!;
  assert.strictEqual(
    earliestPeakBatch.remainingPieces,
    3150 - 2100,
    'FEFO must deduct from earliest expiring batch first'
  );
  console.log('✓ 5. FEFO (First Expired, First Out) Batch Deduction verified.');

  // Verify Weekly Pattern Recognition & Profit Analytics
  const analytics = computeWeeklyPatternAnalytics(
    syncResult.snapshot.products,
    syncResult.snapshot.batches,
    syncResult.snapshot.sales,
    syncResult.snapshot.expenses,
    syncResult.snapshot.priceAuditLogs
  );
  assert.ok(analytics.topSellingProducts.length === 10, 'Should rank all 10 products');
  assert.strictEqual(
    analytics.netProfit7d,
    analytics.grossProfit7d - analytics.totalExpenses7d,
    'Net profit must equal Gross Profit minus Warehouse Expenses'
  );
  console.log(
    `✓ 6. Weekly Pattern Recognition & Net Profit Engine verified (7d Net Profit: ₦${analytics.netProfit7d.toLocaleString()}).`
  );

  // Verify WhatsApp & Email Report Builder
  const report = buildFormattedReportMessage(
    'WEEKLY',
    analytics,
    syncResult.snapshot.products,
    syncResult.snapshot.priceAuditLogs,
    syncResult.snapshot.expenses
  );
  assert.ok(report.whatsappText.includes('WEEKLY WAREHOUSE EXECUTIVE REPORT'));
  assert.ok(report.whatsappText.includes('PRICE MODIFICATION FINGERPRINT'));
  assert.ok(report.whatsappText.includes('LOW STOCK ALERTS'));
  console.log('✓ 7. Daily/Weekly WhatsApp & Email Executive Report Generator verified.');

  // Restore clean seed state so the live app starts with clean initial seed data
  warehouseStore.resetToSeed();
  console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
