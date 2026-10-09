import {
  Product,
  StockBatch,
  Sale,
  Expense,
  PriceAuditLog,
  WeeklyPatternAnalytics,
  ProductVelocityInsight,
  DayOfWeekPattern,
  UnitTier
} from './types';

export function getPiecesPerCarton(product: Pick<Product, 'packsPerCarton' | 'piecesPerPack'>): number {
  return Math.max(1, product.packsPerCarton * product.piecesPerPack);
}

export function getPiecesForUnit(
  product: Pick<Product, 'packsPerCarton' | 'piecesPerPack'>,
  unitTier: 'CARTON' | 'PACK' | 'PIECE'
): number {
  if (unitTier === 'CARTON') return getPiecesPerCarton(product);
  if (unitTier === 'PACK') return Math.max(1, product.piecesPerPack);
  return 1;
}

export function getUnitPrice(product: Product, unitTier: UnitTier): number {
  switch (unitTier) {
    case 'CARTON':
      return product.cartonPrice;
    case 'PACK':
      return product.packPrice;
    case 'PIECE':
      return product.piecePrice;
    case 'COST_CARTON':
      return product.costPriceCarton;
  }
}

export function getUnitCost(product: Product, unitTier: 'CARTON' | 'PACK' | 'PIECE'): number {
  const piecesPerCarton = getPiecesPerCarton(product);
  const costPerPiece = product.costPriceCarton / piecesPerCarton;
  if (unitTier === 'CARTON') return product.costPriceCarton;
  if (unitTier === 'PACK') return Math.round(costPerPiece * product.piecesPerPack);
  return Math.round(costPerPiece);
}

export interface MultiUnitBreakdown {
  cartons: number;
  packs: number;
  pieces: number;
  decimalCartons: number;
  formatted: string;
  shortFormatted: string;
}

export function breakDownStockPieces(
  totalPieces: number,
  product: Pick<Product, 'packsPerCarton' | 'piecesPerPack'>
): MultiUnitBreakdown {
  const safePieces = Math.max(0, Math.floor(totalPieces));
  const piecesPerCarton = getPiecesPerCarton(product);
  const piecesPerPack = Math.max(1, product.piecesPerPack);

  const cartons = Math.floor(safePieces / piecesPerCarton);
  const remAfterCartons = safePieces % piecesPerCarton;
  const packs = product.packsPerCarton > 1 ? Math.floor(remAfterCartons / piecesPerPack) : 0;
  const pieces = product.packsPerCarton > 1 ? remAfterCartons % piecesPerPack : remAfterCartons;

  const decimalCartons = Number((safePieces / piecesPerCarton).toFixed(1));

  const parts: string[] = [];
  if (cartons > 0 || safePieces === 0) parts.push(`${cartons.toLocaleString()} Ctn`);
  if (packs > 0) parts.push(`${packs} Pck`);
  if (pieces > 0) parts.push(`${pieces} Pcs`);

  return {
    cartons,
    packs,
    pieces,
    decimalCartons,
    formatted: parts.join(' • '),
    shortFormatted: `${cartons.toLocaleString()} Ctn${packs > 0 ? ` + ${packs} Pck` : ''}${pieces > 0 ? ` + ${pieces} Pc` : ''}`
  };
}

export function isLowStock(product: Product): boolean {
  const piecesPerCarton = getPiecesPerCarton(product);
  const currentCartons = product.totalPiecesInStock / piecesPerCarton;
  return currentCartons <= product.lowStockThresholdCartons;
}

export function getExpiryStatus(expiryDateStr: string, referenceDate = new Date()): {
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'HEALTHY';
  daysRemaining: number;
  label: string;
} {
  const exp = new Date(expiryDateStr + 'T23:59:59');
  const diffMs = exp.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'EXPIRED',
      daysRemaining,
      label: `Expired ${Math.abs(daysRemaining)}d ago`
    };
  }
  if (daysRemaining <= 45) {
    return {
      status: 'EXPIRING_SOON',
      daysRemaining,
      label: `Expires in ${daysRemaining}d`
    };
  }
  return {
    status: 'HEALTHY',
    daysRemaining,
    label: `${daysRemaining}d shelf life`
  };
}

export function formatNaira(amount: number): string {
  const rounded = Math.round(amount || 0);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₦${Math.abs(rounded).toLocaleString('en-NG')}`;
}

export function formatCompactNaira(amount: number): string {
  const abs = Math.abs(amount || 0);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}₦${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}₦${(abs / 1_000).toFixed(0)}k`;
  }
  return `${sign}₦${abs.toLocaleString('en-NG')}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function computeWeeklyPatternAnalytics(
  products: Product[],
  batches: StockBatch[],
  sales: Sale[],
  expenses: Expense[],
  priceAuditLogs: PriceAuditLog[],
  now = new Date()
): WeeklyPatternAnalytics {
  // Reference today date (YYYY-MM-DD)
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const periodStartStr = sevenDaysAgo.toISOString().slice(0, 10);

  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(p.id, p);

  // Filter last 7 days
  const sales7d = sales.filter(s => s.createdAt.slice(0, 10) >= periodStartStr);
  const expenses7d = expenses.filter(e => e.createdAt.slice(0, 10) >= periodStartStr);
  const salesToday = sales.filter(s => s.createdAt.slice(0, 10) === todayStr);
  const expensesToday = expenses.filter(e => e.createdAt.slice(0, 10) === todayStr);

  const totalRevenue7d = sales7d.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCogs7d = sales7d.reduce((sum, s) => sum + s.totalCogs, 0);
  const grossProfit7d = sales7d.reduce((sum, s) => sum + s.grossProfit, 0);
  const totalExpenses7d = expenses7d.reduce((sum, e) => sum + e.amount, 0);
  const netProfit7d = grossProfit7d - totalExpenses7d;

  const revenueToday = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
  const grossProfitToday = salesToday.reduce((sum, s) => sum + s.grossProfit, 0);
  const expensesTodayTotal = expensesToday.reduce((sum, e) => sum + e.amount, 0);
  const netProfitToday = grossProfitToday - expensesTodayTotal;

  const pendingTransfers = sales.filter(
    s => s.paymentMethod === 'TRANSFER' && s.transferStatus === 'PENDING'
  );
  const pendingTransfersCount = pendingTransfers.length;
  const pendingTransfersAmount = pendingTransfers.reduce((sum, s) => sum + s.totalAmount, 0);

  const outstandingCreditAmount = sales.reduce((sum, s) => sum + (s.balanceDue || 0), 0);
  const lowStockProductsCount = products.filter(isLowStock).length;
  const expiringBatchesCount = batches.filter(b => {
    if (b.remainingPieces <= 0) return false;
    const st = getExpiryStatus(b.expiryDate, now).status;
    return st === 'EXPIRING_SOON' || st === 'EXPIRED';
  }).length;

  const priceChanges7d = priceAuditLogs.filter(l => l.createdAt.slice(0, 10) >= periodStartStr);

  // Build 7-day daily pattern buckets
  const dayBuckets = new Map<string, DayOfWeekPattern>();
  const dayProductTracker = new Map<string, Map<string, number>>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dStr = d.toISOString().slice(0, 10);
    const dayName = DAY_NAMES[d.getUTCDay()];
    dayBuckets.set(dStr, {
      dayName,
      dateStr: dStr,
      revenue: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
      cartonsMoved: 0,
      transactionsCount: 0,
      topProduct: '—'
    });
    dayProductTracker.set(dStr, new Map());
  }

  // Per-product aggregation for velocity & pattern insights
  const prodStats = new Map<
    string,
    {
      piecesSold7d: number;
      revenue7d: number;
      profit7d: number;
      byDayPieces: Map<string, number>;
    }
  >();

  for (const p of products) {
    prodStats.set(p.id, {
      piecesSold7d: 0,
      revenue7d: 0,
      profit7d: 0,
      byDayPieces: new Map()
    });
  }

  for (const sale of sales7d) {
    const dStr = sale.createdAt.slice(0, 10);
    const bucket = dayBuckets.get(dStr);
    if (bucket) {
      bucket.revenue += sale.totalAmount;
      bucket.grossProfit += sale.grossProfit;
      bucket.transactionsCount += 1;
    }

    for (const item of sale.items) {
      const prod = productMap.get(item.productId);
      const piecesPerCtn = prod ? getPiecesPerCarton(prod) : 24;
      const cartonsEq = item.piecesDeducted / piecesPerCtn;

      if (bucket) {
        bucket.cartonsMoved = Number((bucket.cartonsMoved + cartonsEq).toFixed(1));
        const dayMap = dayProductTracker.get(dStr)!;
        dayMap.set(item.productName, (dayMap.get(item.productName) || 0) + item.subtotal);
      }

      const st = prodStats.get(item.productId);
      if (st) {
        st.piecesSold7d += item.piecesDeducted;
        st.revenue7d += item.subtotal;
        st.profit7d += item.profit;
        const dayName = DAY_NAMES[new Date(sale.createdAt).getUTCDay()];
        st.byDayPieces.set(dayName, (st.byDayPieces.get(dayName) || 0) + item.piecesDeducted);
      }
    }
  }

  for (const exp of expenses7d) {
    const dStr = exp.createdAt.slice(0, 10);
    const bucket = dayBuckets.get(dStr);
    if (bucket) {
      bucket.expenses += exp.amount;
    }
  }

  for (const [dStr, bucket] of dayBuckets.entries()) {
    bucket.netProfit = bucket.grossProfit - bucket.expenses;
    const dayMap = dayProductTracker.get(dStr);
    if (dayMap && dayMap.size > 0) {
      let bestName = '—';
      let bestRev = -1;
      for (const [name, rev] of dayMap.entries()) {
        if (rev > bestRev) {
          bestRev = rev;
          bestName = name;
        }
      }
      bucket.topProduct = bestName;
    }
  }

  const topSellingProducts: ProductVelocityInsight[] = products
    .map(p => {
      const st = prodStats.get(p.id)!;
      const piecesPerCtn = getPiecesPerCarton(p);
      const cartonsSold7d = Number((st.piecesSold7d / piecesPerCtn).toFixed(1));
      const dailyBurnRateCartons = Number((cartonsSold7d / 7).toFixed(1));
      const currentStockCartons = Number((p.totalPiecesInStock / piecesPerCtn).toFixed(1));
      const daysUntilStockout =
        dailyBurnRateCartons > 0
          ? Math.max(0, Math.round(currentStockCartons / dailyBurnRateCartons))
          : null;

      let peakDayOfWeek = 'Mon';
      let maxDayPieces = -1;
      for (const [dayName, pcs] of st.byDayPieces.entries()) {
        if (pcs > maxDayPieces) {
          maxDayPieces = pcs;
          peakDayOfWeek = dayName;
        }
      }

      const trendLabel: 'SURGING' | 'STEADY' | 'SLOW_MOVING' =
        cartonsSold7d >= 60 ? 'SURGING' : cartonsSold7d >= 20 ? 'STEADY' : 'SLOW_MOVING';

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        category: p.category,
        cartonsSold7d,
        piecesSold7d: st.piecesSold7d,
        revenue7d: st.revenue7d,
        profit7d: st.profit7d,
        dailyBurnRateCartons,
        currentStockCartons,
        daysUntilStockout,
        peakDayOfWeek: maxDayPieces > 0 ? peakDayOfWeek : '—',
        trendLabel
      };
    })
    .sort((a, b) => b.revenue7d - a.revenue7d);

  return {
    periodStart: periodStartStr,
    periodEnd: todayStr,
    totalRevenue7d,
    totalCogs7d,
    grossProfit7d,
    totalExpenses7d,
    netProfit7d,
    revenueToday,
    grossProfitToday,
    expensesToday: expensesTodayTotal,
    netProfitToday,
    pendingTransfersCount,
    pendingTransfersAmount,
    outstandingCreditAmount,
    lowStockProductsCount,
    expiringBatchesCount,
    priceChanges7dCount: priceChanges7d.length,
    flaggedPriceChangesCount: priceChanges7d.filter(l => l.flaggedHighRisk).length,
    topSellingProducts,
    dayOfWeekPatterns: Array.from(dayBuckets.values())
  };
}

export function buildFormattedReportMessage(
  reportType: 'DAILY' | 'WEEKLY',
  analytics: WeeklyPatternAnalytics,
  products: Product[],
  priceAuditLogs: PriceAuditLog[],
  expenses: Expense[]
): { subject: string; whatsappText: string; emailBody: string } {
  const isDaily = reportType === 'DAILY';
  const periodLabel = isDaily
    ? `Today (${analytics.periodEnd})`
    : `7-Day Week (${analytics.periodStart} to ${analytics.periodEnd})`;

  const rev = isDaily ? analytics.revenueToday : analytics.totalRevenue7d;
  const gross = isDaily ? analytics.grossProfitToday : analytics.grossProfit7d;
  const exp = isDaily ? analytics.expensesToday : analytics.totalExpenses7d;
  const net = isDaily ? analytics.netProfitToday : analytics.netProfit7d;

  const top5 = analytics.topSellingProducts.slice(0, 5);
  const lowStockList = products.filter(isLowStock);
  const recentAudits = priceAuditLogs.slice(0, 5);

  const bestDay = [...analytics.dayOfWeekPatterns].sort((a, b) => b.revenue - a.revenue)[0];

  const subject = `[FMCG Warehouse ${reportType} Report] Net Profit: ${formatNaira(net)} | ${periodLabel}`;

  const whatsappLines = [
    `*📊 ${reportType} WAREHOUSE EXECUTIVE REPORT*`,
    `📅 *Period:* ${periodLabel}`,
    `────────────────────`,
    `*💰 FINANCIAL SUMMARY*`,
    `• Total Sales Revenue: *${formatNaira(rev)}*`,
    `• Gross Margin: *${formatNaira(gross)}*`,
    `• Warehouse Expenses: *${formatNaira(exp)}*`,
    `• *NET PROFIT: ${formatNaira(net)}*`,
    `• Pending Transfers: ${analytics.pendingTransfersCount} (${formatNaira(analytics.pendingTransfersAmount)})`,
    `• Customer Credit Due: ${formatNaira(analytics.outstandingCreditAmount)}`,
    `────────────────────`,
    `*🔥 TOP SELLING STOCK & PATTERNS (7D)*`,
    ...top5.map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}* — ${item.cartonsSold7d} Ctns (${formatNaira(item.revenue7d)}) | Peak: ${item.peakDayOfWeek} | Burn: ${item.dailyBurnRateCartons}/day`
    ),
    bestDay ? `📈 *Peak Market Day:* ${bestDay.dayName} (${bestDay.dateStr}) with ${formatNaira(bestDay.revenue)}` : '',
    `────────────────────`,
    `*🔐 PRICE MODIFICATION FINGERPRINT (${recentAudits.length} recent)*`,
    ...(recentAudits.length === 0
      ? ['• No staff price modifications recorded.']
      : recentAudits.map(
          a =>
            `• ${a.flaggedHighRisk ? '⚠️ ' : ''}*${a.productName}* (${a.unitTier}): ${formatNaira(a.oldPrice)} → *${formatNaira(a.newPrice)}* by *${a.changedByName}* (${a.changedByRole}) [${a.reason}]`
        )),
    `────────────────────`,
    `*🚨 LOW STOCK ALERTS (${lowStockList.length} items)*`,
    ...(lowStockList.length === 0
      ? ['• All FMCG lines above minimum carton threshold.']
      : lowStockList.slice(0, 6).map(p => {
          const b = breakDownStockPieces(p.totalPiecesInStock, p);
          return `• *${p.name}*: Only *${b.shortFormatted}* left (Min: ${p.lowStockThresholdCartons} Ctn)`;
        }))
  ].filter(Boolean);

  const whatsappText = whatsappLines.join('\n');
  const emailBody = whatsappText.replace(/\*/g, '');

  return { subject, whatsappText, emailBody };
}
