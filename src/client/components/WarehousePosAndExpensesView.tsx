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
  Trash2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Banknote,
  Clock,
  Plus,
  FilePlus2,
  Receipt
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
  productId: string;
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
  const [mode, setMode] = useState<'RECORD_SALE' | 'EXPENSES'>('RECORD_SALE');

  // Direct Sale Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedUnit, setSelectedUnit] = useState<'CARTON' | 'PACK' | 'PIECE'>('CARTON');
  const [quantityInput, setQuantityInput] = useState<string>('5');
  const [extraItems, setExtraItems] = useState<CartDraftItem[]>([]);

  // Customer & Payment State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [posTerminalRef, setPosTerminalRef] = useState('MONIEPOINT-POS-01');
  const [transferBank, setTransferBank] = useState('Zenith Bank');
  const [transferRef, setTransferRef] = useState(`NIP/${Date.now().toString().slice(-6)}`);
  const [transferConfirmedNow, setTransferConfirmedNow] = useState(false);
  const [creditPaidNow, setCreditPaidNow] = useState('0');
  const [saleBanner, setSaleBanner] = useState<string | null>(null);

  // Expense Form State
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Diesel & Generator Fuel');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  // Combine current form selection with any extra added items so the user can either:
  // 1) Just pick a product + quantity and click "Save Sales Record" directly, OR
  // 2) Click "+ Add Another Item" to build a multi-item invoice!
  const effectiveDraftList = useMemo(() => {
    const qty = Math.max(0, Math.floor(Number(quantityInput) || 0));
    const list = [...extraItems];
    if (selectedProduct && qty > 0) {
      const key = `${selectedProduct.id}-${selectedUnit}`;
      const existingIdx = list.findIndex(i => i.key === key);
      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          quantity: list[existingIdx].quantity + qty
        };
      } else {
        list.push({
          key,
          productId: selectedProduct.id,
          unitTier: selectedUnit,
          quantity: qty
        });
      }
    }
    return list;
  }, [extraItems, selectedProduct, selectedUnit, quantityInput]);

  const handleAddLineItem = () => {
    if (!selectedProduct) return;
    const qty = Math.max(1, Math.floor(Number(quantityInput) || 1));
    const key = `${selectedProduct.id}-${selectedUnit}`;
    setExtraItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => (i.key === key ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { key, productId: selectedProduct.id, unitTier: selectedUnit, quantity: qty }];
    });
    setQuantityInput('0');
  };

  const removeExtraItem = (key: string) => {
    setExtraItems(prev => prev.filter(i => i.key !== key));
  };

  const orderSummary = useMemo(() => {
    let totalAmount = 0;
    let totalCogs = 0;

    const items: SaleItem[] = effectiveDraftList.map((c, idx) => {
      const prod = products.find(p => p.id === c.productId) || products[0];
      const unitPrice = getUnitPrice(prod, c.unitTier);
      const unitCost = getUnitCost(prod, c.unitTier);
      const piecesDeducted = getPiecesForUnit(prod, c.unitTier) * c.quantity;
      const subtotal = unitPrice * c.quantity;
      const cogs = unitCost * c.quantity;
      const profit = subtotal - cogs;

      const earliestBatch = batches
        .filter(b => b.productId === prod.id && b.remainingPieces > 0)
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];

      totalAmount += subtotal;
      totalCogs += cogs;

      return {
        id: `sli-${Date.now()}-${idx}`,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
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
  }, [effectiveDraftList, products, batches]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderSummary.items.length === 0) return;

    const invNum = `INV-2026-${Math.floor(1010 + sales.length + Math.random() * 90)}`;
    const isCredit = paymentMethod === 'CREDIT';
    const paid = isCredit
      ? Math.min(orderSummary.totalAmount, Math.max(0, Math.round(Number(creditPaidNow) || 0)))
      : orderSummary.totalAmount;
    const balanceDue = isCredit ? orderSummary.totalAmount - paid : 0;

    const transferStatus: TransferStatus =
      paymentMethod === 'TRANSFER'
        ? transferConfirmedNow
          ? 'CONFIRMED'
          : 'PENDING'
        : 'NOT_APPLICABLE';

    const buyer = customerName.trim() || 'Walk-in Wholesale Customer';

    onCreateSale({
      invoiceNumber: invNum,
      customerName: buyer,
      customerPhone: customerPhone.trim() || '—',
      items: orderSummary.items,
      totalAmount: orderSummary.totalAmount,
      totalCogs: orderSummary.totalCogs,
      grossProfit: orderSummary.grossProfit,
      paymentMethod,
      posTerminalRef: paymentMethod === 'POS' ? posTerminalRef : undefined,
      transferBank: paymentMethod === 'TRANSFER' ? transferBank : undefined,
      transferSender: paymentMethod === 'TRANSFER' ? buyer : undefined,
      transferReference: paymentMethod === 'TRANSFER' ? transferRef : undefined,
      transferStatus,
      amountPaid: paid,
      balanceDue,
      soldByUserId: activeUser.id,
      soldByName: activeUser.name
    });

    setExtraItems([]);
    setQuantityInput('1');
    setCustomerName('');
    setCustomerPhone('');
    setSaleBanner(
      `Sales Record ${invNum} (${formatNaira(orderSummary.totalAmount)}) logged by ${activeUser.name}!`
    );
    setTimeout(() => setSaleBanner(null), 5000);
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

  return (
    <div className="space-y-6">
      {/* Sub-navigation switcher */}
      <div className="surface-card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setMode('RECORD_SALE')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              mode === 'RECORD_SALE'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FilePlus2 className="w-4 h-4 text-emerald-500" />
            <span>Log a Sales Record & Invoices ({sales.length})</span>
          </button>

          <button
            onClick={() => setMode('EXPENSES')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              mode === 'EXPENSES'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Warehouse Expenses ({expenses.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Logged in as:{' '}
          <strong className="text-slate-900 dark:text-white">
            {activeUser.name} ({activeUser.role})
          </strong>
        </div>
      </div>

      {saleBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{saleBanner}</span>
        </div>
      )}

      {mode === 'RECORD_SALE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clear, Step-by-Step "Log a Sales Record" Form (5 cols) */}
          <div className="lg:col-span-5 surface-card p-6 space-y-5">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FilePlus2 className="w-5 h-5 text-emerald-500" />
                <span>Log a New Sales Record</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select product, unit (Carton/Pack/Piece), quantity, and payment method
              </p>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4 text-sm">
              {/* Step 1: Select FMCG Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  1. Select FMCG Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="input-clean w-full font-semibold"
                >
                  {products.map(p => {
                    const bd = breakDownStockPieces(p.totalPiecesInStock, p);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatNaira(p.cartonPrice)}/Ctn ({bd.shortFormatted} left)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 2: Select Unit Tier & Quantity */}
              {selectedProduct && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    2. Choose Packaging Unit & Quantity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          tier: 'CARTON',
                          label: 'Carton',
                          price: selectedProduct.cartonPrice
                        },
                        {
                          tier: 'PACK',
                          label: 'Pack / Roll',
                          price: selectedProduct.packPrice
                        },
                        {
                          tier: 'PIECE',
                          label: 'Single Piece',
                          price: selectedProduct.piecePrice
                        }
                      ] as const
                    ).map(u => (
                      <button
                        type="button"
                        key={u.tier}
                        onClick={() => setSelectedUnit(u.tier)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          selectedUnit === u.tier
                            ? 'bg-emerald-500/15 border-emerald-500 text-slate-900 dark:text-white'
                            : 'surface-muted text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{u.label}</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {formatNaira(u.price)}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-end gap-2.5">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Quantity ({selectedUnit.toLowerCase()}s)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={quantityInput}
                        onChange={e => setQuantityInput(e.target.value)}
                        className="input-clean w-full font-bold !text-base"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="btn-secondary !h-10 flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4 text-emerald-500" />
                      <span>Add Another Product</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Items Preview */}
              {orderSummary.items.length > 0 && (
                <div className="surface-muted p-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase text-slate-400">
                    Items in This Sales Record ({orderSummary.items.length})
                  </div>
                  {orderSummary.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs border-b border-slate-200/60 dark:border-slate-800/60 last:border-0 pb-1.5 last:pb-0"
                    >
                      <div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.quantity} {item.unitTier}
                        </span>{' '}
                        × <span className="font-medium">{item.productName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{formatNaira(item.subtotal)}</span>
                        {extraItems.some(
                          x => x.key === `${item.productId}-${item.unitTier}`
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              removeExtraItem(`${item.productId}-${item.unitTier}`)
                            }
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Customer Details */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    3. Buyer / Store Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Mama Nkechi Stores"
                    className="input-clean w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Buyer Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="0803..."
                    className="input-clean w-full"
                  />
                </div>
              </div>

              {/* Step 4: Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  4. Payment Method
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
                      className="input-clean !h-9 !text-xs"
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
                      className="input-clean !h-9 !text-xs font-mono"
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
                    Amount Paid Now (₦):
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={orderSummary.totalAmount}
                    value={creditPaidNow}
                    onChange={e => setCreditPaidNow(e.target.value)}
                    className="input-clean !w-32 !h-8 text-right font-bold"
                  />
                </div>
              )}

              {/* Total & Submit */}
              <div className="flex items-baseline justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  Total Sales Amount
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatNaira(orderSummary.totalAmount)}
                </span>
              </div>

              <button
                type="submit"
                disabled={orderSummary.items.length === 0}
                className="btn-primary w-full !py-3.5 !text-base flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Save Sales Record ({formatNaira(orderSummary.totalAmount)})</span>
              </button>
            </form>
          </div>

          {/* Right Column: Recent Sales Records Table (7 cols) */}
          <div className="lg:col-span-7 surface-card overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  <span>Logged Sales Records ({sales.length})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All warehouse sales with staff attribution and payment confirmation
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Invoice & Staff</th>
                    <th className="py-3.5 px-4">Customer & Items</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-sm">
                  {sales.map(sale => (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {sale.invoiceNumber}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          By {sale.soldByName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(sale.createdAt).toLocaleString('en-NG')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {sale.customerName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mt-0.5">
                          {sale.items.map(item => (
                            <div key={item.id}>
                              <strong>
                                {item.quantity} {item.unitTier}
                              </strong>{' '}
                              × {item.productName}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatNaira(sale.totalAmount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 block w-fit">
                          {sale.paymentMethod}
                        </span>
                        {sale.paymentMethod === 'TRANSFER' && (
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

                      <td className="py-3.5 px-4 text-right">
                        {sale.paymentMethod === 'TRANSFER' &&
                          sale.transferStatus === 'PENDING' && (
                            <button
                              onClick={() => onConfirmTransfer(sale.id)}
                              className="btn-primary !py-1.5 !px-2.5 !text-xs"
                            >
                              Confirm Alert
                            </button>
                          )}
                        {sale.balanceDue > 0 && (
                          <button
                            onClick={() => onSettleCredit(sale.id, sale.balanceDue)}
                            className="btn-secondary !py-1.5 !px-2.5 !text-xs"
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
        </div>
      ) : (
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
                      By {exp.recordedByName} •{' '}
                      {new Date(exp.createdAt).toLocaleDateString('en-NG')}
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
