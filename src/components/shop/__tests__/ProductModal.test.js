import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductModal from '../ProductModal';

describe('ProductModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  
  const mockBill = {
    id: 'bill-1',
    billNumber: 'B001',
    vendor: 'Test Vendor',
    date: new Date('2024-01-15')
  };

  const mockProduct = {
    id: 'product-1',
    productName: 'Test Product',
    category: 'Electronics',
    vendor: 'Test Vendor',
    mrp: 100,
    totalQuantity: 5,
    pricePerPiece: 80,
    profitPerPiece: 20,
    totalAmount: 400,
    billId: 'bill-1',
    billNumber: 'B001'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultCreateProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    bill: mockBill,
    mode: 'create'
  };

  const defaultEditProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    product: mockProduct,
    mode: 'edit'
  };

  describe('Create Mode', () => {
    it('renders create modal with correct title', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByText('Add Product to B001')).toBeInTheDocument();
    });

    it('shows bill context information', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByText(/Bill: B001/)).toBeInTheDocument();
      expect(screen.getByText(/Vendor: Test Vendor/)).toBeInTheDocument();
      expect(screen.getByText(/Date: 1\/15\/2024/)).toBeInTheDocument();
    });

    it('pre-fills vendor from bill', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      const vendorInput = screen.getByLabelText(/Vendor/);
      expect(vendorInput).toHaveValue('Test Vendor');
    });

    it('shows create button', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByText('Add Product')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('renders edit modal with correct title', () => {
      render(<ProductModal {...defaultEditProps} />);
      
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
    });

    it('pre-fills form with product data', () => {
      render(<ProductModal {...defaultEditProps} />);
      
      expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Electronics')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Vendor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('80')).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
      expect(screen.getByDisplayValue('400')).toBeInTheDocument();
    });

    it('shows update button', () => {
      render(<ProductModal {...defaultEditProps} />);
      
      expect(screen.getByText('Update Product')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders all required form fields', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByLabelText(/Product Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Vendor/)).toBeInTheDocument();
      expect(screen.getByLabelText(/MRP/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Quantity/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Price Per Piece/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Profit Per Piece/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total Amount/)).toBeInTheDocument();
    });

    it('shows required field indicators', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByText(/Product Name \*/)).toBeInTheDocument();
      expect(screen.getByText(/Category \*/)).toBeInTheDocument();
      expect(screen.getByText(/Vendor \*/)).toBeInTheDocument();
      expect(screen.getByText(/MRP \*/)).toBeInTheDocument();
      expect(screen.getByText(/Quantity \*/)).toBeInTheDocument();
      expect(screen.getByText(/Price Per Piece \*/)).toBeInTheDocument();
      expect(screen.getByText(/Profit Per Piece \*/)).toBeInTheDocument();
    });

    it('has total amount field as read-only', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      const totalAmountInput = screen.getByLabelText(/Total Amount/);
      expect(totalAmountInput).toBeDisabled();
    });

    it('shows calculation hint for total amount', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByText('Automatically calculated: Quantity × Price Per Piece')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates product name when changed', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const productNameInput = screen.getByLabelText(/Product Name/);
      await user.type(productNameInput, 'New Product');
      
      expect(productNameInput).toHaveValue('New Product');
    });

    it('updates category when selected', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const categorySelect = screen.getByLabelText(/Category/);
      await user.selectOptions(categorySelect, 'Electronics');
      
      expect(categorySelect).toHaveValue('Electronics');
    });

    it('calculates total amount automatically', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const quantityInput = screen.getByLabelText(/Quantity/);
      const priceInput = screen.getByLabelText(/Price Per Piece/);
      const totalAmountInput = screen.getByLabelText(/Total Amount/);
      
      await user.type(quantityInput, '10');
      await user.type(priceInput, '50');
      
      await waitFor(() => {
        expect(totalAmountInput).toHaveValue(500);
      });
    });

    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      // Submit to trigger validation
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      // Error should appear
      await waitFor(() => {
        expect(screen.getByText('Product name is required')).toBeInTheDocument();
      });
      
      // Type in product name field
      const productNameInput = screen.getByLabelText(/Product Name/);
      await user.type(productNameInput, 'P');
      
      // Error should be cleared
      expect(screen.queryByText('Product name is required')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Product name is required')).toBeInTheDocument();
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(screen.getByText('MRP must be a positive number')).toBeInTheDocument();
        expect(screen.getByText('Quantity must be a positive number')).toBeInTheDocument();
        expect(screen.getByText('Price per piece must be a positive number')).toBeInTheDocument();
        expect(screen.getByText('Profit per piece must be a valid number')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('validates field lengths', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const productNameInput = screen.getByLabelText(/Product Name/);
      const longName = 'a'.repeat(101);
      await user.type(productNameInput, longName);
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Product name must be less than 100 characters')).toBeInTheDocument();
      });
    });

    it('validates numeric fields are positive', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const mrpInput = screen.getByLabelText(/MRP/);
      const quantityInput = screen.getByLabelText(/Quantity/);
      const priceInput = screen.getByLabelText(/Price Per Piece/);
      
      await user.type(mrpInput, '-10');
      await user.type(quantityInput, '0');
      await user.type(priceInput, '-5');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('MRP must be a positive number')).toBeInTheDocument();
        expect(screen.getByText('Quantity must be a positive number')).toBeInTheDocument();
        expect(screen.getByText('Price per piece must be a positive number')).toBeInTheDocument();
      });
    });

    it('validates business logic - price cannot exceed MRP', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const mrpInput = screen.getByLabelText(/MRP/);
      const priceInput = screen.getByLabelText(/Price Per Piece/);
      
      await user.type(mrpInput, '100');
      await user.type(priceInput, '150');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Price per piece cannot be greater than MRP')).toBeInTheDocument();
      });
    });

    it('validates business logic - profit must be less than price', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const priceInput = screen.getByLabelText(/Price Per Piece/);
      const profitInput = screen.getByLabelText(/Profit Per Piece/);
      
      await user.type(priceInput, '100');
      await user.type(profitInput, '100');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profit per piece must be less than price per piece')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSave with correct data on successful submission', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue();
      
      render(<ProductModal {...defaultCreateProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/Product Name/), 'Test Product');
      await user.selectOptions(screen.getByLabelText(/Category/), 'Electronics');
      await user.type(screen.getByLabelText(/MRP/), '100');
      await user.type(screen.getByLabelText(/Quantity/), '5');
      await user.type(screen.getByLabelText(/Price Per Piece/), '80');
      await user.type(screen.getByLabelText(/Profit Per Piece/), '20');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          productName: 'Test Product',
          category: 'Electronics',
          vendor: 'Test Vendor',
          mrp: 100,
          totalQuantity: 5,
          pricePerPiece: 80,
          profitPerPiece: 20,
          totalAmount: 400,
          billId: 'bill-1',
          billNumber: 'B001',
          date: expect.any(Date)
        });
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise;
      mockOnSave.mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve;
      }));
      
      render(<ProductModal {...defaultCreateProps} />);
      
      // Fill required fields
      await user.type(screen.getByLabelText(/Product Name/), 'Test Product');
      await user.selectOptions(screen.getByLabelText(/Category/), 'Electronics');
      await user.type(screen.getByLabelText(/MRP/), '100');
      await user.type(screen.getByLabelText(/Quantity/), '5');
      await user.type(screen.getByLabelText(/Price Per Piece/), '80');
      await user.type(screen.getByLabelText(/Profit Per Piece/), '20');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText('Adding...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve promise
      resolvePromise();
      
      await waitFor(() => {
        expect(screen.queryByText('Adding...')).not.toBeInTheDocument();
      });
    });

    it('closes modal on successful submission', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue();
      
      render(<ProductModal {...defaultCreateProps} />);
      
      // Fill required fields
      await user.type(screen.getByLabelText(/Product Name/), 'Test Product');
      await user.selectOptions(screen.getByLabelText(/Category/), 'Electronics');
      await user.type(screen.getByLabelText(/MRP/), '100');
      await user.type(screen.getByLabelText(/Quantity/), '5');
      await user.type(screen.getByLabelText(/Price Per Piece/), '80');
      await user.type(screen.getByLabelText(/Profit Per Piece/), '20');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error message on submission failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to save product';
      mockOnSave.mockRejectedValue(new Error(errorMessage));
      
      render(<ProductModal {...defaultCreateProps} />);
      
      // Fill required fields
      await user.type(screen.getByLabelText(/Product Name/), 'Test Product');
      await user.selectOptions(screen.getByLabelText(/Category/), 'Electronics');
      await user.type(screen.getByLabelText(/MRP/), '100');
      await user.type(screen.getByLabelText(/Quantity/), '5');
      await user.type(screen.getByLabelText(/Price Per Piece/), '80');
      await user.type(screen.getByLabelText(/Profit Per Piece/), '20');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProductModal {...defaultCreateProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents closing during loading', async () => {
      const user = userEvent.setup();
      let resolvePromise;
      mockOnSave.mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve;
      }));
      
      render(<ProductModal {...defaultCreateProps} />);
      
      // Fill required fields and submit
      await user.type(screen.getByLabelText(/Product Name/), 'Test Product');
      await user.selectOptions(screen.getByLabelText(/Category/), 'Electronics');
      await user.type(screen.getByLabelText(/MRP/), '100');
      await user.type(screen.getByLabelText(/Quantity/), '5');
      await user.type(screen.getByLabelText(/Price Per Piece/), '80');
      await user.type(screen.getByLabelText(/Profit Per Piece/), '20');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      // Try to close during loading
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
      
      // Resolve promise
      resolvePromise();
      
      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled();
      });
    });

    it('resets form when modal closes', () => {
      const { rerender } = render(<ProductModal {...defaultCreateProps} />);
      
      // Close modal
      rerender(<ProductModal {...defaultCreateProps} isOpen={false} />);
      
      // Reopen modal
      rerender(<ProductModal {...defaultCreateProps} isOpen={true} />);
      
      // Form should be reset
      expect(screen.getByLabelText(/Product Name/)).toHaveValue('');
      expect(screen.getByLabelText(/MRP/)).toHaveValue('');
    });
  });

  describe('Category Options', () => {
    it('provides correct category options', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      const categorySelect = screen.getByLabelText(/Category/);
      const options = Array.from(categorySelect.options).map(option => ({
        value: option.value,
        text: option.text
      }));
      
      expect(options).toContainEqual({ value: '', text: 'Select Category' });
      expect(options).toContainEqual({ value: 'Electronics', text: 'Electronics' });
      expect(options).toContainEqual({ value: 'Clothing', text: 'Clothing' });
      expect(options).toContainEqual({ value: 'Food & Beverages', text: 'Food & Beverages' });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByLabelText(/Product Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Vendor/)).toBeInTheDocument();
      expect(screen.getByLabelText(/MRP/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Quantity/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Price Per Piece/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Profit Per Piece/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total Amount/)).toBeInTheDocument();
    });

    it('has proper form role', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
    });
  });
});