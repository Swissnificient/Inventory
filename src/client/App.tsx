import React, { useState, useEffect, useMemo } from 'react';
import { offlineEngine } from './offline-engine';
import {
  Product,
  PriceAuditLog,
  UnitTier,
  User,
  FMCGCategory,
  ExpenseCategory,
  Sale,
  ReportConfig
} from '../shared/types';
import {
  computeWeeklyPatternAnalytics,
  getPiecesPerCarton,
  isLowStock
} from '../shared/fmcg-utils';
import { CeoDashboardAndPatternsView } from './components/CeoDashboardAndPatternsView';
import { InventoryAndBatchesView } from './components/InventoryAndBatchesView';
import { WarehousePosAndExpensesView } from './components/WarehousePosAndExpensesView';
import { PriceAuditTrailView } from './components/PriceAuditTrailView';
import { ReportsAndAlertsHubView } from './components/ReportsAndAlertsHubView';
import { PriceModifyModal } from './components/PriceModifyModal';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Fingerprint,
  MessageSquare,
  Wifi,
  WifiOff,
  Sun,
  Moon
} from 'lucide-react';

type ActiveTab = 'DASHBOARD' | 'INVENTORY' | 'POS' | 'AUDIT' | 'REPORTS';
type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'fmcg_warehouse_theme_v1';

export const App: React.FC = () => {
  const [snapshot, setSnapshot] = useState(() => offlineEngine.getSnapshot());
  const [engineStatus, setEngineStatus] = useState(() => offlineEngine.getStatus());
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [activeUserId, setActiveUserId] = useState<string>('usr-ceo-01');
  const [priceModalProduct, setPriceModalProduct] = useState<Product | null>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    return offlineEngine.subscribe(() => {
      setSnapshot(offlineEngine.getSnapshot());
      setEngineStatus(offlineEngine.getStatus());
    });
  }, []);

  const activeUser: User = useMemo(
    () => snapshot.users.find(u => u.id === activeUserId) || snapshot.users[0],
    [snapshot.users, activeUserId]
  );

  const analytics = useMemo(
    () =>
      computeWeeklyPatternAnalytics(
        snapshot.products,
        snapshot.batches,
        snapshot.sales,
        snapshot.expenses,
        snapshot.priceAuditLogs
      ),
    [
      snapshot.products,
      snapshot.batches,
      snapshot.sales,
      snapshot.expenses,
      snapshot.priceAuditLogs
    ]
  );

  const lowStockCount = useMemo(
    () => snapshot.products.filter(isLowStock).length,
    [snapshot.products]
  );

  // Handlers backed by 0ms Local-First Offline Engine
  const handleConfirmPriceChange = (params: {
    productId: string;
    unitTier: UnitTier;
    newPrice: number;
    reason: string;
    staffUser: User;
  }) => {
    offlineEngine.dispatchMutation(
      'MODIFY_PRICE',
      {
        auditId: `aud-${Date.now()}`,
        productId: params.productId,
        unitTier: params.unitTier,
        newPrice: params.newPrice,
        reason: params.reason,
        changedByUserId: params.staffUser.id,
        changedByName: params.staffUser.name,
        changedByRole: params.staffUser.role
      },
      params.staffUser
    );
  };

  const handleRevertPrice = (log: PriceAuditLog) => {
    offlineEngine.dispatchMutation(
      'MODIFY_PRICE',
      {
        auditId: `aud-rev-${Date.now()}`,
        productId: log.productId,
        unitTier: log.unitTier,
        newPrice: log.oldPrice,
        reason: `Revert of change (${log.id}) back to original price`,
        changedByUserId: activeUser.id,
        changedByName: activeUser.name,
        changedByRole: activeUser.role
      },
      activeUser
    );
  };

  const handleReceiveBatch = (batchData: {
    productId: string;
    batchNumber: string;
    expiryDate: string;
    costPriceCarton: number;
    cartonsReceived: number;
    supplierName: string;
  }) => {
    const prod = snapshot.products.find(p => p.id === batchData.productId);
    if (!prod) return;
    const piecesAdded = getPiecesPerCarton(prod) * batchData.cartonsReceived;

    offlineEngine.dispatchMutation(
      'RECEIVE_BATCH',
      {
        id: `bat-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        batchNumber: batchData.batchNumber,
        expiryDate: batchData.expiryDate,
        costPriceCarton: batchData.costPriceCarton,
        initialPieces: piecesAdded,
        remainingPieces: piecesAdded,
        supplierName: batchData.supplierName,
        receivedByUserId: activeUser.id,
        receivedByName: activeUser.name,
        receivedAt: new Date().toISOString()
      },
      activeUser
    );
  };

  const handleCreateProduct = (productData: {
    sku: string;
    name: string;
    brand: string;
    category: FMCGCategory;
    packsPerCarton: number;
    piecesPerPack: number;
    cartonPrice: number;
    packPrice: number;
    piecePrice: number;
    costPriceCarton: number;
    lowStockThresholdCartons: number;
    initialCartons: number;
    batchNumber: string;
    expiryDate: string;
    supplierName: string;
  }) => {
    const prodId = `prd-${Date.now()}`;
    const piecesPerCtn = productData.packsPerCarton * productData.piecesPerPack;
    const totalPieces = piecesPerCtn * productData.initialCartons;

    const newProduct: Product = {
      id: prodId,
      sku: productData.sku,
      name: productData.name,
      brand: productData.brand,
      category: productData.category,
      packsPerCarton: productData.packsPerCarton,
      piecesPerPack: productData.piecesPerPack,
      cartonPrice: productData.cartonPrice,
      packPrice: productData.packPrice,
      piecePrice: productData.piecePrice,
      costPriceCarton: productData.costPriceCarton,
      lowStockThresholdCartons: productData.lowStockThresholdCartons,
      totalPiecesInStock: totalPieces,
      updatedAt: new Date().toISOString()
    };

    const initialBatch =
      totalPieces > 0
        ? {
            id: `bat-init-${Date.now()}`,
            productId: prodId,
            productName: productData.name,
            batchNumber: productData.batchNumber,
            expiryDate: productData.expiryDate,
            costPriceCarton: productData.costPriceCarton,
            initialPieces: totalPieces,
            remainingPieces: totalPieces,
            supplierName: productData.supplierName,
            receivedByUserId: activeUser.id,
            receivedByName: activeUser.name,
            receivedAt: new Date().toISOString()
          }
        : undefined;

    offlineEngine.dispatchMutation(
      'CREATE_PRODUCT',
      { product: newProduct, initialBatch },
      activeUser
    );
  };

  const handleCreateSale = (
    saleData: Omit<Sale, 'id' | 'createdAt' | 'deviceFingerprint'>
  ) => {
    const newSale: Sale = {
      ...saleData,
      id: `sal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      deviceFingerprint: offlineEngine.getDeviceFingerprint(activeUser.deviceLabel)
    };
    offlineEngine.dispatchMutation('CREATE_SALE', newSale, activeUser);
  };

  const handleConfirmTransfer = (saleId: string) => {
    offlineEngine.dispatchMutation('CONFIRM_TRANSFER', { saleId }, activeUser);
  };

  const handleSettleCredit = (saleId: string, amountReceived: number) => {
    offlineEngine.dispatchMutation(
      'SETTLE_CREDIT',
      { saleId, amountReceived },
      activeUser
    );
  };

  const handleCreateExpense = (expenseData: {
    category: ExpenseCategory;
    description: string;
    amount: number;
  }) => {
    offlineEngine.dispatchMutation(
      'CREATE_EXPENSE',
      {
        id: `exp-${Date.now()}`,
        category: expenseData.category,
        description: expenseData.description,
        amount: expenseData.amount,
        recordedByUserId: activeUser.id,
        recordedByName: activeUser.name,
        createdAt: new Date().toISOString()
      },
      activeUser
    );
  };

  const handleUpdateReportConfig = (cfg: Partial<ReportConfig>) => {
    offlineEngine.dispatchMutation('UPDATE_REPORT_CONFIG', cfg, activeUser);
  };

  const handleDispatchReport = async (
    reportType: 'DAILY' | 'WEEKLY',
    channel: 'WHATSAPP' | 'EMAIL'
  ) => {
    if (offlineEngine.isEffectivelyOnline()) {
      try {
        const res = await fetch('/api/reports/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportType, channel })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.snapshot) {
            offlineEngine.updateSnapshotFromServer(data.snapshot);
          }
          return;
        }
      } catch {}
    }
  };

  const isOffline = engineStatus.networkHealth === 'OFFLINE_LOCAL_MODE';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Clean, Uncluttered Top Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-slate-950 font-black text-sm">
              OG
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight hidden sm:inline">
              Ogunleye FMCG
            </span>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'DASHBOARD', label: 'Overview', icon: LayoutDashboard },
                {
                  id: 'INVENTORY',
                  label: 'Inventory',
                  icon: Package,
                  badge: lowStockCount > 0 ? lowStockCount : undefined
                },
                { id: 'POS', label: 'Sales & Expenses', icon: ShoppingCart },
                { id: 'AUDIT', label: 'Price Audit', icon: Fingerprint },
                { id: 'REPORTS', label: 'Reports', icon: MessageSquare }
              ] as const
            ).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {'badge' in tab && tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Utilities: Theme Switcher + Offline Toggle + Staff Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Light / Dark Theme Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTheme('light')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Switch to Light Theme"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Switch to Dark Theme"
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">Dark</span>
              </button>
            </div>

            {/* Compact Network / Offline Toggle */}
            <button
              onClick={() => offlineEngine.setSimulatedOffline(!engineStatus.simulatedOffline)}
              className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isOffline
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              }`}
              title="Click to toggle Offline Mode simulation"
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline ({engineStatus.pendingOutboxCount})</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Online</span>
                </>
              )}
            </button>

            {/* Compact Staff Account Selector */}
            <select
              value={activeUserId}
              onChange={e => setActiveUserId(e.target.value)}
              className="input-clean !h-9 !px-2.5 !text-xs font-semibold !w-auto max-w-[165px]"
              title="Switch active staff or CEO account"
            >
              {snapshot.users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name.split(' ')[0]} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Generous, Breathable Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'DASHBOARD' && (
          <CeoDashboardAndPatternsView
            analytics={analytics}
            products={snapshot.products}
            auditLogs={snapshot.priceAuditLogs}
            onNavigateTab={tab => setActiveTab(tab)}
            onOpenPriceModal={prod => setPriceModalProduct(prod)}
          />
        )}

        {activeTab === 'INVENTORY' && (
          <InventoryAndBatchesView
            products={snapshot.products}
            batches={snapshot.batches}
            activeUser={activeUser}
            onOpenPriceModal={prod => setPriceModalProduct(prod)}
            onReceiveBatch={handleReceiveBatch}
            onCreateProduct={handleCreateProduct}
          />
        )}

        {activeTab === 'POS' && (
          <WarehousePosAndExpensesView
            products={snapshot.products}
            batches={snapshot.batches}
            sales={snapshot.sales}
            expenses={snapshot.expenses}
            activeUser={activeUser}
            onCreateSale={handleCreateSale}
            onConfirmTransfer={handleConfirmTransfer}
            onSettleCredit={handleSettleCredit}
            onCreateExpense={handleCreateExpense}
          />
        )}

        {activeTab === 'AUDIT' && (
          <PriceAuditTrailView
            auditLogs={snapshot.priceAuditLogs}
            products={snapshot.products}
            users={snapshot.users}
            activeUser={activeUser}
            onRevertPrice={handleRevertPrice}
            onOpenPriceModal={prod => setPriceModalProduct(prod)}
          />
        )}

        {activeTab === 'REPORTS' && (
          <ReportsAndAlertsHubView
            analytics={analytics}
            products={snapshot.products}
            auditLogs={snapshot.priceAuditLogs}
            expenses={snapshot.expenses}
            sales={snapshot.sales}
            reportConfig={snapshot.reportConfig}
            reportLogs={snapshot.reportLogs}
            onUpdateReportConfig={handleUpdateReportConfig}
            onDispatchReport={handleDispatchReport}
          />
        )}
      </main>

      {/* Price Modification & Staff Fingerprint Modal */}
      {priceModalProduct && (
        <PriceModifyModal
          product={priceModalProduct}
          users={snapshot.users}
          activeUser={activeUser}
          deviceFingerprint={offlineEngine.getDeviceFingerprint(activeUser.deviceLabel)}
          onClose={() => setPriceModalProduct(null)}
          onConfirmPriceChange={handleConfirmPriceChange}
        />
      )}
    </div>
  );
};
