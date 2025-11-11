import { 
  collection, 
  getDocs, 
  writeBatch,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { addBill, BillModel } from './billService';
import { getShopProducts, updateShopProduct } from './shopProductService';

// Migration utilities for bill-wise product separation
export const MigrationService = {
  
  // Group existing products by their billNumber field
  groupProductsByBillNumber: async () => {
    try {
      console.log('Starting product grouping by bill number...');
      
      const products = await getShopProducts();
      console.log(`Found ${products.length} products to process`);
      
      // Group products by billNumber
      const groupedProducts = new Map();
      const orphanedProducts = [];
      
      products.forEach(product => {
        const billNumber = product.billNumber;
        
        if (!billNumber || billNumber.trim() === '') {
          // Products without bill numbers become orphaned
          orphanedProducts.push(product);
        } else {
          if (!groupedProducts.has(billNumber)) {
            groupedProducts.set(billNumber, []);
          }
          groupedProducts.get(billNumber).push(product);
        }
      });
      
      console.log(`Grouped into ${groupedProducts.size} bill groups`);
      console.log(`Found ${orphanedProducts.length} orphaned products`);
      
      return {
        groupedProducts: Object.fromEntries(groupedProducts),
        orphanedProducts,
        totalProducts: products.length,
        groupCount: groupedProducts.size
      };
    } catch (error) {
      console.error('Error grouping products by bill number:', error);
      throw error;
    }
  },

  // Create bills from grouped products
  createBillsFromGroups: async (groupedProducts) => {
    try {
      console.log('Creating bills from product groups...');
      
      const createdBills = [];
      const errors = [];
      
      for (const [billNumber, products] of Object.entries(groupedProducts)) {
        try {
          // Calculate bill metadata from products
          const billData = MigrationService.calculateBillDataFromProducts(billNumber, products);
          
          // Create the bill
          const newBill = await addBill(billData);
          createdBills.push({
            bill: newBill,
            productCount: products.length,
            originalBillNumber: billNumber
          });
          
          console.log(`Created bill ${billNumber} with ${products.length} products`);
        } catch (error) {
          console.error(`Failed to create bill for ${billNumber}:`, error);
          errors.push({
            billNumber,
            error: error.message,
            productCount: products.length
          });
        }
      }
      
      console.log(`Successfully created ${createdBills.length} bills`);
      if (errors.length > 0) {
        console.warn(`Failed to create ${errors.length} bills`);
      }
      
      return {
        createdBills,
        errors,
        successCount: createdBills.length,
        errorCount: errors.length
      };
    } catch (error) {
      console.error('Error creating bills from groups:', error);
      throw error;
    }
  },

  // Calculate bill data from associated products
  calculateBillDataFromProducts: (billNumber, products) => {
    if (!products || products.length === 0) {
      throw new Error('Cannot create bill from empty product list');
    }
    
    // Use the earliest product date as bill date
    const dates = products
      .map(p => p.date)
      .filter(date => date)
      .map(date => date instanceof Date ? date : new Date(date))
      .filter(date => !isNaN(date.getTime()));
    
    const billDate = dates.length > 0 ? 
      new Date(Math.min(...dates.map(d => d.getTime()))) : 
      new Date();
    
    // Use the most common vendor, or first vendor if tie
    const vendorCounts = {};
    products.forEach(product => {
      const vendor = product.vendor || 'Unknown';
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    });
    
    const mostCommonVendor = Object.entries(vendorCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
    
    // Calculate totals
    const totals = BillModel.calculateTotals(products);
    
    return {
      billNumber: billNumber.trim(),
      date: billDate,
      vendor: mostCommonVendor,
      notes: `Migrated from ${products.length} existing products`,
      status: 'active',
      ...totals
    };
  },

  // Update products with billId references
  updateProductsWithBillReferences: async (createdBills, groupedProducts) => {
    try {
      console.log('Updating products with bill references...');
      
      const updateResults = [];
      const errors = [];
      
      for (const { bill, originalBillNumber } of createdBills) {
        const products = groupedProducts[originalBillNumber] || [];
        
        for (const product of products) {
          try {
            await updateShopProduct(product.id, {
              billId: bill.id,
              billNumber: bill.billNumber
            });
            
            updateResults.push({
              productId: product.id,
              billId: bill.id,
              billNumber: bill.billNumber
            });
          } catch (error) {
            console.error(`Failed to update product ${product.id}:`, error);
            errors.push({
              productId: product.id,
              billNumber: originalBillNumber,
              error: error.message
            });
          }
        }
      }
      
      console.log(`Successfully updated ${updateResults.length} products`);
      if (errors.length > 0) {
        console.warn(`Failed to update ${errors.length} products`);
      }
      
      return {
        updateResults,
        errors,
        successCount: updateResults.length,
        errorCount: errors.length
      };
    } catch (error) {
      console.error('Error updating products with bill references:', error);
      throw error;
    }
  },

  // Handle orphaned products (create individual bills)
  handleOrphanedProducts: async (orphanedProducts) => {
    try {
      console.log(`Handling ${orphanedProducts.length} orphaned products...`);
      
      if (orphanedProducts.length === 0) {
        return {
          createdBills: [],
          updateResults: [],
          errors: []
        };
      }
      
      // Get existing bills to generate unique bill numbers
      const { getBills } = await import('./billService');
      const existingBills = await getBills();
      
      const createdBills = [];
      const updateResults = [];
      const errors = [];
      
      for (const product of orphanedProducts) {
        try {
          // Generate unique bill number for this product
          const allBills = [...existingBills, ...createdBills.map(cb => cb.bill)];
          const billNumber = BillModel.generateBillNumber(allBills);
          
          // Create bill data from single product
          const billData = MigrationService.calculateBillDataFromProducts(
            billNumber, 
            [product]
          );
          billData.notes = `Auto-generated for orphaned product: ${product.productName}`;
          
          // Create the bill
          const newBill = await addBill(billData);
          createdBills.push({
            bill: newBill,
            productCount: 1,
            originalProductId: product.id
          });
          
          // Update the product with bill reference
          await updateShopProduct(product.id, {
            billId: newBill.id,
            billNumber: newBill.billNumber
          });
          
          updateResults.push({
            productId: product.id,
            billId: newBill.id,
            billNumber: newBill.billNumber
          });
          
          console.log(`Created individual bill ${billNumber} for product ${product.productName}`);
        } catch (error) {
          console.error(`Failed to handle orphaned product ${product.id}:`, error);
          errors.push({
            productId: product.id,
            productName: product.productName,
            error: error.message
          });
        }
      }
      
      console.log(`Successfully handled ${createdBills.length} orphaned products`);
      if (errors.length > 0) {
        console.warn(`Failed to handle ${errors.length} orphaned products`);
      }
      
      return {
        createdBills,
        updateResults,
        errors,
        successCount: createdBills.length,
        errorCount: errors.length
      };
    } catch (error) {
      console.error('Error handling orphaned products:', error);
      throw error;
    }
  },

  // Complete migration process
  migrateProductsToBills: async () => {
    try {
      console.log('Starting complete migration process...');
      const migrationStart = Date.now();
      
      // Step 1: Group products by bill number
      const groupingResult = await MigrationService.groupProductsByBillNumber();
      
      // Step 2: Create bills from groups
      const billCreationResult = await MigrationService.createBillsFromGroups(
        groupingResult.groupedProducts
      );
      
      // Step 3: Update products with bill references
      const productUpdateResult = await MigrationService.updateProductsWithBillReferences(
        billCreationResult.createdBills,
        groupingResult.groupedProducts
      );
      
      // Step 4: Handle orphaned products
      const orphanHandlingResult = await MigrationService.handleOrphanedProducts(
        groupingResult.orphanedProducts
      );
      
      // Step 5: Validate data integrity
      const validationResult = await MigrationService.validateDataIntegrity();
      
      const migrationEnd = Date.now();
      const duration = migrationEnd - migrationStart;
      
      const migrationSummary = {
        success: true,
        duration: `${(duration / 1000).toFixed(2)}s`,
        timestamp: new Date().toISOString(),
        
        // Input data
        totalProductsProcessed: groupingResult.totalProducts,
        billGroupsFound: groupingResult.groupCount,
        orphanedProductsFound: groupingResult.orphanedProducts.length,
        
        // Bills created
        billsCreatedFromGroups: billCreationResult.successCount,
        billsCreatedForOrphans: orphanHandlingResult.successCount,
        totalBillsCreated: billCreationResult.successCount + orphanHandlingResult.successCount,
        
        // Products updated
        productsUpdatedFromGroups: productUpdateResult.successCount,
        productsUpdatedFromOrphans: orphanHandlingResult.updateResults.length,
        totalProductsUpdated: productUpdateResult.successCount + orphanHandlingResult.updateResults.length,
        
        // Errors
        billCreationErrors: billCreationResult.errorCount,
        productUpdateErrors: productUpdateResult.errorCount,
        orphanHandlingErrors: orphanHandlingResult.errorCount,
        totalErrors: billCreationResult.errorCount + productUpdateResult.errorCount + orphanHandlingResult.errorCount,
        
        // Validation
        dataIntegrityValid: validationResult.isValid,
        validationIssues: validationResult.issues,
        
        // Detailed results
        details: {
          groupingResult,
          billCreationResult,
          productUpdateResult,
          orphanHandlingResult,
          validationResult
        }
      };
      
      console.log('Migration completed successfully!');
      console.log(`Created ${migrationSummary.totalBillsCreated} bills`);
      console.log(`Updated ${migrationSummary.totalProductsUpdated} products`);
      console.log(`Total errors: ${migrationSummary.totalErrors}`);
      console.log(`Duration: ${migrationSummary.duration}`);
      
      return migrationSummary;
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Validate data integrity after migration
  validateDataIntegrity: async () => {
    try {
      console.log('Validating data integrity...');
      
      const issues = [];
      const warnings = [];
      
      // Get all products and bills
      const products = await getShopProducts();
      const { getBills } = await import('./billService');
      const bills = await getBills();
      
      console.log(`Validating ${products.length} products and ${bills.length} bills`);
      
      // Check 1: All products should have billId
      const productsWithoutBillId = products.filter(p => !p.billId);
      if (productsWithoutBillId.length > 0) {
        issues.push({
          type: 'missing_bill_id',
          count: productsWithoutBillId.length,
          message: `${productsWithoutBillId.length} products missing billId`,
          productIds: productsWithoutBillId.map(p => p.id)
        });
      }
      
      // Check 2: All billId references should be valid
      const billIds = new Set(bills.map(b => b.id));
      const productsWithInvalidBillId = products.filter(p => p.billId && !billIds.has(p.billId));
      if (productsWithInvalidBillId.length > 0) {
        issues.push({
          type: 'invalid_bill_id',
          count: productsWithInvalidBillId.length,
          message: `${productsWithInvalidBillId.length} products have invalid billId references`,
          productIds: productsWithInvalidBillId.map(p => p.id)
        });
      }
      
      // Check 3: Bill totals should match product totals
      const billTotalMismatches = [];
      for (const bill of bills) {
        const billProducts = products.filter(p => p.billId === bill.id);
        const calculatedTotals = BillModel.calculateTotals(billProducts);
        
        const tolerance = 0.01; // Allow small floating point differences
        
        if (Math.abs((bill.totalAmount || 0) - calculatedTotals.totalAmount) > tolerance) {
          billTotalMismatches.push({
            billId: bill.id,
            billNumber: bill.billNumber,
            field: 'totalAmount',
            expected: calculatedTotals.totalAmount,
            actual: bill.totalAmount || 0
          });
        }
        
        if (Math.abs((bill.totalQuantity || 0) - calculatedTotals.totalQuantity) > tolerance) {
          billTotalMismatches.push({
            billId: bill.id,
            billNumber: bill.billNumber,
            field: 'totalQuantity',
            expected: calculatedTotals.totalQuantity,
            actual: bill.totalQuantity || 0
          });
        }
        
        if (Math.abs((bill.totalProfit || 0) - calculatedTotals.totalProfit) > tolerance) {
          billTotalMismatches.push({
            billId: bill.id,
            billNumber: bill.billNumber,
            field: 'totalProfit',
            expected: calculatedTotals.totalProfit,
            actual: bill.totalProfit || 0
          });
        }
        
        if ((bill.productCount || 0) !== calculatedTotals.productCount) {
          billTotalMismatches.push({
            billId: bill.id,
            billNumber: bill.billNumber,
            field: 'productCount',
            expected: calculatedTotals.productCount,
            actual: bill.productCount || 0
          });
        }
      }
      
      if (billTotalMismatches.length > 0) {
        issues.push({
          type: 'bill_total_mismatch',
          count: billTotalMismatches.length,
          message: `${billTotalMismatches.length} bill total mismatches found`,
          mismatches: billTotalMismatches
        });
      }
      
      // Check 4: Duplicate bill numbers
      const billNumbers = bills.map(b => b.billNumber).filter(Boolean);
      const duplicateBillNumbers = billNumbers.filter((num, index) => billNumbers.indexOf(num) !== index);
      if (duplicateBillNumbers.length > 0) {
        issues.push({
          type: 'duplicate_bill_numbers',
          count: duplicateBillNumbers.length,
          message: `Duplicate bill numbers found: ${[...new Set(duplicateBillNumbers)].join(', ')}`,
          duplicates: [...new Set(duplicateBillNumbers)]
        });
      }
      
      // Check 5: Bills without products (warnings only)
      const billsWithoutProducts = bills.filter(bill => {
        const billProducts = products.filter(p => p.billId === bill.id);
        return billProducts.length === 0;
      });
      
      if (billsWithoutProducts.length > 0) {
        warnings.push({
          type: 'bills_without_products',
          count: billsWithoutProducts.length,
          message: `${billsWithoutProducts.length} bills have no associated products`,
          billIds: billsWithoutProducts.map(b => b.id)
        });
      }
      
      const isValid = issues.length === 0;
      
      console.log(`Validation complete. Valid: ${isValid}`);
      console.log(`Issues found: ${issues.length}`);
      console.log(`Warnings: ${warnings.length}`);
      
      return {
        isValid,
        issues,
        warnings,
        summary: {
          totalProducts: products.length,
          totalBills: bills.length,
          productsWithBillId: products.filter(p => p.billId).length,
          productsWithoutBillId: productsWithoutBillId.length,
          issueCount: issues.length,
          warningCount: warnings.length
        }
      };
    } catch (error) {
      console.error('Error validating data integrity:', error);
      return {
        isValid: false,
        error: error.message,
        issues: [{
          type: 'validation_error',
          message: `Validation failed: ${error.message}`
        }],
        warnings: []
      };
    }
  },

  // Fix data integrity issues
  fixDataIntegrityIssues: async (validationResult) => {
    try {
      console.log('Attempting to fix data integrity issues...');
      
      if (!validationResult.issues || validationResult.issues.length === 0) {
        console.log('No issues to fix');
        return { success: true, fixedIssues: [] };
      }
      
      const fixedIssues = [];
      const unfixedIssues = [];
      
      for (const issue of validationResult.issues) {
        try {
          switch (issue.type) {
            case 'bill_total_mismatch':
              // Recalculate and update bill totals
              for (const mismatch of issue.mismatches) {
                const { recalculateBillTotals } = await import('./billService');
                await recalculateBillTotals(mismatch.billId);
              }
              fixedIssues.push({
                type: issue.type,
                message: `Fixed ${issue.mismatches.length} bill total mismatches`
              });
              break;
              
            case 'invalid_bill_id':
              // Remove invalid bill references
              for (const productId of issue.productIds) {
                await updateShopProduct(productId, {
                  billId: null,
                  billNumber: null
                });
              }
              fixedIssues.push({
                type: issue.type,
                message: `Removed invalid bill references from ${issue.productIds.length} products`
              });
              break;
              
            default:
              unfixedIssues.push({
                type: issue.type,
                message: `Cannot automatically fix: ${issue.message}`
              });
          }
        } catch (error) {
          console.error(`Failed to fix issue ${issue.type}:`, error);
          unfixedIssues.push({
            type: issue.type,
            message: `Fix failed: ${error.message}`
          });
        }
      }
      
      console.log(`Fixed ${fixedIssues.length} issues`);
      console.log(`Could not fix ${unfixedIssues.length} issues`);
      
      return {
        success: unfixedIssues.length === 0,
        fixedIssues,
        unfixedIssues
      };
    } catch (error) {
      console.error('Error fixing data integrity issues:', error);
      throw error;
    }
  }
};

// Export individual functions for easier testing
export const {
  groupProductsByBillNumber,
  createBillsFromGroups,
  calculateBillDataFromProducts,
  updateProductsWithBillReferences,
  handleOrphanedProducts,
  migrateProductsToBills,
  validateDataIntegrity,
  fixDataIntegrityIssues
} = MigrationService;

export default MigrationService;