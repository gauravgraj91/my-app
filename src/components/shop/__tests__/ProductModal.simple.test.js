import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductModal from '../ProductModal';

describe('ProductModal - Simple Tests', () => {
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

    it('shows update button', () => {
      render(<ProductModal {...defaultEditProps} />);
      
      expect(screen.getByText('Update Product')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders all required form fields', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByText(/Product Name/)).toBeInTheDocument();
      expect(screen.getByText(/Category/)).toBeInTheDocument();
      expect(screen.getByText(/Vendor/)).toBeInTheDocument();
      expect(screen.getByText(/MRP/)).toBeInTheDocument();
      expect(screen.getByText(/Quantity/)).toBeInTheDocument();
      expect(screen.getByText(/Price Per Piece/)).toBeInTheDocument();
      expect(screen.getByText(/Profit Per Piece/)).toBeInTheDocument();
      expect(screen.getByText(/Total Amount/)).toBeInTheDocument();
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

    it('shows calculation hint for total amount', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByText('Automatically calculated: Quantity × Price Per Piece')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on submit', async () => {
      mockOnSave.mockResolvedValue();
      render(<ProductModal {...defaultCreateProps} />);
      
      const submitButton = screen.getByText('Add Product');
      fireEvent.click(submitButton);
      
      // Should not call onSave if validation fails
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not render when closed', () => {
      render(<ProductModal {...defaultCreateProps} isOpen={false} />);
      
      expect(screen.queryByText('Add Product to B001')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form role', () => {
      render(<ProductModal {...defaultCreateProps} />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
    });
  });
});