import {
  WarehouseStateSnapshot,
  SyncMutation,
  PriceAuditLog,
  Sale,
  StockBatch,
  Expense,
  Product,
  UnitTier
} from './types';
import { getPiecesPerCarton, getUnitPrice } from './fmcg-utils';

export function applySyncMutation(
  state: WarehouseStateSnapshot,
  mutation: SyncMutation,
  ipAddress = '102.89.43.100 (Synced)'
): WarehouseStateSnapshot {
  const next: WarehouseStateSnapshot = {
    ...state,
    version: state.version + 1,
    serverTime: new Date().toISOString(),
    users: [...state.users],
    products: state.products.map(p => ({ ...p })),
    batches: state.batches.map(b => ({ ...b })),
    priceAuditLogs: [...state.priceAuditLogs], // Append-only! Never splice/delete
    sales: state.sales.map(s => ({ ...s, items: [...s.items] })),
    expenses: [...state.expenses],
    reportConfig: { ...state.reportConfig },
    reportLogs: [...state.reportLogs]
  };

  switch (mutation.type) {
    case 'MODIFY_PRICE': {
      const {
        productId,
        unitTier,
        newPrice,
        reason,
        changedByUserId,
        changedByName,
        changedByRole,
        auditId
      } = mutation.payload as {
        productId: string;
        unitTier: UnitTier;
        newPrice: number;
        reason: string;
        changedByUserId: string;
        changedByName: string;
        changedByRole: 'CEO' | 'MANAGER' | 'STAFF';
        auditId?: string;
      };

      const product = next.products.find(p => p.id === productId);
      if (!product) return next;

      // Avoid duplicate application if auditId already exists
      if (auditId && next.priceAuditLogs.some(a => a.id === auditId)) {
        return next;
      }

      const oldPrice = getUnitPrice(product, unitTier);
      const cleanNewPrice = Math.max(1, Math.round(Number(newPrice)));
      if (oldPrice === cleanNewPrice) return next;

      if (unitTier === 'CARTON') product.cartonPrice = cleanNewPrice;
      else if (unitTier === 'PACK') product.packPrice = cleanNewPrice;
      else if (unitTier === 'PIECE') product.piecePrice = cleanNewPrice;
      else if (unitTier === 'COST_CARTON') product.costPriceCarton = cleanNewPrice;

      product.updatedAt = mutation.createdAt;

      const priceDiff = cleanNewPrice - oldPrice;
      const percentChange = oldPrice > 0 ? Number(((priceDiff / oldPrice) * 100).toFixed(2)) : 0;

      // Flag high-risk if:
      // 1) A non-CEO reduced any selling price, OR
      // 2) Carton selling price is set at or below cost price, OR
      // 3) Price changed by >= 8%
      const isSellingPriceReductionByStaff =
        unitTier !== 'COST_CARTON' && priceDiff < 0 && changedByRole !== 'CEO';
      const isBelowCost =
        unitTier === 'CARTON' && cleanNewPrice <= product.costPriceCarton;
      const isLargeSwing = Math.abs(percentChange) >= 8;

      const auditEntry: PriceAuditLog = {
        id: auditId || `aud-${mutation.id}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        changedByUserId,
        changedByName,
        changedByRole,
        unitTier,
        oldPrice,
        newPrice: cleanNewPrice,
        priceDiff,
        percentChange,
        reason: reason?.trim() || 'No reason provided',
        deviceFingerprint: mutation.deviceFingerprint,
        ipAddress,
        createdAt: mutation.createdAt,
        syncedAt: new Date().toISOString(),
        flaggedHighRisk: isSellingPriceReductionByStaff || isBelowCost || isLargeSwing
      };

      // Prepend to append-only audit trail
      next.priceAuditLogs = [auditEntry, ...next.priceAuditLogs];
      return next;
    }

    case 'CREATE_SALE': {
      const salePayload = mutation.payload as Sale;
      if (next.sales.some(s => s.id === salePayload.id)) {
        return next;
      }

      const enrichedItems = salePayload.items.map(item => {
        const product = next.products.find(p => p.id === item.productId);
        let batchUsed = item.batchNumberUsed;

        if (product) {
          product.totalPiecesInStock = Math.max(
            0,
            product.totalPiecesInStock - item.piecesDeducted
          );
          product.updatedAt = mutation.createdAt;

          // FEFO Batch Deduction: sort active batches for this product by earliest expiryDate
          const activeBatches = next.batches
            .filter(b => b.productId === product.id && b.remainingPieces > 0)
            .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

          let remainingToDeduct = item.piecesDeducted;
          const usedBatchNames: string[] = [];

          for (const batch of activeBatches) {
            if (remainingToDeduct <= 0) break;
            const deductHere = Math.min(batch.remainingPieces, remainingToDeduct);
            batch.remainingPieces -= deductHere;
            remainingToDeduct -= deductHere;
            usedBatchNames.push(batch.batchNumber);
          }

          if (usedBatchNames.length > 0) {
            batchUsed = usedBatchNames.join(', ');
          }
        }

        return {
          ...item,
          batchNumberUsed: batchUsed
        };
      });

      const newSale: Sale = {
        ...salePayload,
        items: enrichedItems
      };

      next.sales = [newSale, ...next.sales];
      return next;
    }

    case 'CONFIRM_TRANSFER': {
      const { saleId } = mutation.payload as { saleId: string };
      const sale = next.sales.find(s => s.id === saleId);
      if (sale && sale.paymentMethod === 'TRANSFER') {
        sale.transferStatus = 'CONFIRMED';
      }
      return next;
    }

    case 'SETTLE_CREDIT': {
      const { saleId, amountReceived } = mutation.payload as {
        saleId: string;
        amountReceived: number;
      };
      const sale = next.sales.find(s => s.id === saleId);
      if (sale && sale.balanceDue > 0) {
        const pay = Math.min(sale.balanceDue, Math.max(0, Number(amountReceived)));
        sale.amountPaid += pay;
        sale.balanceDue -= pay;
      }
      return next;
    }

    case 'RECEIVE_BATCH': {
      const batchPayload = mutation.payload as StockBatch & { cartonsReceived?: number };
      if (next.batches.some(b => b.id === batchPayload.id)) {
        return next;
      }

      const product = next.products.find(p => p.id === batchPayload.productId);
      if (!product) return next;

      const piecesAdded = batchPayload.initialPieces;
      product.totalPiecesInStock += piecesAdded;
      if (batchPayload.costPriceCarton > 0) {
        product.costPriceCarton = batchPayload.costPriceCarton;
      }
      product.updatedAt = mutation.createdAt;

      const newBatch: StockBatch = {
        id: batchPayload.id,
        productId: product.id,
        productName: product.name,
        batchNumber: batchPayload.batchNumber,
        expiryDate: batchPayload.expiryDate,
        costPriceCarton: batchPayload.costPriceCarton || product.costPriceCarton,
        initialPieces: piecesAdded,
        remainingPieces: piecesAdded,
        supplierName: batchPayload.supplierName,
        receivedByUserId: batchPayload.receivedByUserId,
        receivedByName: batchPayload.receivedByName,
        receivedAt: mutation.createdAt
      };

      next.batches = [newBatch, ...next.batches];
      return next;
    }

    case 'CREATE_EXPENSE': {
      const expPayload = mutation.payload as Expense;
      if (next.expenses.some(e => e.id === expPayload.id)) {
        return next;
      }
      next.expenses = [expPayload, ...next.expenses];
      return next;
    }

    case 'CREATE_PRODUCT': {
      const { product, initialBatch } = mutation.payload as {
        product: Product;
        initialBatch?: StockBatch;
      };
      if (next.products.some(p => p.id === product.id)) {
        return next;
      }
      next.products = [product, ...next.products];
      if (initialBatch && initialBatch.initialPieces > 0) {
        next.batches = [initialBatch, ...next.batches];
      }
      return next;
    }

    case 'UPDATE_REPORT_CONFIG': {
      next.reportConfig = {
        ...next.reportConfig,
        ...mutation.payload
      };
      return next;
    }

    default:
      return next;
  }
}
