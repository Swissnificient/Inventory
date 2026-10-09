export type UserRole = 'CEO' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  pin: string; // 4-digit staff verification PIN for price modifications & quick terminal auth
  phone: string;
  email?: string;
  deviceLabel: string;
  active: boolean;
}

export type UnitTier = 'CARTON' | 'PACK' | 'PIECE' | 'COST_CARTON';

export type FMCGCategory =
  | 'Noodles & Pasta'
  | 'Dairy & Beverages'
  | 'Grains, Flour & Sugar'
  | 'Cooking Oil & Seasoning'
  | 'Soft Drinks & Malt'
  | 'Home & Personal Care';

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: FMCGCategory;
  packsPerCarton: number;   // e.g. 1 Carton = 4 Packs (or 1 if Carton goes straight to Pieces)
  piecesPerPack: number;    // e.g. 1 Pack = 10 Pieces -> 1 Carton = 40 Pieces
  cartonPrice: number;      // Wholesale Carton selling price (NGN)
  packPrice: number;        // Sub-wholesale Pack/Roll selling price (NGN)
  piecePrice: number;       // Single unit price (NGN)
  costPriceCarton: number;  // Latest landed cost per Carton (NGN)
  lowStockThresholdCartons: number;
  totalPiecesInStock: number;
  updatedAt: string;
}

export interface StockBatch {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  costPriceCarton: number;
  initialPieces: number;
  remainingPieces: number;
  supplierName: string;
  receivedByUserId: string;
  receivedByName: string;
  receivedAt: string;
}

export interface PriceAuditLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  changedByUserId: string;
  changedByName: string;
  changedByRole: UserRole;
  unitTier: UnitTier;
  oldPrice: number;
  newPrice: number;
  priceDiff: number;
  percentChange: number;
  reason: string;
  deviceFingerprint: string;
  ipAddress: string;
  createdAt: string;
  syncedAt: string;
  flaggedHighRisk: boolean; // True if price was lowered below cost or changed > 10% or by non-CEO
}

export type PaymentMethod = 'CASH' | 'POS' | 'TRANSFER' | 'CREDIT';
export type TransferStatus = 'PENDING' | 'CONFIRMED' | 'NOT_APPLICABLE';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitTier: 'CARTON' | 'PACK' | 'PIECE';
  quantity: number;
  piecesDeducted: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  cogs: number;
  profit: number;
  batchNumberUsed?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  items: SaleItem[];
  totalAmount: number;
  totalCogs: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  posTerminalRef?: string;
  transferBank?: string;
  transferSender?: string;
  transferReference?: string;
  transferStatus: TransferStatus;
  amountPaid: number;
  balanceDue: number;
  soldByUserId: string;
  soldByName: string;
  deviceFingerprint: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Diesel & Generator Fuel'
  | 'Loading & Offloading Labor'
  | 'Waybill & Haulage Transport'
  | 'POS & Bank Charges'
  | 'Warehouse Maintenance & Security'
  | 'Staff Welfare & Miscellaneous';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  recordedByUserId: string;
  recordedByName: string;
  createdAt: string;
}

export interface ReportConfig {
  ceoName: string;
  ceoWhatsAppNumber: string;
  ceoEmail: string;
  dailyReportTime: string; // e.g. "19:00"
  weeklyReportDay: string; // e.g. "Sunday"
  autoAlertOnPriceChange: boolean;
  autoAlertOnLowStock: boolean;
  whatsappWebhookUrl?: string;
}

export interface ReportLog {
  id: string;
  reportType: 'DAILY' | 'WEEKLY' | 'INSTANT_ALERT';
  channel: 'WHATSAPP' | 'EMAIL';
  recipient: string;
  subject: string;
  messageBody: string;
  sentAt: string;
  status: 'DELIVERED' | 'QUEUED_OFFLINE';
}

export type SyncMutationType =
  | 'MODIFY_PRICE'
  | 'CREATE_SALE'
  | 'CONFIRM_TRANSFER'
  | 'SETTLE_CREDIT'
  | 'RECEIVE_BATCH'
  | 'CREATE_EXPENSE'
  | 'CREATE_PRODUCT'
  | 'UPDATE_REPORT_CONFIG';

export interface SyncMutation {
  id: string;
  type: SyncMutationType;
  payload: any;
  createdAt: string;
  deviceFingerprint: string;
  userId: string;
  userName: string;
}

export interface WarehouseStateSnapshot {
  version: number;
  serverTime: string;
  users: User[];
  products: Product[];
  batches: StockBatch[];
  priceAuditLogs: PriceAuditLog[];
  sales: Sale[];
  expenses: Expense[];
  reportConfig: ReportConfig;
  reportLogs: ReportLog[];
}

export interface ProductVelocityInsight {
  productId: string;
  productName: string;
  sku: string;
  category: FMCGCategory;
  cartonsSold7d: number;
  piecesSold7d: number;
  revenue7d: number;
  profit7d: number;
  dailyBurnRateCartons: number;
  currentStockCartons: number;
  daysUntilStockout: number | null; // null if 0 burn rate
  peakDayOfWeek: string;
  trendLabel: 'SURGING' | 'STEADY' | 'SLOW_MOVING';
}

export interface DayOfWeekPattern {
  dayName: string; // Mon, Tue, Wed...
  dateStr: string;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  cartonsMoved: number;
  transactionsCount: number;
  topProduct: string;
}

export interface WeeklyPatternAnalytics {
  periodStart: string;
  periodEnd: string;
  totalRevenue7d: number;
  totalCogs7d: number;
  grossProfit7d: number;
  totalExpenses7d: number;
  netProfit7d: number;
  revenueToday: number;
  grossProfitToday: number;
  expensesToday: number;
  netProfitToday: number;
  pendingTransfersCount: number;
  pendingTransfersAmount: number;
  outstandingCreditAmount: number;
  lowStockProductsCount: number;
  expiringBatchesCount: number;
  priceChanges7dCount: number;
  flaggedPriceChangesCount: number;
  topSellingProducts: ProductVelocityInsight[];
  dayOfWeekPatterns: DayOfWeekPattern[];
}
