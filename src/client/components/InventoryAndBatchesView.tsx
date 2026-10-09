import React, { useState, useMemo } from 'react';
import {
  Product,
  StockBatch,
  User,
  FMCGCategory
} from '../../shared/types';
import {
  breakDownStockPieces,
  formatNaira,
  getExpiryStatus,
  getPiecesPerCarton,
  isLowStock
} from '../../shared/fmcg-utils';
import {
  Search,
  AlertTriangle,
  Fingerprint,
  PlusCircle,
  Truck,
  CheckCircle2
} from 'lucide-react';

interface InventoryAndBatchesViewProps {
  products: Product[];
  batches: StockBatch[];
  activeUser: User;
  onOpenPriceModal: (product: Product) => void;
  onReceiveBatch: (batchData: {
    productId: string;
    batchNumber: string;
    expiryDate: string;
    costPriceCarton: number;
    cartonsReceived: number;
    supplierName: string;
  }) => void;
  onCreateProduct: (productData: {
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
  }) => void;
}

const CATEGORIES: ('ALL' | FMCGCategory)[] = [
  'ALL',
  'Noodles & Pasta',
  'Dairy & Beverages',
  'Grains, Flour & Sugar',
  'Cooking Oil & Seasoning',
  'Soft Drinks & Malt',
  'Home & Personal Care'
];

export const InventoryAndBatchesView: React.FC<InventoryAndBatchesViewProps> = ({
  products,
  batches,
  activeUser,
  onOpenPriceModal,
  onReceiveBatch,
  onCreateProduct
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FMCGCategory>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [subTab, setSubTab] = useState<'CATALOG' | 'BATCHES_FEFO'>('CATALOG');

  // Restock Batch Modal state
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [batchNumber, setBatchNumber] = useState('LOT-2026-10A');
  const [expiryDate, setExpiryDate] = useState('2027-08-30');
  const [cartonsReceived, setCartonsReceived] = useState('50');
  const [costPriceCarton, setCostPriceCarton] = useState('');
  const [supplierName, setSupplierName] = useState('Factory Depot');

  // New Product Modal state
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newSku, setNewSku] = useState(`FMCG-NEW-${Math.floor(100 + Math.random() * 899)}`);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState<FMCGCategory>('Noodles & Pasta');
  const [newPacksPerCarton, setNewPacksPerCarton] = useState('4');
  const [newPiecesPerPack, setNewPiecesPerPack] = useState('10');
  const [newCostCarton, setNewCostCarton] = useState('12000');
  const [newCartonPrice, setNewCartonPrice] = useState('13500');
  const [newPackPrice, setNewPackPrice] = useState('3450');
  const [newPiecePrice, setNewPiecePrice] = useState('360');
  const [newLowThreshold, setNewLowThreshold] = useState('25');
  const [newInitialCartons, setNewInitialCartons] = useState('60');

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter(p => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (onlyLowStock && !isLowStock(p)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory, onlyLowStock]);

  const sortedBatches = useMemo(() => {
    return [...batches]
      .filter(b => b.remainingPieces > 0)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }, [batches]);

  const lowStockCount = useMemo(() => products.filter(isLowStock).length, [products]);

  const openRestockForProduct = (p: Product) => {
    setRestockProductId(p.id);
    setCostPriceCarton(String(p.costPriceCarton));
    setBatchNumber(`BATCH-${p.sku.split('-').pop()}-${Math.floor(10 + Math.random() * 89)}`);
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductId) return;
    onReceiveBatch({
      productId: restockProductId,
      batchNumber: batchNumber.trim() || 'BATCH-NEW',
      expiryDate,
      costPriceCarton: Math.round(Number(costPriceCarton) || 0),
      cartonsReceived: Math.max(1, Math.round(Number(cartonsReceived) || 1)),
      supplierName: supplierName.trim() || 'Factory Depot'
    });
    setRestockProductId(null);
  };

  const handleNewProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProduct({
      sku: newSku.trim().toUpperCase(),
      name: newName.trim(),
      brand: newBrand.trim() || 'FMCG Nigeria',
      category: newCategory,
      packsPerCarton: Math.max(1, Number(newPacksPerCarton) || 1),
      piecesPerPack: Math.max(1, Number(newPiecesPerPack) || 1),
      cartonPrice: Math.max(1, Number(newCartonPrice) || 1),
      packPrice: Math.max(1, Number(newPackPrice) || 1),
      piecePrice: Math.max(1, Number(newPiecePrice) || 1),
      costPriceCarton: Math.max(1, Number(newCostCarton) || 1),
      lowStockThresholdCartons: Math.max(1, Number(newLowThreshold) || 10),
      initialCartons: Math.max(0, Number(newInitialCartons) || 0),
      batchNumber: `INIT-${newSku.slice(-3)}`,
      expiryDate: '2027-09-30',
      supplierName: newBrand.trim() || 'Primary Distributor'
    });
    setShowNewProductModal(false);
    setNewName('');
  };

  return (
    <div className="space-y-6">
      {/* Unified Clean Toolbar */}
      <div className="surface-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* View Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSubTab('CATALOG')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'CATALOG'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Products ({products.length})
            </button>
            <button
              onClick={() => setSubTab('BATCHES_FEFO')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'BATCHES_FEFO'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Expiry Batches ({sortedBatches.length})
            </button>
          </div>

          {subTab === 'CATALOG' && (
            <>
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search product, SKU, or brand..."
                  className="input-clean w-full pl-10"
                />
              </div>

              {/* Category Select */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as 'ALL' | FMCGCategory)}
                className="input-clean !w-auto"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              {/* Low Stock Filter */}
              <button
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  onlyLowStock
                    ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-300'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Low Stock ({lowStockCount})</span>
              </button>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => openRestockForProduct(products[0])}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Receive Batch</span>
          </button>
          <button
            onClick={() => setShowNewProductModal(true)}
            className="btn-primary flex items-center gap-1.5 !py-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {subTab === 'CATALOG' ? (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-4 px-5">Product</th>
                  <th className="py-4 px-5">Available Stock</th>
                  <th className="py-4 px-5">Carton Price</th>
                  <th className="py-4 px-5">Pack & Piece</th>
                  {activeUser.role !== 'STAFF' && <th className="py-4 px-5">Cost / Margin</th>}
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-sm">
                {filteredProducts.map(product => {
                  const stockBd = breakDownStockPieces(product.totalPiecesInStock, product);
                  const low = isLowStock(product);
                  const marginPerCarton = product.cartonPrice - product.costPriceCarton;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                    >
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {product.sku}
                          </span>{' '}
                          • 1 Ctn = {product.packsPerCarton} Pck × {product.piecesPerPack} Pcs (
                          {getPiecesPerCarton(product)} Pcs)
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {stockBd.formatted}
                        </div>
                        <div className="mt-1">
                          {low ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-300">
                              <AlertTriangle className="w-3 h-3" />
                              Low (Min {product.lowStockThresholdCartons} Ctn)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              In Stock
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-bold text-base text-slate-900 dark:text-white">
                          {formatNaira(product.cartonPrice)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Wholesale</div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {formatNaira(product.packPrice)}{' '}
                          <span className="text-xs text-slate-400">/ pack</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatNaira(product.piecePrice)} / piece
                        </div>
                      </td>

                      {activeUser.role !== 'STAFF' && (
                        <td className="py-4 px-5">
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            Cost: {formatNaira(product.costPriceCarton)}
                          </div>
                          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            +{formatNaira(marginPerCarton)} / Ctn
                          </div>
                        </td>
                      )}

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenPriceModal(product)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                          >
                            <Fingerprint className="w-3.5 h-3.5" />
                            <span>Modify Price</span>
                          </button>
                          <button
                            onClick={() => openRestockForProduct(product)}
                            className="btn-secondary !py-1.5 !px-2.5 !text-xs"
                          >
                            + Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-4 px-5">FEFO Order & Batch</th>
                  <th className="py-4 px-5">Product</th>
                  <th className="py-4 px-5">Expiry Date</th>
                  <th className="py-4 px-5">Remaining Stock</th>
                  <th className="py-4 px-5">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-sm">
                {sortedBatches.map((batch, idx) => {
                  const prod = products.find(p => p.id === batch.productId);
                  const expInfo = getExpiryStatus(batch.expiryDate);
                  const bd = prod
                    ? breakDownStockPieces(batch.remainingPieces, prod)
                    : { formatted: `${batch.remainingPieces} pcs` };

                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                    >
                      <td className="py-4 px-5">
                        <span className="font-mono text-xs text-slate-400 mr-2">#{idx + 1}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {batch.batchNumber}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-900 dark:text-white">
                        {batch.productName}
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 mr-2">
                          {batch.expiryDate}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            expInfo.status === 'EXPIRED'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                              : expInfo.status === 'EXPIRING_SOON'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {expInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                        {bd.formatted}
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-500 dark:text-slate-400">
                        {batch.supplierName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receive New Stock Batch Modal */}
      {restockProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="surface-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-500" />
              Receive Stock Batch (FEFO)
            </h3>
            <form onSubmit={handleBatchSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Product
                </label>
                <select
                  value={restockProductId}
                  onChange={e => {
                    setRestockProductId(e.target.value);
                    const p = products.find(x => x.id === e.target.value);
                    if (p) setCostPriceCarton(String(p.costPriceCarton));
                  }}
                  className="input-clean w-full"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    className="input-clean w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="input-clean w-full"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Cartons Received
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cartonsReceived}
                    onChange={e => setCartonsReceived(e.target.value)}
                    className="input-clean w-full font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Cost / Carton (₦)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={costPriceCarton}
                    onChange={e => setCostPriceCarton(e.target.value)}
                    className="input-clean w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="input-clean w-full"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProductId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="surface-card max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              New FMCG Product
            </h3>
            <form onSubmit={handleNewProductSubmit} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={e => setNewSku(e.target.value)}
                    className="input-clean w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as FMCGCategory)}
                    className="input-clean w-full"
                  >
                    {CATEGORIES.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Kellogg's Cornflakes"
                    className="input-clean w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                    placeholder="e.g. Tolaram"
                    className="input-clean w-full"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Packs / Carton
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPacksPerCarton}
                    onChange={e => setNewPacksPerCarton(e.target.value)}
                    className="input-clean w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Pieces / Pack
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPiecesPerPack}
                    onChange={e => setNewPiecesPerPack(e.target.value)}
                    className="input-clean w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Opening Cartons
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newInitialCartons}
                    onChange={e => setNewInitialCartons(e.target.value)}
                    className="input-clean w-full font-bold"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Cost / Ctn
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newCostCarton}
                    onChange={e => setNewCostCarton(e.target.value)}
                    className="input-clean w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                    Carton (₦)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newCartonPrice}
                    onChange={e => setNewCartonPrice(e.target.value)}
                    className="input-clean w-full font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Pack (₦)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPackPrice}
                    onChange={e => setNewPackPrice(e.target.value)}
                    className="input-clean w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Piece (₦)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPiecePrice}
                    onChange={e => setNewPiecePrice(e.target.value)}
                    className="input-clean w-full"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
