import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as userEvent from '@testing-library/user-event';
import MigrationDashboard from '../MigrationDashboard';
import MigrationService from '../../../firebase/migrationService';
import { getShopProducts } from '../../../firebase/shopProductService';
import { getBills } from '../../../firebase/billService';

// Mock Firebase services
jest.mock('../../../firebase/migrationService');
jest.mock('../../../firebase/shopProductService');
jest.mock('../../../firebase/billService');

// Mock UI components
jest.mock('../../ui/NotificationSystem', () => {
  return function MockNotificationSystem({ notifications, onRemove }) {
    return (
      <div data-testid="notification-system">
        {notifications.map(notification => (
          <div key={notification.id} data-testid={`notification-${notification.type}`}>
            {notification.message}
            <button onClick={() => onRemove(notification.id)}>Remove</button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../ui/Card', () => {
  return function MockCard({ children, className }) {
    return <div className={className}>{children}</div>;
  };
});

jest.mock('../../ui/Button', () => {
  return function MockButton({ children, onClick, disabled, variant, ...props }) {
    return (
      <button 
        onClick={onClick} 
        disabled={disabled} 
        className={variant}
        {...props}
      >
        {children}
      </button>
    );
  };
});

jest.mock('../../ui/LoadingSpinner', () => {
  return function MockLoadingSpinner({ size }) {
    return <div data-testid="loading-spinner" className={`spinner-${size}`}>Loading...</div>;
  };
});

describe('Migration Workflow End-to-End Tests', () => {
  const mockProducts = [
    {
      id: 'prod1',
      productName: 'Product 1',
      billNumber: 'B001',
      totalAmount: 100,
      totalQuantity: 10,
      profitPerPiece: 5
    },
    {
      id: 'prod2',
      productName: 'Product 2',
      billNumber: 'B001',
      totalAmount: 200,
      totalQuantity: 20,
      profitPerPiece: 10
    },
    {
      id: 'prod3',
      productName: 'Product 3',
      billNumber: 'B002',
      totalAmount: 150,
      totalQuantity: 15,
      profitPerPiece: 7
    },
    {
      id: 'prod4',
      productName: 'Orphaned Product',
      billNumber: '',
      totalAmount: 50,
      totalQuantity: 5,
      profitPerPiece: 2
    }
  ];

  const mockBills = [
    {
      id: 'bill1',
      billNumber: 'B001',
      totalAmount: 300,
      totalQuantity: 30,
      totalProfit: 250,
      productCount: 2
    },
    {
      id: 'bill2',
      billNumber: 'B002',
      totalAmount: 150,
      totalQuantity: 15,
      totalProfit: 105,
      productCount: 1
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    getShopProducts.mockResolvedValue([]);
    getBills.mockResolvedValue([]);
    
    // Mock migration service methods
    MigrationService.groupProductsByBillNumber.mockResolvedValue({
      groupedProducts: {
        'B001': mockProducts.slice(0, 2),
        'B002': [mockProducts[2]]
      },
      orphanedProducts: [mockProducts[3]],
      totalProducts: 4,
      groupCount: 2
    });

    MigrationService.createBillsFromGroups.mockResolvedValue({
      createdBills: [
        { bill: mockBills[0], productCount: 2, originalBillNumber: 'B001' },
        { bill: mockBills[1], productCount: 1, originalBillNumber: 'B002' }
      ],
      errors: [],
      successCount: 2,
      errorCount: 0
    });

    MigrationService.updateProductsWithBillReferences.mockResolvedValue({
      updateResults: [
        { productId: 'prod1', billId: 'bill1', billNumber: 'B001' },
        { productId: 'prod2', billId: 'bill1', billNumber: 'B001' },
        { productId: 'prod3', billId: 'bill2', billNumber: 'B002' }
      ],
      errors: [],
      successCount: 3,
      errorCount: 0
    });

    MigrationService.handleOrphanedProducts.mockResolvedValue({
      createdBills: [
        { bill: { id: 'bill3', billNumber: 'B003' }, productCount: 1, originalProductId: 'prod4' }
      ],
      updateResults: [
        { productId: 'prod4', billId: 'bill3', billNumber: 'B003' }
      ],
      errors: [],
      successCount: 1,
      errorCount: 0
    });

    MigrationService.validateDataIntegrity.mockResolvedValue({
      isValid: true,
      issues: [],
      warnings: [],
      summary: {
        totalProducts: 4,
        totalBills: 3,
        productsWithBillId: 4,
        productsWithoutBillId: 0,
        issueCount: 0,
        warningCount: 0
      }
    });
  });

  describe('Complete Migration Workflow', () => {
    test('should complete full migration workflow successfully', async () => {
      const user = userEvent.setup();
      
      render(<MigrationDashboard />);

      // Should start in migration tab
      expect(screen.getByText('Migration')).toHaveClass('active');
      
      // Should show start migration button
      const startButton = screen.getByRole('button', { name: /start migration/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();

      // Start migration
      await user.click(startButton);

      // Should show running state
      await waitFor(() => {
        expect(screen.getByText(/running migration/i)).toBeInTheDocument();
      });

      // Should show progress steps
      await waitFor(() => {
        expect(screen.getByText(/migration in progress/i)).toBeInTheDocument();
      });

      // Wait for migration to complete
      await waitFor(() => {
        expect(screen.getByText(/migration completed successfully/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show migration summary
      expect(screen.getByText('Migration Summary')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Bills created
      expect(screen.getByText('4')).toBeInTheDocument(); // Products updated

      // Should show success notification
      await waitFor(() => {
        expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      });

      // Verify all migration steps were called
      expect(MigrationService.groupProductsByBillNumber).toHaveBeenCalledTimes(1);
      expect(MigrationService.createBillsFromGroups).toHaveBeenCalledTimes(1);
      expect(MigrationService.updateProductsWithBillReferences).toHaveBeenCalledTimes(1);
      expect(MigrationService.handleOrphanedProducts).toHaveBeenCalledTimes(1);
      expect(MigrationService.validateDataIntegrity).toHaveBeenCalledTimes(1);
    });

    test('should handle migration failure gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock a failure in bill creation
      MigrationService.createBillsFromGroups.mockRejectedValue(
        new Error('Database connection failed')
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      await user.click(startButton);

      // Wait for failure
      await waitFor(() => {
        expect(screen.getByText(/migration failed/i)).toBeInTheDocument();
      });

      // Should show error message
      expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();

      // Should show error notification
      await waitFor(() => {
        expect(screen.getByTestId('notification-error')).toBeInTheDocument();
      });

      // Should allow reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).not.toBeDisabled();
    });

    test('should handle partial migration with errors', async () => {
      const user = userEvent.setup();
      
      // Mock partial success with some errors
      MigrationService.createBillsFromGroups.mockResolvedValue({
        createdBills: [mockBills[0]],
        errors: [{ billNumber: 'B002', error: 'Validation failed', productCount: 1 }],
        successCount: 1,
        errorCount: 1
      });

      MigrationService.updateProductsWithBillReferences.mockResolvedValue({
        updateResults: [
          { productId: 'prod1', billId: 'bill1', billNumber: 'B001' },
          { productId: 'prod2', billId: 'bill1', billNumber: 'B001' }
        ],
        errors: [{ productId: 'prod3', billNumber: 'B002', error: 'Bill not found' }],
        successCount: 2,
        errorCount: 1
      });

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      await user.click(startButton);

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/migration completed successfully/i)).toBeInTheDocument();
      });

      // Should show error count in summary
      const errorElements = screen.getAllByText('2'); // Total errors
      expect(errorElements.length).toBeGreaterThan(0);

      // Should show warning about errors
      expect(screen.getByText(/migration completed with.*errors/i)).toBeInTheDocument();
    });
  });

  describe('Data Validation Workflow', () => {
    test('should run validation and show results', async () => {
      const user = userEvent.setup();
      
      render(<MigrationDashboard />);

      // Switch to validation tab
      const validationTab = screen.getByRole('button', { name: /validation/i });
      await user.click(validationTab);

      // Should show validation placeholder
      expect(screen.getByText(/run validation to check data integrity/i)).toBeInTheDocument();

      // Run validation
      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      await user.click(runValidationButton);

      // Should show running state
      await waitFor(() => {
        expect(screen.getByText(/running validation/i)).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/data validation passed/i)).toBeInTheDocument();
      });

      // Should show validation summary
      expect(screen.getByText('4')).toBeInTheDocument(); // Total products
      expect(screen.getByText('3')).toBeInTheDocument(); // Total bills

      // Should show success notification
      await waitFor(() => {
        expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      });
    });

    test('should handle validation with issues', async () => {
      const user = userEvent.setup();
      
      // Mock validation with issues
      MigrationService.validateDataIntegrity.mockResolvedValue({
        isValid: false,
        issues: [
          {
            type: 'missing_bill_id',
            count: 2,
            message: '2 products missing billId',
            productIds: ['prod1', 'prod2']
          },
          {
            type: 'bill_total_mismatch',
            count: 1,
            message: '1 bill total mismatches found',
            mismatches: [
              {
                billId: 'bill1',
                billNumber: 'B001',
                field: 'totalAmount',
                expected: 300,
                actual: 250
              }
            ]
          }
        ],
        warnings: [
          {
            type: 'bills_without_products',
            count: 1,
            message: '1 bills have no associated products',
            billIds: ['bill3']
          }
        ],
        summary: {
          totalProducts: 4,
          totalBills: 3,
          productsWithBillId: 2,
          productsWithoutBillId: 2,
          issueCount: 2,
          warningCount: 1
        }
      });

      render(<MigrationDashboard />);

      // Switch to validation tab
      const validationTab = screen.getByRole('button', { name: /validation/i });
      await user.click(validationTab);

      // Run validation
      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      await user.click(runValidationButton);

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/data validation issues found/i)).toBeInTheDocument();
      });

      // Should show issues
      expect(screen.getByText(/issues \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/warnings \(1\)/i)).toBeInTheDocument();

      // Should show fix issues button
      expect(screen.getByRole('button', { name: /fix issues/i })).toBeInTheDocument();

      // Should show warning notification
      await waitFor(() => {
        expect(screen.getByTestId('notification-warning')).toBeInTheDocument();
      });
    });

    test('should fix validation issues', async () => {
      const user = userEvent.setup();
      
      // Mock validation with fixable issues
      const validationResult = {
        isValid: false,
        issues: [
          {
            type: 'bill_total_mismatch',
            count: 1,
            message: '1 bill total mismatches found',
            mismatches: [
              {
                billId: 'bill1',
                billNumber: 'B001',
                field: 'totalAmount',
                expected: 300,
                actual: 250
              }
            ]
          }
        ],
        warnings: [],
        summary: {
          totalProducts: 4,
          totalBills: 3,
          productsWithBillId: 4,
          productsWithoutBillId: 0,
          issueCount: 1,
          warningCount: 0
        }
      };

      MigrationService.validateDataIntegrity
        .mockResolvedValueOnce(validationResult)
        .mockResolvedValueOnce({
          ...validationResult,
          isValid: true,
          issues: [],
          summary: { ...validationResult.summary, issueCount: 0 }
        });

      MigrationService.fixDataIntegrityIssues.mockResolvedValue({
        success: true,
        fixedIssues: [
          {
            type: 'bill_total_mismatch',
            message: 'Fixed 1 bill total mismatches'
          }
        ],
        unfixedIssues: []
      });

      render(<MigrationDashboard />);

      // Switch to validation tab and run validation
      const validationTab = screen.getByRole('button', { name: /validation/i });
      await user.click(validationTab);

      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      await user.click(runValidationButton);

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText(/data validation issues found/i)).toBeInTheDocument();
      });

      // Fix issues
      const fixIssuesButton = screen.getByRole('button', { name: /fix issues/i });
      await user.click(fixIssuesButton);

      // Should show success notification for fix
      await waitFor(() => {
        expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      });

      // Should re-run validation automatically
      await waitFor(() => {
        expect(screen.getByText(/data validation passed/i)).toBeInTheDocument();
      });

      expect(MigrationService.fixDataIntegrityIssues).toHaveBeenCalledWith(validationResult);
      expect(MigrationService.validateDataIntegrity).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rollback Workflow', () => {
    beforeEach(() => {
      // Mock that migration has been run (bills exist)
      getBills.mockResolvedValue(mockBills);
    });

    test('should show rollback tab when migration has been run', async () => {
      render(<MigrationDashboard />);

      // Wait for migration history check
      await waitFor(() => {
        const rollbackTab = screen.getByRole('button', { name: /rollback/i });
        expect(rollbackTab).not.toBeDisabled();
      });
    });

    test('should generate rollback preview', async () => {
      const user = userEvent.setup();
      
      // Mock products with bill IDs
      const productsWithBillIds = mockProducts.map(p => ({ ...p, billId: 'bill1' }));
      getShopProducts.mockResolvedValue(productsWithBillIds);

      render(<MigrationDashboard />);

      // Switch to rollback tab
      await waitFor(() => {
        const rollbackTab = screen.getByRole('button', { name: /rollback/i });
        expect(rollbackTab).not.toBeDisabled();
        return user.click(rollbackTab);
      });

      // Generate preview
      const generatePreviewButton = screen.getByRole('button', { name: /generate preview/i });
      await user.click(generatePreviewButton);

      // Wait for preview to load
      await waitFor(() => {
        expect(screen.getByText(/rollback preview/i)).toBeInTheDocument();
      });

      // Should show preview stats
      expect(screen.getByText('2')).toBeInTheDocument(); // Bills to delete
      expect(screen.getByText('4')).toBeInTheDocument(); // Products to update

      // Should show proceed button
      expect(screen.getByRole('button', { name: /proceed with rollback/i })).toBeInTheDocument();
    });

    test('should complete rollback workflow', async () => {
      const user = userEvent.setup();
      
      // Mock rollback dependencies
      const productsWithBillIds = mockProducts.map(p => ({ ...p, billId: 'bill1' }));
      getShopProducts.mockResolvedValue(productsWithBillIds);

      // Mock successful rollback operations
      const { updateShopProduct } = require('../../../firebase/shopProductService');
      const { deleteBill } = require('../../../firebase/billService');
      
      updateShopProduct.mockResolvedValue();
      deleteBill.mockResolvedValue();

      render(<MigrationDashboard />);

      // Navigate to rollback and generate preview
      await waitFor(() => {
        const rollbackTab = screen.getByRole('button', { name: /rollback/i });
        return user.click(rollbackTab);
      });

      const generatePreviewButton = screen.getByRole('button', { name: /generate preview/i });
      await user.click(generatePreviewButton);

      await waitFor(() => {
        expect(screen.getByText(/rollback preview/i)).toBeInTheDocument();
      });

      // Proceed with rollback
      const proceedButton = screen.getByRole('button', { name: /proceed with rollback/i });
      await user.click(proceedButton);

      // Should show final confirmation
      await waitFor(() => {
        expect(screen.getByText(/final confirmation/i)).toBeInTheDocument();
      });

      // Execute rollback
      const executeButton = screen.getByRole('button', { name: /execute rollback/i });
      await user.click(executeButton);

      // Should show progress
      await waitFor(() => {
        expect(screen.getByText(/rollback in progress/i)).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/rollback completed/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show success notification
      await waitFor(() => {
        expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors during migration', async () => {
      const user = userEvent.setup();
      
      MigrationService.groupProductsByBillNumber.mockRejectedValue(
        new Error('Network error')
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration failed/i)).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('should handle validation errors', async () => {
      const user = userEvent.setup();
      
      MigrationService.validateDataIntegrity.mockRejectedValue(
        new Error('Validation service unavailable')
      );

      render(<MigrationDashboard />);

      const validationTab = screen.getByRole('button', { name: /validation/i });
      await user.click(validationTab);

      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      await user.click(runValidationButton);

      await waitFor(() => {
        expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
        expect(screen.getByText(/validation service unavailable/i)).toBeInTheDocument();
      });
    });

    test('should handle empty data scenarios', async () => {
      const user = userEvent.setup();
      
      // Mock empty data
      MigrationService.groupProductsByBillNumber.mockResolvedValue({
        groupedProducts: {},
        orphanedProducts: [],
        totalProducts: 0,
        groupCount: 0
      });

      MigrationService.createBillsFromGroups.mockResolvedValue({
        createdBills: [],
        errors: [],
        successCount: 0,
        errorCount: 0
      });

      MigrationService.updateProductsWithBillReferences.mockResolvedValue({
        updateResults: [],
        errors: [],
        successCount: 0,
        errorCount: 0
      });

      MigrationService.handleOrphanedProducts.mockResolvedValue({
        createdBills: [],
        updateResults: [],
        errors: [],
        successCount: 0,
        errorCount: 0
      });

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration completed successfully/i)).toBeInTheDocument();
      });

      // Should show zero counts in summary
      expect(screen.getByText('0')).toBeInTheDocument(); // Bills created
    });

    test('should handle notification removal', async () => {
      const user = userEvent.setup();
      
      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      await user.click(startButton);

      // Wait for success notification
      await waitFor(() => {
        expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      });

      // Remove notification
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      // Notification should be removed
      await waitFor(() => {
        expect(screen.queryByTestId('notification-success')).not.toBeInTheDocument();
      });
    });
  });

  describe('UI State Management', () => {
    test('should disable buttons during migration', async () => {
      const user = userEvent.setup();
      
      // Mock slow migration
      MigrationService.groupProductsByBillNumber.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      await user.click(startButton);

      // Button should be disabled during migration
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /running migration/i })).toBeDisabled();
      });
    });

    test('should maintain tab state during operations', async () => {
      const user = userEvent.setup();
      
      render(<MigrationDashboard />);

      // Switch to validation tab
      const validationTab = screen.getByRole('button', { name: /validation/i });
      await user.click(validationTab);

      expect(validationTab).toHaveClass('active');

      // Run validation
      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      await user.click(runValidationButton);

      // Tab should remain active during validation
      await waitFor(() => {
        expect(validationTab).toHaveClass('active');
      });
    });

    test('should reset migration state properly', async () => {
      const user = userEvent.setup();
      
      render(<MigrationDashboard />);

      // Start and complete migration
      const startButton = screen.getByRole('button', { name: /start migration/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration completed successfully/i)).toBeInTheDocument();
      });

      // Reset migration
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Should return to initial state
      expect(screen.getByRole('button', { name: /start migration/i })).toBeInTheDocument();
      expect(screen.queryByText(/migration completed successfully/i)).not.toBeInTheDocument();
    });
  });
});