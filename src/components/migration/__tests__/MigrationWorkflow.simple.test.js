import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    return <div className={className} data-testid="card">{children}</div>;
  };
});

jest.mock('../../ui/Button', () => {
  return function MockButton({ children, onClick, disabled, variant, ...props }) {
    return (
      <button 
        onClick={onClick} 
        disabled={disabled} 
        className={variant}
        data-testid={props['data-testid'] || 'button'}
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

describe('Migration Workflow Simple Tests', () => {
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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    getShopProducts.mockResolvedValue(mockProducts);
    getBills.mockResolvedValue([]);
    
    // Mock migration service methods
    MigrationService.groupProductsByBillNumber.mockResolvedValue({
      groupedProducts: { 'B001': mockProducts },
      orphanedProducts: [],
      totalProducts: 2,
      groupCount: 1
    });

    MigrationService.createBillsFromGroups.mockResolvedValue({
      createdBills: [{ bill: mockBills[0], productCount: 2, originalBillNumber: 'B001' }],
      errors: [],
      successCount: 1,
      errorCount: 0
    });

    MigrationService.updateProductsWithBillReferences.mockResolvedValue({
      updateResults: [
        { productId: 'prod1', billId: 'bill1', billNumber: 'B001' },
        { productId: 'prod2', billId: 'bill1', billNumber: 'B001' }
      ],
      errors: [],
      successCount: 2,
      errorCount: 0
    });

    MigrationService.handleOrphanedProducts.mockResolvedValue({
      createdBills: [],
      updateResults: [],
      errors: [],
      successCount: 0,
      errorCount: 0
    });

    MigrationService.validateDataIntegrity.mockResolvedValue({
      isValid: true,
      issues: [],
      warnings: [],
      summary: {
        totalProducts: 2,
        totalBills: 1,
        productsWithBillId: 2,
        productsWithoutBillId: 0,
        issueCount: 0,
        warningCount: 0
      }
    });
  });

  describe('Component Rendering', () => {
    test('should render migration dashboard with tabs', () => {
      render(<MigrationDashboard />);

      expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Migration')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
      expect(screen.getByText('Rollback')).toBeInTheDocument();
    });

    test('should show migration tab as active by default', () => {
      render(<MigrationDashboard />);

      const migrationTab = screen.getByRole('button', { name: /migration/i });
      expect(migrationTab).toHaveClass('active');
    });

    test('should show start migration button', () => {
      render(<MigrationDashboard />);

      expect(screen.getByRole('button', { name: /start migration/i })).toBeInTheDocument();
    });
  });

  describe('Migration Process', () => {
    test('should start migration when button is clicked', async () => {
      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/running migration/i)).toBeInTheDocument();
      });

      expect(MigrationService.groupProductsByBillNumber).toHaveBeenCalledTimes(1);
    });

    test('should show migration progress', async () => {
      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration in progress/i)).toBeInTheDocument();
      });
    });

    test('should complete migration successfully', async () => {
      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration completed successfully/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify all migration steps were called
      expect(MigrationService.groupProductsByBillNumber).toHaveBeenCalledTimes(1);
      expect(MigrationService.createBillsFromGroups).toHaveBeenCalledTimes(1);
      expect(MigrationService.updateProductsWithBillReferences).toHaveBeenCalledTimes(1);
      expect(MigrationService.handleOrphanedProducts).toHaveBeenCalledTimes(1);
      expect(MigrationService.validateDataIntegrity).toHaveBeenCalledTimes(1);
    });

    test('should handle migration failure', async () => {
      MigrationService.groupProductsByBillNumber.mockRejectedValue(
        new Error('Database connection failed')
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('should switch to validation tab', async () => {
      render(<MigrationDashboard />);

      const validationTab = screen.getByRole('button', { name: /validation/i });
      fireEvent.click(validationTab);

      expect(validationTab).toHaveClass('active');
      expect(screen.getByText(/run validation to check data integrity/i)).toBeInTheDocument();
    });

    test('should show rollback tab as disabled initially', () => {
      render(<MigrationDashboard />);

      const rollbackTab = screen.getByRole('button', { name: /rollback/i });
      expect(rollbackTab).toBeDisabled();
    });

    test('should enable rollback tab when bills exist', async () => {
      getBills.mockResolvedValue(mockBills);

      render(<MigrationDashboard />);

      await waitFor(() => {
        const rollbackTab = screen.getByRole('button', { name: /rollback/i });
        expect(rollbackTab).not.toBeDisabled();
      });
    });
  });

  describe('Validation Workflow', () => {
    test('should run validation', async () => {
      render(<MigrationDashboard />);

      // Switch to validation tab
      const validationTab = screen.getByRole('button', { name: /validation/i });
      fireEvent.click(validationTab);

      // Run validation
      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      fireEvent.click(runValidationButton);

      await waitFor(() => {
        expect(screen.getByText(/running validation/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/data validation passed/i)).toBeInTheDocument();
      });

      expect(MigrationService.validateDataIntegrity).toHaveBeenCalledTimes(1);
    });

    test('should show validation issues', async () => {
      MigrationService.validateDataIntegrity.mockResolvedValue({
        isValid: false,
        issues: [
          {
            type: 'missing_bill_id',
            count: 2,
            message: '2 products missing billId',
            productIds: ['prod1', 'prod2']
          }
        ],
        warnings: [],
        summary: {
          totalProducts: 2,
          totalBills: 1,
          productsWithBillId: 0,
          productsWithoutBillId: 2,
          issueCount: 1,
          warningCount: 0
        }
      });

      render(<MigrationDashboard />);

      // Switch to validation tab and run validation
      const validationTab = screen.getByRole('button', { name: /validation/i });
      fireEvent.click(validationTab);

      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      fireEvent.click(runValidationButton);

      await waitFor(() => {
        expect(screen.getByText(/data validation issues found/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/issues \(1\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /fix issues/i })).toBeInTheDocument();
    });
  });

  describe('Notification System', () => {
    test('should show success notification after migration', async () => {
      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      });
    });

    test('should show error notification on migration failure', async () => {
      MigrationService.groupProductsByBillNumber.mockRejectedValue(
        new Error('Network error')
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-error')).toBeInTheDocument();
      });
    });

    test('should remove notification when remove button is clicked', async () => {
      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      // Wait for success notification
      await waitFor(() => {
        expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      });

      // Remove notification
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('notification-success')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle validation service errors', async () => {
      MigrationService.validateDataIntegrity.mockRejectedValue(
        new Error('Validation service unavailable')
      );

      render(<MigrationDashboard />);

      const validationTab = screen.getByRole('button', { name: /validation/i });
      fireEvent.click(validationTab);

      const runValidationButton = screen.getByRole('button', { name: /run validation/i });
      fireEvent.click(runValidationButton);

      await waitFor(() => {
        expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/validation service unavailable/i)).toBeInTheDocument();
    });

    test('should show reset button after migration failure', async () => {
      MigrationService.groupProductsByBillNumber.mockRejectedValue(
        new Error('Database error')
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration failed/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    test('should reset migration state when reset button is clicked', async () => {
      MigrationService.groupProductsByBillNumber.mockRejectedValue(
        new Error('Database error')
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration failed/i)).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(screen.getByRole('button', { name: /start migration/i })).toBeInTheDocument();
      expect(screen.queryByText(/migration failed/i)).not.toBeInTheDocument();
    });
  });

  describe('UI State Management', () => {
    test('should disable start button during migration', async () => {
      // Mock slow migration
      MigrationService.groupProductsByBillNumber.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /running migration/i })).toBeDisabled();
      });
    });

    test('should show migration summary after completion', async () => {
      render(<MigrationDashboard />);

      const startButton = screen.getByRole('button', { name: /start migration/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/migration completed successfully/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Migration Summary')).toBeInTheDocument();
    });
  });
});