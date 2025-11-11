import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BillCreateModal from '../BillCreateModal';
import { BillModel } from '../../../firebase/billService';

// Mock the BillModel
jest.mock('../../../firebase/billService', () => ({
  BillModel: {
    generateBillNumber: jest.fn(),
    validate: jest.fn()
  }
}));

describe('BillCreateModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockExistingBills = [
    { billNumber: 'B001' },
    { billNumber: 'B002' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    BillModel.generateBillNumber.mockReturnValue('B003');
    BillModel.validate.mockReturnValue(null); // No validation errors
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    existingBills: mockExistingBills
  };

  describe('Rendering', () => {
    it('renders modal when open', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      expect(screen.getByText('Create New Bill')).toBeInTheDocument();
      expect(screen.getByLabelText(/Bill Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Vendor/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<BillCreateModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Create New Bill')).not.toBeInTheDocument();
    });

    it('generates bill number on open', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      expect(BillModel.generateBillNumber).toHaveBeenCalledWith(mockExistingBills);
      expect(screen.getByDisplayValue('B003')).toBeInTheDocument();
    });

    it('shows auto-generation hint for bill number', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      expect(screen.getByText('Auto-generated bill number. You can modify if needed.')).toBeInTheDocument();
    });

    it('shows character count for notes', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates bill number when changed', async () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const billNumberInput = screen.getByLabelText(/Bill Number/);
      await userEvent.clear(billNumberInput);
      await userEvent.type(billNumberInput, 'B999');
      
      expect(billNumberInput).toHaveValue('B999');
    });

    it('updates date when changed', async () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const dateInput = screen.getByLabelText(/Date/);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-12-25');
      
      expect(dateInput).toHaveValue('2024-12-25');
    });

    it('updates vendor when changed', async () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const vendorInput = screen.getByLabelText(/Vendor/);
      await userEvent.type(vendorInput, 'Test Vendor');
      
      expect(vendorInput).toHaveValue('Test Vendor');
    });

    it('updates status when changed', async () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const statusSelect = screen.getByLabelText(/Status/);
      await userEvent.selectOptions(statusSelect, 'archived');
      
      expect(statusSelect).toHaveValue('archived');
    });

    it('updates notes and character count', async () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const notesTextarea = screen.getByLabelText(/Notes/);
      await userEvent.type(notesTextarea, 'Test notes');
      
      expect(notesTextarea).toHaveValue('Test notes');
      expect(screen.getByText('10/500 characters')).toBeInTheDocument();
    });

    it('clears errors when user starts typing', async () => {
      BillModel.validate.mockReturnValue({ billNumber: 'Bill number is required' });
      
      render(<BillCreateModal {...defaultProps} />);
      
      // Submit to trigger validation
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      // Error should appear
      await waitFor(() => {
        expect(screen.getByText('Bill number is required')).toBeInTheDocument();
      });
      
      // Type in bill number field
      const billNumberInput = screen.getByLabelText(/Bill Number/);
      await userEvent.type(billNumberInput, 'B');
      
      // Error should be cleared
      expect(screen.queryByText('Bill number is required')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors from BillModel', async () => {
      const validationErrors = {
        billNumber: 'Bill number is required',
        vendor: 'Vendor is required',
        date: 'Date is required'
      };
      BillModel.validate.mockReturnValue(validationErrors);
      
      render(<BillCreateModal {...defaultProps} />);
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bill number is required')).toBeInTheDocument();
        expect(screen.getByText('Vendor is required')).toBeInTheDocument();
        expect(screen.getByText('Date is required')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows error for duplicate bill number', async () => {
      render(<BillCreateModal {...defaultProps} />);
      
      // Set bill number to existing one
      const billNumberInput = screen.getByLabelText(/Bill Number/);
      await userEvent.clear(billNumberInput);
      await userEvent.type(billNumberInput, 'B001');
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bill number already exists')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('prevents submission when validation fails', async () => {
      BillModel.validate.mockReturnValue({ vendor: 'Vendor is required' });
      
      render(<BillCreateModal {...defaultProps} />);
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Vendor is required')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('calls onSave with correct data on successful submission', async () => {
      mockOnSave.mockResolvedValue();
      
      render(<BillCreateModal {...defaultProps} />);
      
      // Fill form
      const vendorInput = screen.getByLabelText(/Vendor/);
      await userEvent.type(vendorInput, 'Test Vendor');
      
      const notesTextarea = screen.getByLabelText(/Notes/);
      await userEvent.type(notesTextarea, 'Test notes');
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          billNumber: 'B003',
          date: expect.any(Date),
          vendor: 'Test Vendor',
          notes: 'Test notes',
          status: 'active'
        });
      });
    });

    it('shows loading state during submission', async () => {
      let resolvePromise;
      mockOnSave.mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve;
      }));
      
      render(<BillCreateModal {...defaultProps} />);
      
      const vendorInput = screen.getByLabelText(/Vendor/);
      await userEvent.type(vendorInput, 'Test Vendor');
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve promise
      resolvePromise();
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('closes modal on successful submission', async () => {
      mockOnSave.mockResolvedValue();
      
      render(<BillCreateModal {...defaultProps} />);
      
      const vendorInput = screen.getByLabelText(/Vendor/);
      await userEvent.type(vendorInput, 'Test Vendor');
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error message on submission failure', async () => {
      const errorMessage = 'Failed to create bill';
      mockOnSave.mockRejectedValue(new Error(errorMessage));
      
      render(<BillCreateModal {...defaultProps} />);
      
      const vendorInput = screen.getByLabelText(/Vendor/);
      await userEvent.type(vendorInput, 'Test Vendor');
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('shows generic error message when error has no message', async () => {
      mockOnSave.mockRejectedValue(new Error());
      
      render(<BillCreateModal {...defaultProps} />);
      
      const vendorInput = screen.getByLabelText(/Vendor/);
      await userEvent.type(vendorInput, 'Test Vendor');
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create bill. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents closing during loading', async () => {
      let resolvePromise;
      mockOnSave.mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve;
      }));
      
      render(<BillCreateModal {...defaultProps} />);
      
      const vendorInput = screen.getByLabelText(/Vendor/);
      await userEvent.type(vendorInput, 'Test Vendor');
      
      const submitButton = screen.getByText('Create Bill');
      await userEvent.click(submitButton);
      
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
      const { rerender } = render(<BillCreateModal {...defaultProps} />);
      
      // Modal is open, form should have generated bill number
      expect(screen.getByDisplayValue('B003')).toBeInTheDocument();
      
      // Close modal
      rerender(<BillCreateModal {...defaultProps} isOpen={false} />);
      
      // Reopen modal
      BillModel.generateBillNumber.mockReturnValue('B004');
      rerender(<BillCreateModal {...defaultProps} isOpen={true} />);
      
      // Form should be reset with new bill number
      expect(screen.getByDisplayValue('B004')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      expect(screen.getByLabelText(/Bill Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Vendor/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
    });

    it('has proper form role', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('shows required field indicators', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      expect(screen.getByText(/Bill Number \*/)).toBeInTheDocument();
      expect(screen.getByText(/Date \*/)).toBeInTheDocument();
      expect(screen.getByText(/Vendor \*/)).toBeInTheDocument();
    });
  });

  describe('Status Options', () => {
    it('provides correct status options', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const statusSelect = screen.getByLabelText(/Status/);
      const options = Array.from(statusSelect.options).map(option => ({
        value: option.value,
        text: option.text
      }));
      
      expect(options).toEqual([
        { value: 'active', text: 'Active' },
        { value: 'archived', text: 'Archived' },
        { value: 'returned', text: 'Returned' }
      ]);
    });

    it('defaults to active status', () => {
      render(<BillCreateModal {...defaultProps} />);
      
      const statusSelect = screen.getByLabelText(/Status/);
      expect(statusSelect).toHaveValue('active');
    });
  });
});