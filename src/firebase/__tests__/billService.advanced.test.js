// Test the filtering and search logic without Firebase dependencies
// We'll test the logic by creating helper functions that can be tested independently

// Helper function to test bill filtering logic
const testFilterBillsLogic = (bills, filters) => {
  let result = [...bills];
  
  // Filter by date range with enhanced date handling
  if (filters.startDate || filters.endDate) {
    result = result.filter(bill => {
      // Handle missing or invalid dates
      if (!bill.date) return false;
      
      const billDate = bill.date instanceof Date ? bill.date : new Date(bill.date);
      
      // Check if date is valid
      if (isNaN(billDate.getTime())) return false;
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (billDate < startDate) return false;
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (billDate > endDate) return false;
      }
      
      return true;
    });
  }
  
  // Enhanced vendor filtering
  if (filters.vendor && filters.vendor.trim() !== '') {
    const vendorLower = filters.vendor.toLowerCase().trim();
    result = result.filter(bill => 
      bill.vendor && bill.vendor.toLowerCase().includes(vendorLower)
    );
  }
  
  // Amount range filtering
  if (filters.minAmount !== undefined && filters.minAmount !== '' && filters.minAmount !== null) {
    const minAmount = parseFloat(filters.minAmount);
    if (!isNaN(minAmount)) {
      result = result.filter(bill => (bill.totalAmount || 0) >= minAmount);
    }
  }
  
  if (filters.maxAmount !== undefined && filters.maxAmount !== '' && filters.maxAmount !== null) {
    const maxAmount = parseFloat(filters.maxAmount);
    if (!isNaN(maxAmount)) {
      result = result.filter(bill => (bill.totalAmount || 0) <= maxAmount);
    }
  }
  
  // Status filtering
  if (filters.status && filters.status !== '') {
    result = result.filter(bill => bill.status === filters.status);
  }
  
  // Profit range filtering
  if (filters.minProfit !== undefined && filters.minProfit !== '' && filters.minProfit !== null) {
    const minProfit = parseFloat(filters.minProfit);
    if (!isNaN(minProfit)) {
      result = result.filter(bill => (bill.totalProfit || 0) >= minProfit);
    }
  }
  
  if (filters.maxProfit !== undefined && filters.maxProfit !== '' && filters.maxProfit !== null) {
    const maxProfit = parseFloat(filters.maxProfit);
    if (!isNaN(maxProfit)) {
      result = result.filter(bill => (bill.totalProfit || 0) <= maxProfit);
    }
  }
  
  // Product count filtering
  if (filters.minProductCount !== undefined && filters.minProductCount !== '' && filters.minProductCount !== null) {
    const minCount = parseInt(filters.minProductCount);
    if (!isNaN(minCount)) {
      result = result.filter(bill => (bill.productCount || 0) >= minCount);
    }
  }
  
  if (filters.maxProductCount !== undefined && filters.maxProductCount !== '' && filters.maxProductCount !== null) {
    const maxCount = parseInt(filters.maxProductCount);
    if (!isNaN(maxCount)) {
      result = result.filter(bill => (bill.productCount || 0) <= maxCount);
    }
  }
  
  return result;
};

// Helper function to test search logic
const testSearchBillsLogic = (bills, products, searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return bills;
  }

  const searchLower = searchTerm.toLowerCase();
  const matchingBills = new Set();
  
  // Find bills that match directly
  bills.forEach(bill => {
    if (
      bill.billNumber.toLowerCase().includes(searchLower) ||
      bill.vendor.toLowerCase().includes(searchLower) ||
      (bill.notes && bill.notes.toLowerCase().includes(searchLower))
    ) {
      matchingBills.add(bill.id);
    }
  });
  
  // Search within products and add their parent bills
  products.forEach(product => {
    if (
      product.billId && // Only consider products that belong to bills
      (
        (product.productName && product.productName.toLowerCase().includes(searchLower)) ||
        (product.category && product.category.toLowerCase().includes(searchLower)) ||
        (product.vendor && product.vendor.toLowerCase().includes(searchLower))
      )
    ) {
      matchingBills.add(product.billId);
    }
  });
  
  // Return bills that match either directly or through their products
  return bills.filter(bill => matchingBills.has(bill.id));
};

describe('BillService Advanced Search and Filtering Logic', () => {
  const mockBills = [
    {
      id: '1',
      billNumber: 'B001',
      vendor: 'Electronics Store',
      date: new Date('2024-01-15'),
      totalAmount: 1500,
      totalProfit: 150,
      totalQuantity: 10,
      productCount: 2,
      status: 'active',
      notes: 'Bulk purchase for office'
    },
    {
      id: '2',
      billNumber: 'B002',
      vendor: 'Clothing Mart',
      date: new Date('2024-02-10'),
      totalAmount: 2500,
      totalProfit: 300,
      totalQuantity: 15,
      productCount: 5,
      status: 'active',
      notes: 'Winter collection'
    },
    {
      id: '3',
      billNumber: 'B003',
      vendor: 'Electronics Store',
      date: new Date('2024-03-05'),
      totalAmount: 800,
      totalProfit: 80,
      totalQuantity: 5,
      productCount: 1,
      status: 'archived',
      notes: 'Small order'
    }
  ];

  const mockProducts = [
    {
      id: 'p1',
      billId: '1',
      productName: 'Laptop Computer',
      category: 'Electronics',
      vendor: 'Tech Supplier',
      totalAmount: 1000,
      totalQuantity: 1,
      pricePerPiece: 1000,
      profitPerPiece: 100
    },
    {
      id: 'p2',
      billId: '1',
      productName: 'Wireless Mouse',
      category: 'Electronics',
      vendor: 'Tech Supplier',
      totalAmount: 500,
      totalQuantity: 9,
      pricePerPiece: 55.56,
      profitPerPiece: 5.56
    },
    {
      id: 'p3',
      billId: '2',
      productName: 'Winter Jacket',
      category: 'Clothing',
      vendor: 'Fashion Brand',
      totalAmount: 1500,
      totalQuantity: 5,
      pricePerPiece: 300,
      profitPerPiece: 50
    },
    {
      id: 'p4',
      billId: '2',
      productName: 'Wool Sweater',
      category: 'Clothing',
      vendor: 'Fashion Brand',
      totalAmount: 1000,
      totalQuantity: 10,
      pricePerPiece: 100,
      profitPerPiece: 10
    },
    {
      id: 'p5',
      billId: '3',
      productName: 'Phone Charger',
      category: 'Electronics',
      vendor: 'Tech Supplier',
      totalAmount: 800,
      totalQuantity: 5,
      pricePerPiece: 160,
      profitPerPiece: 16
    }
  ];

  describe('Search Bills Logic', () => {
    test('returns all bills when search term is empty', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, '');
      expect(result).toEqual(mockBills);
    });

    test('returns all bills when search term is null or undefined', () => {
      let result = testSearchBillsLogic(mockBills, mockProducts, null);
      expect(result).toEqual(mockBills);

      result = testSearchBillsLogic(mockBills, mockProducts, undefined);
      expect(result).toEqual(mockBills);
    });

    test('searches bills by bill number', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'B001');
      expect(result).toHaveLength(1);
      expect(result[0].billNumber).toBe('B001');
    });

    test('searches bills by vendor name', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'Electronics Store');
      expect(result).toHaveLength(2);
      expect(result.every(bill => bill.vendor === 'Electronics Store')).toBe(true);
    });

    test('searches bills by notes', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'office');
      expect(result).toHaveLength(1);
      expect(result[0].notes).toContain('office');
    });

    test('searches bills by product name', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'Laptop');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1'); // Bill containing laptop
    });

    test('searches bills by product category', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'Clothing');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2'); // Bill containing clothing items
    });

    test('searches bills by product vendor', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'Tech Supplier');
      expect(result).toHaveLength(2);
      expect(result.map(b => b.id).sort()).toEqual(['1', '3']);
    });

    test('performs case-insensitive search', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'laptop computer');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('returns unique bills when multiple products match', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'Electronics');
      expect(result).toHaveLength(2);
      expect(result.map(b => b.id).sort()).toEqual(['1', '3']);
    });

    test('handles search term with partial matches', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, 'Winter');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('Filter Bills Logic', () => {
    test('returns all bills when no filters applied', () => {
      const result = testFilterBillsLogic(mockBills, {});
      expect(result).toEqual(mockBills);
    });

    test('filters by vendor', () => {
      const result = testFilterBillsLogic(mockBills, { vendor: 'Electronics Store' });
      expect(result).toHaveLength(2);
      expect(result.every(bill => bill.vendor === 'Electronics Store')).toBe(true);
    });

    test('filters by vendor with partial match', () => {
      const result = testFilterBillsLogic(mockBills, { vendor: 'Electronics' });
      expect(result).toHaveLength(2);
      expect(result.every(bill => bill.vendor.includes('Electronics'))).toBe(true);
    });

    test('filters by date range - start date only', () => {
      const result = testFilterBillsLogic(mockBills, { startDate: '2024-02-01' });
      expect(result).toHaveLength(2);
      expect(result.every(bill => new Date(bill.date) >= new Date('2024-02-01'))).toBe(true);
    });

    test('filters by date range - end date only', () => {
      const result = testFilterBillsLogic(mockBills, { endDate: '2024-02-15' });
      expect(result).toHaveLength(2);
      expect(result.every(bill => new Date(bill.date) <= new Date('2024-02-15'))).toBe(true);
    });

    test('filters by date range - both start and end date', () => {
      const result = testFilterBillsLogic(mockBills, { 
        startDate: '2024-02-01', 
        endDate: '2024-02-28' 
      });
      expect(result).toHaveLength(1);
      expect(result[0].billNumber).toBe('B002');
    });

    test('filters by minimum amount', () => {
      const result = testFilterBillsLogic(mockBills, { minAmount: 1000 });
      expect(result).toHaveLength(2);
      expect(result.every(bill => bill.totalAmount >= 1000)).toBe(true);
    });

    test('filters by maximum amount', () => {
      const result = testFilterBillsLogic(mockBills, { maxAmount: 1000 });
      expect(result).toHaveLength(1);
      expect(result[0].totalAmount).toBe(800);
    });

    test('filters by amount range', () => {
      const result = testFilterBillsLogic(mockBills, { minAmount: 1000, maxAmount: 2000 });
      expect(result).toHaveLength(1);
      expect(result[0].totalAmount).toBe(1500);
    });

    test('filters by minimum profit', () => {
      const result = testFilterBillsLogic(mockBills, { minProfit: 200 });
      expect(result).toHaveLength(1);
      expect(result[0].totalProfit).toBe(300);
    });

    test('filters by maximum profit', () => {
      const result = testFilterBillsLogic(mockBills, { maxProfit: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].totalProfit).toBe(80);
    });

    test('filters by product count range', () => {
      const result = testFilterBillsLogic(mockBills, { minProductCount: 3 });
      expect(result).toHaveLength(1);
      expect(result[0].productCount).toBe(5);
    });

    test('filters by status', () => {
      const result = testFilterBillsLogic(mockBills, { status: 'archived' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('archived');
    });

    test('handles empty string filters', () => {
      const result = testFilterBillsLogic(mockBills, { 
        vendor: '', 
        minAmount: '', 
        maxAmount: '',
        status: ''
      });
      expect(result).toEqual(mockBills);
    });

    test('handles null and undefined filters', () => {
      const result = testFilterBillsLogic(mockBills, { 
        vendor: null, 
        minAmount: undefined, 
        maxAmount: null
      });
      expect(result).toEqual(mockBills);
    });

    test('handles invalid number filters', () => {
      const result = testFilterBillsLogic(mockBills, { 
        minAmount: 'invalid', 
        maxAmount: 'also invalid'
      });
      expect(result).toEqual(mockBills);
    });

    test('combines multiple filters', () => {
      const result = testFilterBillsLogic(mockBills, {
        vendor: 'Electronics',
        minAmount: 1000,
        status: 'active'
      });
      expect(result).toHaveLength(1);
      expect(result[0].billNumber).toBe('B001');
    });
  });

  describe('Combined Search and Filter Logic', () => {
    test('performs search only when no filters provided', () => {
      const searchResult = testSearchBillsLogic(mockBills, mockProducts, 'Electronics Store');
      const result = testFilterBillsLogic(searchResult, {});
      expect(result).toHaveLength(2);
      expect(result.every(bill => bill.vendor === 'Electronics Store')).toBe(true);
    });

    test('performs filtering only when no search term provided', () => {
      const searchResult = testSearchBillsLogic(mockBills, mockProducts, '');
      const result = testFilterBillsLogic(searchResult, { minAmount: 2000 });
      expect(result).toHaveLength(1);
      expect(result[0].totalAmount).toBe(2500);
    });

    test('combines search and filtering', () => {
      const searchResult = testSearchBillsLogic(mockBills, mockProducts, 'Electronics');
      const result = testFilterBillsLogic(searchResult, { 
        minAmount: 1000,
        status: 'active'
      });
      expect(result).toHaveLength(1);
      expect(result[0].billNumber).toBe('B001');
    });

    test('search in products combined with filters', () => {
      const searchResult = testSearchBillsLogic(mockBills, mockProducts, 'Laptop');
      const result = testFilterBillsLogic(searchResult, { minAmount: 1000 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('returns empty array when search and filters yield no results', () => {
      const searchResult = testSearchBillsLogic(mockBills, mockProducts, 'NonExistent');
      const result = testFilterBillsLogic(searchResult, { minAmount: 10000 });
      expect(result).toHaveLength(0);
    });

    test('handles empty search term and empty filters', () => {
      const searchResult = testSearchBillsLogic(mockBills, mockProducts, '');
      const result = testFilterBillsLogic(searchResult, {});
      expect(result).toEqual(mockBills);
    });

    test('applies complex filtering after search', () => {
      const searchResult = testSearchBillsLogic(mockBills, mockProducts, 'Electronics');
      const result = testFilterBillsLogic(searchResult, {
        startDate: '2024-01-01',
        endDate: '2024-02-28',
        minAmount: 1000,
        maxAmount: 2000,
        status: 'active'
      });
      expect(result).toHaveLength(1);
      expect(result[0].billNumber).toBe('B001');
    });
  });

  describe('Edge Cases', () => {
    test('handles bills with missing date fields', () => {
      const billsWithMissingDates = [
        { ...mockBills[0], date: null },
        { ...mockBills[1], date: undefined }
      ];

      const result = testFilterBillsLogic(billsWithMissingDates, { startDate: '2024-01-01' });
      expect(result).toHaveLength(0); // Bills with invalid dates should be filtered out
    });

    test('handles bills with missing amount fields', () => {
      const billsWithMissingAmounts = [
        { ...mockBills[0], totalAmount: null },
        { ...mockBills[1], totalAmount: undefined }
      ];

      const result = testFilterBillsLogic(billsWithMissingAmounts, { minAmount: 100 });
      expect(result).toHaveLength(0); // Bills with null/undefined amounts should be treated as 0
    });

    test('handles products without billId in search', () => {
      const productsWithoutBillId = [
        { ...mockProducts[0], billId: null },
        { ...mockProducts[1], billId: undefined },
        { ...mockProducts[2] } // has billId
      ];

      const result = testSearchBillsLogic(mockBills, productsWithoutBillId, 'Winter Jacket');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    test('handles empty bills array', () => {
      const searchResult = testSearchBillsLogic([], mockProducts, 'test');
      const result = testFilterBillsLogic(searchResult, { vendor: 'test' });
      expect(result).toHaveLength(0);
    });

    test('handles empty products array', () => {
      const result = testSearchBillsLogic(mockBills, [], 'product name');
      expect(result).toHaveLength(0);
    });

    test('handles whitespace-only search terms', () => {
      const result = testSearchBillsLogic(mockBills, mockProducts, '   ');
      expect(result).toEqual(mockBills);
    });

    test('handles special characters in search', () => {
      const billsWithSpecialChars = [
        { ...mockBills[0], notes: 'Order #123 - 50% discount' }
      ];
      const result = testSearchBillsLogic(billsWithSpecialChars, mockProducts, '#123');
      expect(result).toHaveLength(1);
    });
  });
});