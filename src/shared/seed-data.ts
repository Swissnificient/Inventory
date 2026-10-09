import { WarehouseStateSnapshot } from './types';

export function createInitialWarehouseSeed(): WarehouseStateSnapshot {
  const now = new Date('2026-10-09T09:00:00+01:00');
  const dayOffsetIso = (daysAgo: number, hour = 11, min = 30) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    d.setUTCHours(hour, min, 0, 0);
    return d.toISOString();
  };

  return {
    version: 1,
    serverTime: now.toISOString(),
    users: [
      {
        id: 'usr-ceo-01',
        name: 'Chief Adewale Ogunleye',
        role: 'CEO',
        title: 'Managing Director / CEO',
        pin: '1111',
        phone: '+2348032001100',
        email: 'ceo@ogunleyefmcg.ng',
        deviceLabel: 'CEO-MacBook-Pro (Remote)',
        active: true
      },
      {
        id: 'usr-mgr-02',
        name: 'Chinedu Okafor',
        role: 'MANAGER',
        title: 'Chief Warehouse Manager',
        pin: '2222',
        phone: '+2348064419822',
        email: 'chinedu.mgr@ogunleyefmcg.ng',
        deviceLabel: 'WH-Supervisor-PC01 (Ikeja Depot)',
        active: true
      },
      {
        id: 'usr-stf-03',
        name: 'Amina Bello',
        role: 'STAFF',
        title: 'Senior Sales & Billing Cashier',
        pin: '3333',
        phone: '+2348129083311',
        deviceLabel: 'POS-Counter-Terminal-A',
        active: true
      },
      {
        id: 'usr-stf-04',
        name: 'Tunde Bakare',
        role: 'STAFF',
        title: 'Loading Bay & Dispatch Clerk',
        pin: '4444',
        phone: '+2347081124590',
        deviceLabel: 'Loading-Bay-Tablet-02',
        active: true
      }
    ],
    products: [
      {
        id: 'prd-indomie-super',
        sku: 'FMCG-NDL-001',
        name: 'Indomie Super Pack (120g x 40)',
        brand: 'Dufil Prima',
        category: 'Noodles & Pasta',
        packsPerCarton: 4,
        piecesPerPack: 10,
        cartonPrice: 10400,
        packPrice: 2650,
        piecePrice: 280,
        costPriceCarton: 9200,
        lowStockThresholdCartons: 40,
        totalPiecesInStock: 7420, // 185 Cartons + 2 Packs
        updatedAt: dayOffsetIso(1)
      },
      {
        id: 'prd-peak-sachet',
        sku: 'FMCG-DRY-002',
        name: 'Peak Milk Powder Sachet (14g x 210)',
        brand: 'FrieslandCampina',
        category: 'Dairy & Beverages',
        packsPerCarton: 10,
        piecesPerPack: 21,
        cartonPrice: 29400,
        packPrice: 3000,
        piecePrice: 150,
        costPriceCarton: 26500,
        lowStockThresholdCartons: 25,
        totalPiecesInStock: 19320, // 92 Cartons
        updatedAt: dayOffsetIso(2)
      },
      {
        id: 'prd-gpenny-semo',
        sku: 'FMCG-GRN-003',
        name: 'Golden Penny Semovita (1kg x 10 Bale)',
        brand: 'Flour Mills NG',
        category: 'Grains, Flour & Sugar',
        packsPerCarton: 2,
        piecesPerPack: 5,
        cartonPrice: 15500,
        packPrice: 7850,
        piecePrice: 1600,
        costPriceCarton: 13800,
        lowStockThresholdCartons: 30,
        totalPiecesInStock: 1185, // 118 Cartons + 1 Pack
        updatedAt: dayOffsetIso(3)
      },
      {
        id: 'prd-milo-sachet',
        sku: 'FMCG-DRY-004',
        name: 'Nestlé Milo Activ-Go (20g x 200)',
        brand: 'Nestlé Nigeria',
        category: 'Dairy & Beverages',
        packsPerCarton: 10,
        piecesPerPack: 20,
        cartonPrice: 27500,
        packPrice: 2800,
        piecePrice: 150,
        costPriceCarton: 24800,
        lowStockThresholdCartons: 25,
        totalPiecesInStock: 12800, // 64 Cartons
        updatedAt: dayOffsetIso(1)
      },
      {
        id: 'prd-dangote-sugar',
        sku: 'FMCG-GRN-005',
        name: 'Dangote Granulated Sugar (500g x 20)',
        brand: 'Dangote Sugar',
        category: 'Grains, Flour & Sugar',
        packsPerCarton: 4,
        piecesPerPack: 5,
        cartonPrice: 19000,
        packPrice: 4800,
        piecePrice: 980,
        costPriceCarton: 17200,
        lowStockThresholdCartons: 35,
        totalPiecesInStock: 360, // 18 Cartons -> LOW STOCK ALERT!
        updatedAt: dayOffsetIso(0, 8, 10)
      },
      {
        id: 'prd-kings-oil',
        sku: 'FMCG-OIL-006',
        name: "Devon King's Veg Oil (1L x 12)",
        brand: 'PZ Wilmar',
        category: 'Cooking Oil & Seasoning',
        packsPerCarton: 3,
        piecesPerPack: 4,
        cartonPrice: 34200,
        packPrice: 11500,
        piecePrice: 2950,
        costPriceCarton: 31000,
        lowStockThresholdCartons: 20,
        totalPiecesInStock: 168, // 14 Cartons -> LOW STOCK ALERT!
        updatedAt: dayOffsetIso(2)
      },
      {
        id: 'prd-maggi-star',
        sku: 'FMCG-OIL-007',
        name: 'Maggi Star Seasoning (100 Cubes x 20)',
        brand: 'Nestlé Nigeria',
        category: 'Cooking Oil & Seasoning',
        packsPerCarton: 20,
        piecesPerPack: 1,
        cartonPrice: 23800,
        packPrice: 1220,
        piecePrice: 1220,
        costPriceCarton: 21400,
        lowStockThresholdCartons: 25,
        totalPiecesInStock: 1560, // 78 Cartons
        updatedAt: dayOffsetIso(4)
      },
      {
        id: 'prd-coke-pet',
        sku: 'FMCG-DRK-008',
        name: 'Coca-Cola PET 50cl (Case x 12)',
        brand: 'NBC',
        category: 'Soft Drinks & Malt',
        packsPerCarton: 2,
        piecesPerPack: 6,
        cartonPrice: 3800,
        packPrice: 1950,
        piecePrice: 350,
        costPriceCarton: 3200,
        lowStockThresholdCartons: 50,
        totalPiecesInStock: 2520, // 210 Cartons
        updatedAt: dayOffsetIso(2)
      },
      {
        id: 'prd-maltina-can',
        sku: 'FMCG-DRK-009',
        name: 'Maltina Classic Can (33cl x 24)',
        brand: 'Nigerian Breweries',
        category: 'Soft Drinks & Malt',
        packsPerCarton: 4,
        piecesPerPack: 6,
        cartonPrice: 10200,
        packPrice: 2600,
        piecePrice: 450,
        costPriceCarton: 8900,
        lowStockThresholdCartons: 30,
        totalPiecesInStock: 528, // 22 Cartons -> LOW STOCK ALERT!
        updatedAt: dayOffsetIso(1)
      },
      {
        id: 'prd-sunlight-det',
        sku: 'FMCG-HPC-010',
        name: 'Sunlight 2-in-1 Detergent (800g x 12)',
        brand: 'Unilever NG',
        category: 'Home & Personal Care',
        packsPerCarton: 3,
        piecesPerPack: 4,
        cartonPrice: 18600,
        packPrice: 6300,
        piecePrice: 1600,
        costPriceCarton: 16400,
        lowStockThresholdCartons: 20,
        totalPiecesInStock: 768, // 64 Cartons
        updatedAt: dayOffsetIso(5)
      }
    ],
    batches: [
      {
        id: 'bat-001',
        productId: 'prd-indomie-super',
        productName: 'Indomie Super Pack (120g x 40)',
        batchNumber: 'DUF-2026-08A',
        expiryDate: '2027-04-15',
        costPriceCarton: 9200,
        initialPieces: 8000,
        remainingPieces: 7420,
        supplierName: 'Dufil Prima Ota Plant',
        receivedByUserId: 'usr-mgr-02',
        receivedByName: 'Chinedu Okafor',
        receivedAt: dayOffsetIso(14)
      },
      {
        id: 'bat-002',
        productId: 'prd-peak-sachet',
        productName: 'Peak Milk Powder Sachet (14g x 210)',
        batchNumber: 'FCW-2026-06B',
        expiryDate: '2026-10-29', // Expiring in 20 days! FEFO priority
        costPriceCarton: 26200,
        initialPieces: 6300,
        remainingPieces: 3150, // 15 Cartons left in this near-expiry batch
        supplierName: 'FrieslandCampina Ogba Depot',
        receivedByUserId: 'usr-mgr-02',
        receivedByName: 'Chinedu Okafor',
        receivedAt: dayOffsetIso(45)
      },
      {
        id: 'bat-003',
        productId: 'prd-peak-sachet',
        productName: 'Peak Milk Powder Sachet (14g x 210)',
        batchNumber: 'FCW-2026-09C',
        expiryDate: '2027-07-20',
        costPriceCarton: 26500,
        initialPieces: 16800,
        remainingPieces: 16170,
        supplierName: 'FrieslandCampina Ogba Depot',
        receivedByUserId: 'usr-mgr-02',
        receivedByName: 'Chinedu Okafor',
        receivedAt: dayOffsetIso(10)
      },
      {
        id: 'bat-004',
        productId: 'prd-gpenny-semo',
        productName: 'Golden Penny Semovita (1kg x 10 Bale)',
        batchNumber: 'FMN-2026-07S',
        expiryDate: '2027-02-28',
        costPriceCarton: 13800,
        initialPieces: 1500,
        remainingPieces: 1185,
        supplierName: 'Flour Mills Apapa',
        receivedByUserId: 'usr-mgr-02',
        receivedByName: 'Chinedu Okafor',
        receivedAt: dayOffsetIso(18)
      },
      {
        id: 'bat-005',
        productId: 'prd-milo-sachet',
        productName: 'Nestlé Milo Activ-Go (20g x 200)',
        batchNumber: 'NST-2026-08M',
        expiryDate: '2027-06-10',
        costPriceCarton: 24800,
        initialPieces: 16000,
        remainingPieces: 12800,
        supplierName: 'Nestlé Agbara Distribution',
        receivedByUserId: 'usr-mgr-02',
        receivedByName: 'Chinedu Okafor',
        receivedAt: dayOffsetIso(12)
      },
      {
        id: 'bat-006',
        productId: 'prd-dangote-sugar',
        productName: 'Dangote Granulated Sugar (500g x 20)',
        batchNumber: 'DSR-2026-09D',
        expiryDate: '2027-09-01',
        costPriceCarton: 17200,
        initialPieces: 1200,
        remainingPieces: 360,
        supplierName: 'Dangote Refinery Apapa',
        receivedByUserId: 'usr-mgr-02',
        receivedByName: 'Chinedu Okafor',
        receivedAt: dayOffsetIso(9)
      },
      {
        id: 'bat-007',
        productId: 'prd-maltina-can',
        productName: 'Maltina Classic Can (33cl x 24)',
        batchNumber: 'NBL-2026-05X',
        expiryDate: '2026-11-04', // Expiring in 26 days!
        costPriceCarton: 8900,
        initialPieces: 1200,
        remainingPieces: 528,
        supplierName: 'Nigerian Breweries Iganmu',
        receivedByUserId: 'usr-mgr-02',
        receivedByName: 'Chinedu Okafor',
        receivedAt: dayOffsetIso(30)
      }
    ],
    priceAuditLogs: [
      {
        id: 'aud-001',
        productId: 'prd-indomie-super',
        productName: 'Indomie Super Pack (120g x 40)',
        sku: 'FMCG-NDL-001',
        changedByUserId: 'usr-mgr-02',
        changedByName: 'Chinedu Okafor',
        changedByRole: 'MANAGER',
        unitTier: 'CARTON',
        oldPrice: 10100,
        newPrice: 10400,
        priceDiff: 300,
        percentChange: 2.97,
        reason: 'Dufil factory ex-depot price adjustment on new trailer batch DUF-2026-08A',
        deviceFingerprint: 'WH-Supervisor-PC01 • Chrome 129 / Linux x86_64',
        ipAddress: '102.89.43.112',
        createdAt: dayOffsetIso(3, 9, 45),
        syncedAt: dayOffsetIso(3, 9, 45),
        flaggedHighRisk: false
      },
      {
        id: 'aud-002',
        productId: 'prd-peak-sachet',
        productName: 'Peak Milk Powder Sachet (14g x 210)',
        sku: 'FMCG-DRY-002',
        changedByUserId: 'usr-stf-03',
        changedByName: 'Amina Bello',
        changedByRole: 'STAFF',
        unitTier: 'CARTON',
        oldPrice: 29400,
        newPrice: 27800,
        priceDiff: -1600,
        percentChange: -5.44,
        reason: 'Unapproved bulk discount given to walk-in buyer (Reverted by CEO)',
        deviceFingerprint: 'POS-Counter-Terminal-A • Chrome 129 / Windows 11',
        ipAddress: '102.89.43.118',
        createdAt: dayOffsetIso(1, 14, 20),
        syncedAt: dayOffsetIso(1, 14, 21),
        flaggedHighRisk: true
      },
      {
        id: 'aud-003',
        productId: 'prd-peak-sachet',
        productName: 'Peak Milk Powder Sachet (14g x 210)',
        sku: 'FMCG-DRY-002',
        changedByUserId: 'usr-ceo-01',
        changedByName: 'Chief Adewale Ogunleye',
        changedByRole: 'CEO',
        unitTier: 'CARTON',
        oldPrice: 27800,
        newPrice: 29400,
        priceDiff: 1600,
        percentChange: 5.76,
        reason: 'Restored official wholesale carton price after reviewing staff fingerprint log',
        deviceFingerprint: 'CEO-MacBook-Pro (Remote) • Safari 18 / macOS',
        ipAddress: '197.210.76.44',
        createdAt: dayOffsetIso(1, 15, 5),
        syncedAt: dayOffsetIso(1, 15, 5),
        flaggedHighRisk: false
      }
    ],
    sales: [
      // Today (Day 0 - Friday)
      {
        id: 'sal-1009',
        invoiceNumber: 'INV-2026-1009',
        customerName: 'Alhaja Kudirat Stores (Oke-Arin)',
        customerPhone: '08033129044',
        items: [
          {
            id: 'sli-1',
            productId: 'prd-indomie-super',
            productName: 'Indomie Super Pack (120g x 40)',
            sku: 'FMCG-NDL-001',
            unitTier: 'CARTON',
            quantity: 35,
            piecesDeducted: 1400,
            unitPrice: 10400,
            unitCost: 9200,
            subtotal: 364000,
            cogs: 322000,
            profit: 42000,
            batchNumberUsed: 'DUF-2026-08A'
          },
          {
            id: 'sli-2',
            productId: 'prd-peak-sachet',
            productName: 'Peak Milk Powder Sachet (14g x 210)',
            sku: 'FMCG-DRY-002',
            unitTier: 'CARTON',
            quantity: 12,
            piecesDeducted: 2520,
            unitPrice: 29400,
            unitCost: 26500,
            subtotal: 352800,
            cogs: 318000,
            profit: 34800,
            batchNumberUsed: 'FCW-2026-06B'
          }
        ],
        totalAmount: 716800,
        totalCogs: 640000,
        grossProfit: 76800,
        paymentMethod: 'TRANSFER',
        transferBank: 'Zenith Bank',
        transferSender: 'Kudirat Ventures Ltd',
        transferReference: 'NIP/ZEN/2610090811',
        transferStatus: 'PENDING',
        amountPaid: 716800,
        balanceDue: 0,
        soldByUserId: 'usr-stf-03',
        soldByName: 'Amina Bello',
        deviceFingerprint: 'POS-Counter-Terminal-A',
        createdAt: dayOffsetIso(0, 7, 15)
      },
      {
        id: 'sal-1008',
        invoiceNumber: 'INV-2026-1008',
        customerName: 'Mama Nkechi Mini-Mart',
        customerPhone: '08065541209',
        items: [
          {
            id: 'sli-3',
            productId: 'prd-dangote-sugar',
            productName: 'Dangote Granulated Sugar (500g x 20)',
            sku: 'FMCG-GRN-005',
            unitTier: 'CARTON',
            quantity: 15,
            piecesDeducted: 300,
            unitPrice: 19000,
            unitCost: 17200,
            subtotal: 285000,
            cogs: 258000,
            profit: 27000,
            batchNumberUsed: 'DSR-2026-09D'
          },
          {
            id: 'sli-4',
            productId: 'prd-gpenny-semo',
            productName: 'Golden Penny Semovita (1kg x 10 Bale)',
            sku: 'FMCG-GRN-003',
            unitTier: 'CARTON',
            quantity: 10,
            piecesDeducted: 100,
            unitPrice: 15500,
            unitCost: 13800,
            subtotal: 155000,
            cogs: 138000,
            profit: 17000,
            batchNumberUsed: 'FMN-2026-07S'
          }
        ],
        totalAmount: 440000,
        totalCogs: 396000,
        grossProfit: 44000,
        paymentMethod: 'POS',
        posTerminalRef: 'MONIEPOINT-POS-8821',
        transferStatus: 'NOT_APPLICABLE',
        amountPaid: 440000,
        balanceDue: 0,
        soldByUserId: 'usr-stf-03',
        soldByName: 'Amina Bello',
        deviceFingerprint: 'POS-Counter-Terminal-A',
        createdAt: dayOffsetIso(0, 6, 40)
      },
      // Day 1 Ago (Thursday - Major Market Day)
      {
        id: 'sal-1007',
        invoiceNumber: 'INV-2026-1007',
        customerName: 'Iya Ibeji Wholesale Depot (Agege)',
        customerPhone: '08023098711',
        items: [
          {
            id: 'sli-5',
            productId: 'prd-indomie-super',
            productName: 'Indomie Super Pack (120g x 40)',
            sku: 'FMCG-NDL-001',
            unitTier: 'CARTON',
            quantity: 60,
            piecesDeducted: 2400,
            unitPrice: 10400,
            unitCost: 9200,
            subtotal: 624000,
            cogs: 552000,
            profit: 72000
          },
          {
            id: 'sli-6',
            productId: 'prd-kings-oil',
            productName: "Devon King's Veg Oil (1L x 12)",
            sku: 'FMCG-OIL-006',
            unitTier: 'CARTON',
            quantity: 20,
            piecesDeducted: 240,
            unitPrice: 34200,
            unitCost: 31000,
            subtotal: 684000,
            cogs: 620000,
            profit: 64000
          }
        ],
        totalAmount: 1308000,
        totalCogs: 1172000,
        grossProfit: 136000,
        paymentMethod: 'TRANSFER',
        transferBank: 'GTBank',
        transferSender: 'Iya Ibeji Global Ent',
        transferReference: 'GTB/NIP/88392011',
        transferStatus: 'CONFIRMED',
        amountPaid: 1308000,
        balanceDue: 0,
        soldByUserId: 'usr-stf-03',
        soldByName: 'Amina Bello',
        deviceFingerprint: 'POS-Counter-Terminal-A',
        createdAt: dayOffsetIso(1, 13, 10)
      },
      {
        id: 'sal-1006',
        invoiceNumber: 'INV-2026-1006',
        customerName: 'Blessed Brothers Provision Store',
        customerPhone: '08140092218',
        items: [
          {
            id: 'sli-7',
            productId: 'prd-milo-sachet',
            productName: 'Nestlé Milo Activ-Go (20g x 200)',
            sku: 'FMCG-DRY-004',
            unitTier: 'CARTON',
            quantity: 18,
            piecesDeducted: 3600,
            unitPrice: 27500,
            unitCost: 24800,
            subtotal: 495000,
            cogs: 446400,
            profit: 48600
          }
        ],
        totalAmount: 495000,
        totalCogs: 446400,
        grossProfit: 48600,
        paymentMethod: 'CREDIT',
        transferStatus: 'NOT_APPLICABLE',
        amountPaid: 300000,
        balanceDue: 195000,
        soldByUserId: 'usr-mgr-02',
        soldByName: 'Chinedu Okafor',
        deviceFingerprint: 'WH-Supervisor-PC01',
        createdAt: dayOffsetIso(1, 15, 45)
      },
      // Day 2 Ago (Wednesday)
      {
        id: 'sal-1005',
        invoiceNumber: 'INV-2026-1005',
        customerName: 'Kano Road Superstores',
        customerPhone: '08091127764',
        items: [
          {
            id: 'sli-8',
            productId: 'prd-gpenny-semo',
            productName: 'Golden Penny Semovita (1kg x 10 Bale)',
            sku: 'FMCG-GRN-003',
            unitTier: 'CARTON',
            quantity: 42,
            piecesDeducted: 420,
            unitPrice: 15500,
            unitCost: 13800,
            subtotal: 651000,
            cogs: 579600,
            profit: 71400
          },
          {
            id: 'sli-9',
            productId: 'prd-maggi-star',
            productName: 'Maggi Star Seasoning (100 Cubes x 20)',
            sku: 'FMCG-OIL-007',
            unitTier: 'CARTON',
            quantity: 15,
            piecesDeducted: 300,
            unitPrice: 23800,
            unitCost: 21400,
            subtotal: 357000,
            cogs: 321000,
            profit: 36000
          }
        ],
        totalAmount: 1008000,
        totalCogs: 900600,
        grossProfit: 107400,
        paymentMethod: 'CASH',
        transferStatus: 'NOT_APPLICABLE',
        amountPaid: 1008000,
        balanceDue: 0,
        soldByUserId: 'usr-stf-03',
        soldByName: 'Amina Bello',
        deviceFingerprint: 'POS-Counter-Terminal-A',
        createdAt: dayOffsetIso(2, 11, 20)
      },
      // Day 3 Ago (Tuesday)
      {
        id: 'sal-1004',
        invoiceNumber: 'INV-2026-1004',
        customerName: 'Eko Hotel & Catering Supply',
        customerPhone: '08057761123',
        items: [
          {
            id: 'sli-10',
            productId: 'prd-coke-pet',
            productName: 'Coca-Cola PET 50cl (Case x 12)',
            sku: 'FMCG-DRK-008',
            unitTier: 'CARTON',
            quantity: 85,
            piecesDeducted: 1020,
            unitPrice: 3800,
            unitCost: 3200,
            subtotal: 323000,
            cogs: 272000,
            profit: 51000
          },
          {
            id: 'sli-11',
            productId: 'prd-maltina-can',
            productName: 'Maltina Classic Can (33cl x 24)',
            sku: 'FMCG-DRK-009',
            unitTier: 'CARTON',
            quantity: 40,
            piecesDeducted: 960,
            unitPrice: 10200,
            unitCost: 8900,
            subtotal: 408000,
            cogs: 356000,
            profit: 52000
          }
        ],
        totalAmount: 731000,
        totalCogs: 628000,
        grossProfit: 103000,
        paymentMethod: 'TRANSFER',
        transferBank: 'Access Bank',
        transferSender: 'Eko Catering Procurement',
        transferReference: 'ACC/20261006/9912',
        transferStatus: 'CONFIRMED',
        amountPaid: 731000,
        balanceDue: 0,
        soldByUserId: 'usr-stf-04',
        soldByName: 'Tunde Bakare',
        deviceFingerprint: 'Loading-Bay-Tablet-02',
        createdAt: dayOffsetIso(3, 14, 0)
      },
      // Day 4 Ago (Monday - Peak Market Restock Day)
      {
        id: 'sal-1003',
        invoiceNumber: 'INV-2026-1003',
        customerName: 'Mushin Central Distributors',
        customerPhone: '08039981122',
        items: [
          {
            id: 'sli-12',
            productId: 'prd-indomie-super',
            productName: 'Indomie Super Pack (120g x 40)',
            sku: 'FMCG-NDL-001',
            unitTier: 'CARTON',
            quantity: 90,
            piecesDeducted: 3600,
            unitPrice: 10400,
            unitCost: 9200,
            subtotal: 936000,
            cogs: 828000,
            profit: 108000
          },
          {
            id: 'sli-13',
            productId: 'prd-peak-sachet',
            productName: 'Peak Milk Powder Sachet (14g x 210)',
            sku: 'FMCG-DRY-002',
            unitTier: 'CARTON',
            quantity: 35,
            piecesDeducted: 7350,
            unitPrice: 29400,
            unitCost: 26500,
            subtotal: 1029000,
            cogs: 927500,
            profit: 101500
          },
          {
            id: 'sli-14',
            productId: 'prd-sunlight-det',
            productName: 'Sunlight 2-in-1 Detergent (800g x 12)',
            sku: 'FMCG-HPC-010',
            unitTier: 'CARTON',
            quantity: 25,
            piecesDeducted: 300,
            unitPrice: 18600,
            unitCost: 16400,
            subtotal: 465000,
            cogs: 410000,
            profit: 55000
          }
        ],
        totalAmount: 2430000,
        totalCogs: 2165500,
        grossProfit: 264500,
        paymentMethod: 'TRANSFER',
        transferBank: 'First Bank',
        transferSender: 'Mushin Central Dist Ltd',
        transferReference: 'FBN/NIP/77120934',
        transferStatus: 'CONFIRMED',
        amountPaid: 2430000,
        balanceDue: 0,
        soldByUserId: 'usr-stf-03',
        soldByName: 'Amina Bello',
        deviceFingerprint: 'POS-Counter-Terminal-A',
        createdAt: dayOffsetIso(4, 10, 15)
      },
      // Day 5 Ago (Sunday)
      {
        id: 'sal-1002',
        invoiceNumber: 'INV-2026-1002',
        customerName: 'Festac Neighbourhood Mart',
        customerPhone: '07061198832',
        items: [
          {
            id: 'sli-15',
            productId: 'prd-dangote-sugar',
            productName: 'Dangote Granulated Sugar (500g x 20)',
            sku: 'FMCG-GRN-005',
            unitTier: 'CARTON',
            quantity: 22,
            piecesDeducted: 440,
            unitPrice: 19000,
            unitCost: 17200,
            subtotal: 418000,
            cogs: 378400,
            profit: 39600
          }
        ],
        totalAmount: 418000,
        totalCogs: 378400,
        grossProfit: 39600,
        paymentMethod: 'POS',
        posTerminalRef: 'OPAY-POS-3310',
        transferStatus: 'NOT_APPLICABLE',
        amountPaid: 418000,
        balanceDue: 0,
        soldByUserId: 'usr-stf-04',
        soldByName: 'Tunde Bakare',
        deviceFingerprint: 'Loading-Bay-Tablet-02',
        createdAt: dayOffsetIso(5, 16, 10)
      },
      // Day 6 Ago (Saturday)
      {
        id: 'sal-1001',
        invoiceNumber: 'INV-2026-1001',
        customerName: 'Iyana-Ipaja Wholesale Hub',
        customerPhone: '08028837100',
        items: [
          {
            id: 'sli-16',
            productId: 'prd-milo-sachet',
            productName: 'Nestlé Milo Activ-Go (20g x 200)',
            sku: 'FMCG-DRY-004',
            unitTier: 'CARTON',
            quantity: 28,
            piecesDeducted: 5600,
            unitPrice: 27500,
            unitCost: 24800,
            subtotal: 770000,
            cogs: 694400,
            profit: 75600
          },
          {
            id: 'sli-17',
            productId: 'prd-kings-oil',
            productName: "Devon King's Veg Oil (1L x 12)",
            sku: 'FMCG-OIL-006',
            unitTier: 'CARTON',
            quantity: 16,
            piecesDeducted: 192,
            unitPrice: 34200,
            unitCost: 31000,
            subtotal: 547200,
            cogs: 496000,
            profit: 51200
          }
        ],
        totalAmount: 1317200,
        totalCogs: 1190400,
        grossProfit: 126800,
        paymentMethod: 'CASH',
        transferStatus: 'NOT_APPLICABLE',
        amountPaid: 1317200,
        balanceDue: 0,
        soldByUserId: 'usr-stf-03',
        soldByName: 'Amina Bello',
        deviceFingerprint: 'POS-Counter-Terminal-A',
        createdAt: dayOffsetIso(6, 12, 30)
      }
    ],
    expenses: [
      {
        id: 'exp-001',
        category: 'Diesel & Generator Fuel',
        description: '200 Litres AGO Diesel for 60kVA Perkins Warehouse Generator',
        amount: 245000,
        recordedByUserId: 'usr-mgr-02',
        recordedByName: 'Chinedu Okafor',
        createdAt: dayOffsetIso(4, 9, 0)
      },
      {
        id: 'exp-002',
        category: 'Loading & Offloading Labor',
        description: 'Offloading 2x 40ft trailers (Indomie & Golden Penny Semovita)',
        amount: 65000,
        recordedByUserId: 'usr-stf-04',
        recordedByName: 'Tunde Bakare',
        createdAt: dayOffsetIso(3, 16, 30)
      },
      {
        id: 'exp-003',
        category: 'Waybill & Haulage Transport',
        description: 'Van delivery fuel & LASMA/Agbero road clearance to Oke-Arin',
        amount: 38000,
        recordedByUserId: 'usr-mgr-02',
        recordedByName: 'Chinedu Okafor',
        createdAt: dayOffsetIso(1, 17, 15)
      },
      {
        id: 'exp-004',
        category: 'Loading & Offloading Labor',
        description: 'Morning loading bay gang settlement (Friday dispatch)',
        amount: 18500,
        recordedByUserId: 'usr-stf-04',
        recordedByName: 'Tunde Bakare',
        createdAt: dayOffsetIso(0, 7, 45)
      }
    ],
    reportConfig: {
      ceoName: 'Chief Adewale Ogunleye',
      ceoWhatsAppNumber: '+2348032001100',
      ceoEmail: 'ceo@ogunleyefmcg.ng',
      dailyReportTime: '19:00',
      weeklyReportDay: 'Sunday',
      autoAlertOnPriceChange: true,
      autoAlertOnLowStock: true,
      whatsappWebhookUrl: ''
    },
    reportLogs: [
      {
        id: 'rpt-001',
        reportType: 'DAILY',
        channel: 'WHATSAPP',
        recipient: '+2348032001100',
        subject: '[FMCG Warehouse DAILY Report] Thursday Summary',
        messageBody:
          '📊 DAILY WAREHOUSE REPORT (Thursday): Revenue ₦1,803,000 | Gross Margin ₦184,600 | Expenses ₦38,000 | Net Profit ₦146,600. ⚠️ 1 Flagged Staff Price Change by Amina Bello on Peak Milk Sachet.',
        sentAt: dayOffsetIso(1, 18, 0),
        status: 'DELIVERED'
      },
      {
        id: 'rpt-002',
        reportType: 'DAILY',
        channel: 'EMAIL',
        recipient: 'ceo@ogunleyefmcg.ng',
        subject: '[FMCG Warehouse DAILY Report] Thursday Executive Audit & Profit Summary',
        messageBody:
          'Executive Summary delivered with CSV attachment. Revenue: ₦1,803,000, Net Profit: ₦146,600. Low stock alert on Dangote Sugar (18 Ctns) & Devon Kings Oil (14 Ctns).',
        sentAt: dayOffsetIso(1, 18, 1),
        status: 'DELIVERED'
      }
    ]
  };
}
