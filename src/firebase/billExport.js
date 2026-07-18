import { getBillWithProducts } from './billService';
import { formatDate } from '../utils/formatters';

export const exportBillToCSV = async (billId) => {
  try {
    const billWithProducts = await getBillWithProducts(billId);
    if (!billWithProducts) {
      throw new Error('Bill not found');
    }

    const headers = [
      'Bill Number', 'Date', 'Vendor', 'Product Name', 'Category', 'Expiry Date',
      'MRP', 'Quantity', 'Price Per Piece', 'Total Amount',
      'Profit Per Piece', 'Total Profit'
    ];

    const rows = [];

    rows.push([
      billWithProducts.billNumber,
      billWithProducts.date instanceof Date ?
        billWithProducts.date.toLocaleDateString() :
        new Date(billWithProducts.date).toLocaleDateString(),
      billWithProducts.vendor,
      '--- BILL SUMMARY ---',
      '', '', '',
      billWithProducts.totalQuantity || 0,
      '',
      billWithProducts.totalAmount || 0,
      '',
      billWithProducts.totalProfit || 0
    ]);

    rows.push(Array(headers.length).fill(''));

    billWithProducts.products.forEach(product => {
      rows.push([
        billWithProducts.billNumber,
        billWithProducts.date instanceof Date ?
          billWithProducts.date.toLocaleDateString() :
          new Date(billWithProducts.date).toLocaleDateString(),
        billWithProducts.vendor,
        product.productName || '',
        product.category || '',
        product.expiryDate ? formatDate(product.expiryDate) : '',
        product.mrp || 0,
        product.totalQuantity || 0,
        product.pricePerPiece || 0,
        product.totalAmount || 0,
        product.profitPerPiece || 0,
        (product.profitPerPiece || 0) * (product.totalQuantity || 0)
      ]);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell =>
          typeof cell === 'string' && cell.includes(',') ?
            `"${cell.replace(/"/g, '""')}"` :
            cell
        ).join(',')
      )
    ].join('\n');

    return {
      filename: `bill_${billWithProducts.billNumber}_${new Date().toISOString().split('T')[0]}.csv`,
      content: csvContent,
      mimeType: 'text/csv'
    };
  } catch (error) {
    console.error('Error exporting bill to CSV: ', error);
    throw error;
  }
};

export const exportMultipleBillsToCSV = async (billIds) => {
  try {
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new Error('Bill IDs array is required and cannot be empty');
    }

    const headers = [
      'Bill Number', 'Date', 'Vendor', 'Product Name', 'Category', 'Expiry Date',
      'MRP', 'Quantity', 'Price Per Piece', 'Total Amount',
      'Profit Per Piece', 'Total Profit', 'Bill Total Amount', 'Bill Total Profit'
    ];

    const rows = [];

    for (const billId of billIds) {
      try {
        const billWithProducts = await getBillWithProducts(billId);
        if (!billWithProducts) {
          console.warn(`Bill ${billId} not found, skipping`);
          continue;
        }

        rows.push([
          billWithProducts.billNumber,
          billWithProducts.date instanceof Date ?
            billWithProducts.date.toLocaleDateString() :
            new Date(billWithProducts.date).toLocaleDateString(),
          billWithProducts.vendor,
          '--- BILL SUMMARY ---',
          '', '', '', billWithProducts.totalQuantity || 0,
          '', '', '', '',
          billWithProducts.totalAmount || 0,
          billWithProducts.totalProfit || 0
        ]);

        billWithProducts.products.forEach(product => {
          rows.push([
            billWithProducts.billNumber,
            billWithProducts.date instanceof Date ?
              billWithProducts.date.toLocaleDateString() :
              new Date(billWithProducts.date).toLocaleDateString(),
            billWithProducts.vendor,
            product.productName || '',
            product.category || '',
            product.expiryDate ? formatDate(product.expiryDate) : '',
            product.mrp || 0,
            product.totalQuantity || 0,
            product.pricePerPiece || 0,
            product.totalAmount || 0,
            product.profitPerPiece || 0,
            (product.profitPerPiece || 0) * (product.totalQuantity || 0),
            billWithProducts.totalAmount || 0,
            billWithProducts.totalProfit || 0
          ]);
        });

        rows.push(Array(headers.length).fill(''));
      } catch (error) {
        console.error(`Error processing bill ${billId}:`, error);
      }
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell =>
          typeof cell === 'string' && cell.includes(',') ?
            `"${cell.replace(/"/g, '""')}"` :
            cell
        ).join(',')
      )
    ].join('\n');

    return {
      filename: `bills_export_${new Date().toISOString().split('T')[0]}.csv`,
      content: csvContent,
      mimeType: 'text/csv'
    };
  } catch (error) {
    console.error('Error exporting multiple bills to CSV: ', error);
    throw error;
  }
};
