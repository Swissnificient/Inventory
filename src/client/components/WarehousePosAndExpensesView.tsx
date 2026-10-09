import React, { useState, useMemo } from 'react';
import {
  Product,
  StockBatch,
  Sale,
  SaleItem,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  TransferStatus,
  User
} from '../../shared/types';
import {
  breakDownStockPieces,
  formatNaira,
  getPiecesForUnit,
  getUnitCost,
  getUnitPrice
} from '../../shared/fmcg-utils';
import {
  ShoppingCart,
  Search,
  Trash2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Banknote,
  Clock,
  Plus
} from 'lucide-react';

interface WarehousePosAndExpensesViewProps {
  products: Product[];
  batches: StockBatch[];
  sales: Sale[];
  expenses: Expense[];
  activeUser: User;
  onCreateSale: (saleData: Omit<Sale, 'id' | 'createdAt' | 'deviceFingerprint'>) => void;
  onConfirmTransfer: (saleId: string) => void;
  onSettleCredit: (saleId: string, amountReceived: number) => void;
  onCreateExpense: (expenseData: {
    category: ExpenseCategory;
    description: string;
    amount: number;
  }) => void;
}

interface CartDraftItem {
  key: string;
  product: Product;
  unitTier: 'CARTON' | 'PACK' | 'PIECE';
  quantity: number;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Diesel & Generator Fuel',
  'Loading & Offloading Labor',
  'Waybill & Haulage Transport',
  'POS & Bank Charges',
  'Warehouse Maintenance & Security',
  'Staff Welfare & Miscellaneous'
];

const NIGERIAN_BANKS = [
  'Zenith Bank',
  'GTBank',
  'Access Bank',
  'First Bank',
  'UBA',
  'Moniepoint MFB',
  'OPay / Paycom',
  'Fidelity Bank'
];

export const WarehousePosAndExpensesView: React.FC<WarehousePosAndExpensesViewProps> = ({
  products,
  batches,
  sales,
  expenses,
  activeUser,
  onCreateSale,
  onConfirmTransfer,
  onSettleCredit,
  onCreateExpense
}) => {
  const [mode, setMode] = useState<'POS' | 'INVOICES' | 'EXPENSES'>('POS');
  const [posSearch, setPosSearch] = useState('');
  const [cart, setCart] = useState<CartDraftItem[]>([
    {
      key: `${products[0]?.id}-CARTON`,
      product: products[0],
      unitTier: 'CARTON',
      quantity: 10
    }
  ]);

  // Customer & Payment state
  const [customerName, setCustomerName] = useState('Walk-in Wholesale Buyer');
  const [customerPhone, setCustomerPhone] = useState('08030001122');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [posTerminalRef, setPosTerminalRef] = useState('MONIEPOINT-POS-01');
  const [transferBank, setTransferBank] = useState('Zenith Bank');
  const [transferRef, setTransferRef] = useState(`NIP/${Date.now().toString().slice(-6)}`);
  const [transferConfirmedNow, setTransferConfirmedNow] = useState(false);
  const [creditPaidNow, setCreditPaidNow] = useState('0');
  const [saleBanner, setSaleBanner] = useState<string | null>(null);

  // Expense form state
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Diesel & Generator Fuel');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');

  const filteredProducts = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, posSearch]);

  const addToCart = (product: Product, unitTier: 'CARTON' | 'PACK' | 'PIECE', qtyToAdd = 1) => {
    const key = `${product.id}-${unitTier}`;
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i =>
          i.key === key ? { ...i, product, quantity: i.quantity + qtyToAdd } : i
        );
      }
      return [...prev, { key, product, unitTier, quantity: qtyToAdd }];
    });
  };

  const updateCartQty = (key: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.key !== key));
      return;
    }
    setCart(prev => prev.map(i => (i.key === key ? { ...i, quantity: qty } : i)));
  };

  const cartSummary = useMemo(() => {
    let totalAmount = 0;
    let totalCogs = 0;

    const items: SaleItem[] = cart.map((c, idx) => {
      const latestProd = products.find(p => p.id === c.product.id) || c.product;
      const unitPrice = getUnitPrice(latestProd, c.unitTier);
      const unitCost = getUnitCost(latestProd, c.unitTier);
      const piecesDeducted = getPiecesForUnit(latestProd, c.unitTier) * c.quantity;
      const subtotal = unitPrice * c.quantity;
      const cogs = unitCost * c.quantity;
      const profit = subtotal - cogs;

      const earliestBatch = batches
        .filter(b => b.productId === latestProd.id && b.remainingPieces > 0)
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];

      totalAmount += subtotal;
      totalCogs += cogs;

      return {
        id: `sli-${Date.now()}-${idx}`,
        productId: latestProd.id,
        productName: latestProd.name,
        sku: latestProd.sku,
        unitTier: c.unitTier,
        quantity: c.quantity,
        piecesDeducted,
        unitPrice,
        unitCost,
        subtotal,
        cogs,
        profit,
        batchNumberUsed: earliestBatch?.batchNumber || 'MAIN-STOCK'
      };
    });

    return {
      items,
      totalAmount,
      totalCogs,
      grossProfit: totalAmount - totalCogs
    };
  }, [cart, products, batches]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartSummary.items.length === 0) return;

    const invNum = `INV-2026-${Math.floor(1010 + sales.length + Math.random() * 90)}`;
    const isCredit = paymentMethod === 'CREDIT';
    const paid = isCredit
      ? Math.min(cartSummary.totalAmount, Math.max(0, Math.round(Number(creditPaidNow) || 0)))
      : cartSummary.totalAmount;
    const balanceDue = isCredit ? cartSummary.totalAmount - paid : 0;

    const transferStatus: TransferStatus =
      paymentMethod === 'TRANSFER'
        ? transferConfirmedNow
          ? 'CONFIRMED'
          : 'PENDING'
        : 'NOT_APPLICABLE';

    onCreateSale({
      invoiceNumber: invNum,
      customerName: customerName.trim() || 'Walk-in Wholesale Buyer',
      customerPhone: customerPhone.trim() || '—',
      items: cartSummary.items,
      totalAmount: cartSummary.totalAmount,
      totalCogs: cartSummary.totalCogs,
      grossProfit: cartSummary.grossProfit,
      paymentMethod,
      posTerminalRef: paymentMethod === 'POS' ? posTerminalRef : undefined,
      transferBank: paymentMethod === 'TRANSFER' ? transferBank : undefined,
      transferSender: paymentMethod === 'TRANSFER' ? customerName : undefined,
      transferReference: paymentMethod === 'TRANSFER' ? transferRef : undefined,
      transferStatus,
      amountPaid: paid,
      balanceDue,
      soldByUserId: activeUser.id,
      soldByName: activeUser.name
    });

    setCart([]);
    setSaleBanner(`Invoice ${invNum} (${formatNaira(cartSummary.totalAmount)}) recorded!`);
    setTimeout(() => setSaleBanner(null), 4000);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.round(Number(expAmount) || 0);
    if (amt <= 0 || !expDesc.trim()) return;
    onCreateExpense({
      category: expCategory,
      description: expDesc.trim(),
      amount: amt
    });
    setExpDesc('');
    setExpAmount('');
  };

  const pendingTransfersCount = useMemo(
    () => sales.filter(s => s.paymentMethod === 'TRANSFER' && s.transferStatus === 'PENDING').length,
    [sales]
  );

  return (
    <div className="space-y-6">
      {/* Clean Sub-Nav Bar */}
      <div className="surface-card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setMode('POS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'POS'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Sales Terminal
          </button>
          <button
            onClick={() => setMode('INVOICES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === 'INVOICES'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>Invoices & Transfers ({sales.length})</span>
            {pendingTransfersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                {pendingTransfersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMode('EXPENSES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'EXPENSES'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Expenses ({expenses.length})
          </button>
        </div>

        {mode === 'POS' && (
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={posSearch}
              onChange={e => setPosSearch(e.target.value)}
              placeholder="Search product to add..."
              className="input-clean w-full pl-10"
            />
          </div>
        )}
      </div>

      {saleBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{saleBanner}</span>
        </div>
      )}

      {mode === 'POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Spacious Product Cards (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
            {filteredProducts.map(product => {
              const bd = breakDownStockPieces(product.totalPiecesInStock, product);
              return (
                <div
                  key={product.id}
                  className="surface-card p-4 flex flex-col justify-between gap-4 hover:border-emerald-500/40 transition"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {product.sku}
                      </span>
                      <span className="font-medium">{bd.shortFormatted}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                      {product.name}
                    </h4>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => addToCart(product, 'CARTON', 1)}
                      className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition"
                    >
                      <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                        + Carton
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatNaira(product.cartonPrice)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => addToCart(product, 'PACK', 1)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition"
                    >
                      <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                        + Pack
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {formatNaira(product.packPrice)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => addToCart(product, 'PIECE', 1)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition"
                    >
                      <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                        + Piece
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {formatNaira(product.piecePrice)}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Clean Order Summary Card (5 cols) */}
          <div className="lg:col-span-5 surface-card p-6 flex flex-col justify-between space-y-5 h-fit sticky top-24">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-500" />
                  <span>Current Order ({cart.length})</span>
                </h3>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-rose-500 hover:underline font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              {cartSummary.items.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  Select products on the left to build an invoice.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {cart.map((c, idx) => {
                    const line = cartSummary.items[idx];
                    return (
                      <div
                        key={c.key}
                        className="surface-muted p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {line.productName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {line.unitTier} @ {formatNaira(line.unitPrice)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={c.quantity}
                            onChange={e => updateCartQty(c.key, Number(e.target.value))}
                            className="input-clean !w-16 !h-8 !px-2 text-center font-bold !text-xs"
                          />
                          <div className="w-24 text-right font-bold text-xs text-slate-900 dark:text-white">
                            {formatNaira(line.subtotal)}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateCartQty(c.key, 0)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form
              onSubmit={handleCheckout}
              className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="input-clean w-full !h-9 !text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="input-clean w-full !h-9 !text-xs"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'TRANSFER', label: 'Transfer', icon: Landmark },
                      { id: 'POS', label: 'POS', icon: CreditCard },
                      { id: 'CASH', label: 'Cash', icon: Banknote },
                      { id: 'CREDIT', label: 'Credit', icon: Clock }
                    ] as const
                  ).map(pm => {
                    const Icon = pm.icon;
                    return (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`py-2 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                          paymentMethod === pm.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                            : 'surface-muted text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod === 'TRANSFER' && (
                <div className="surface-muted p-3 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={transferBank}
                      onChange={e => setTransferBank(e.target.value)}
                      className="input-clean !h-8 !text-xs"
                    >
                      {NIGERIAN_BANKS.map(b => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={transferRef}
                      onChange={e => setTransferRef(e.target.value)}
                      placeholder="Transfer Ref"
                      className="input-clean !h-8 !text-xs font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferConfirmedNow}
                      onChange={e => setTransferConfirmedNow(e.target.checked)}
                    />
                    <span className="text-slate-600 dark:text-slate-300">
                      Bank alert already confirmed
                    </span>
                  </label>
                </div>
              )}

              {paymentMethod === 'CREDIT' && (
                <div className="surface-muted p-3 text-xs flex items-center justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Deposit Paid Now (₦):
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={cartSummary.totalAmount}
                    value={creditPaidNow}
                    onChange={e => setCreditPaidNow(e.target.value)}
                    className="input-clean !w-32 !h-8 text-right font-bold"
                  />
                </div>
              )}

              <div className="flex items-baseline justify-between pt-2">
                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Total Amount
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatNaira(cartSummary.totalAmount)}
                </span>
              </div>

              <button
                type="submit"
                disabled={cartSummary.items.length === 0}
                className="btn-primary w-full !py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Sale</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {mode === 'INVOICES' && (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-4 px-5">Invoice</th>
                  <th className="py-4 px-5">Customer</th>
                  <th className="py-4 px-5">Items</th>
                  <th className="py-4 px-5">Amount</th>
                  <th className="py-4 px-5">Payment Status</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-sm">
                {sales.map(sale => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {sale.invoiceNumber}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(sale.createdAt).toLocaleDateString('en-NG')} • {sale.soldByName}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {sale.customerName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {sale.customerPhone}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                      {sale.items.map(item => (
                        <div key={item.id}>
                          <strong>
                            {item.quantity} {item.unitTier}
                          </strong>{' '}
                          × {item.productName}
                        </div>
                      ))}
                    </td>

                    <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                      {formatNaira(sale.totalAmount)}
                    </td>

                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 mr-1.5">
                        {sale.paymentMethod}
                      </span>
                      {sale.paymentMethod === 'TRANSFER' && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            sale.transferStatus === 'CONFIRMED'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {sale.transferStatus}
                        </span>
                      )}
                      {sale.balanceDue > 0 && (
                        <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                          Due: {formatNaira(sale.balanceDue)}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right">
                      {sale.paymentMethod === 'TRANSFER' &&
                        sale.transferStatus === 'PENDING' && (
                          <button
                            onClick={() => onConfirmTransfer(sale.id)}
                            className="btn-primary !py-1.5 !px-3 !text-xs"
                          >
                            Confirm Transfer
                          </button>
                        )}
                      {sale.balanceDue > 0 && (
                        <button
                          onClick={() => onSettleCredit(sale.id, sale.balanceDue)}
                          className="btn-secondary !py-1.5 !px-3 !text-xs"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'EXPENSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 surface-card p-6 space-y-4 h-fit">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Log Warehouse Expense
            </h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                  className="input-clean w-full"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={e => setExpDesc(e.target.value)}
                  placeholder="e.g. Generator diesel / Offloading labor"
                  className="input-clean w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  min={1}
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  placeholder="45000"
                  className="input-clean w-full font-bold"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Record Expense</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 surface-card overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Expense History
              </h3>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Total: {formatNaira(expenses.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {expenses.map(exp => (
                <div key={exp.id} className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {exp.category}
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">
                      {exp.description}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      By {exp.recordedByName} • {new Date(exp.createdAt).toLocaleDateString('en-NG')}
                    </div>
                  </div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 shrink-0">
                    -{formatNaira(exp.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
