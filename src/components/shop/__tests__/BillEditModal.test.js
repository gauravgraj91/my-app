import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BillEditModal from '../BillEditModal';

describe('BillEditModal', () => {
  const mockBill = {
    id: 'bill-1',
    billNumber: 'B001',
    date: new Date('2024-01-15'),
    vendor: 'Test Vendor',
    notes: 'Test notes',
    status: 'active'
  };

  const defaultProps = {
    isOpen: true,
    bill: mockBill,
    onClose: jest.fn(),
    onSave: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    test('renders modal when isOpen is true', () => {
      render(<BillEditModal {...defaultProps} />);
      expect(screen.getByText('Edit Bill')).toBeInTheDocument();
    });

    test('does not render modal when isOpen is false', () => {
      render(<BillEditModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Edit Bill')).not.toBeInTheDocument();
    });

    test('initializes form with bill data', () => {
      render(<BillEditModal {...defaultProps} />);

      expect(screen.getByDisplayValue('B001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Vendor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Active')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('shows error when bill number is empty', async () => {
      render(<BillEditModal {...defaultProps} />);

      const billNumberInput = screen.getByDisplayValue('B001');
      fireEvent.change(billNumberInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Bill number is required')).toBeInTheDocument();
      });
    });

    test('shows error when bill number is too long', async () => {
      render(<BillEditModal {...defaultProps} />);

      const billNumberInput = screen.getByDisplayValue('B001');
      fireEvent.change(billNumberInput, { target: { value: 'A'.repeat(21) } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Bill number must be less than 20 characters')).toBeInTheDocument();
      });
    });

    test('shows error when date is empty', async () => {
      render(<BillEditModal {...defaultProps} />);

      const dateInput = screen.getByDisplayValue('2024-01-15');
      fireEvent.change(dateInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Date is required')).toBeInTheDocument();
      });
    });

    test('shows error when vendor is empty', async () => {
      render(<BillEditModal {...defaultProps} />);

      const vendorInput = screen.getByDisplayValue('Test Vendor');
      fireEvent.change(vendorInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Vendor is required')).toBeInTheDocument();
      });
    });

    test('shows error when vendor name is too long', async () => {
      render(<BillEditModal {...defaultProps} />);

      const vendorInput = screen.getByDisplayValue('Test Vendor');
      fireEvent.change(vendorInput, { target: { value: 'A'.repeat(101) } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Vendor name must be less than 100 characters')).toBeInTheDocument();
      });
    });

    test('shows error when notes are too long', async () => {
      render(<BillEditModal {...defaultProps} />);

      const notesInput = screen.getByDisplayValue('Test notes');
      fireEvent.change(notesInput, { target: { value: 'A'.repeat(501) } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Notes must be less than 500 characters')).toBeInTheDocument();
      });
    });

    test('clears error when user starts typing', async () => {
      render(<BillEditModal {...defaultProps} />);

      // First trigger an error
      const billNumberInput = screen.getByDisplayValue('B001');
      fireEvent.change(billNumberInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Bill number is required')).toBeInTheDocument();
      });

      // Then start typing to clear the error
      fireEvent.change(billNumberInput, { target: { value: 'B' } });

      await waitFor(() => {
        expect(screen.queryByText('Bill number is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('calls onSave with updated data when form is valid', async () => {
      render(<BillEditModal {...defaultProps} />);

      const vendorInput = screen.getByDisplayValue('Test Vendor');
      fireEvent.change(vendorInput, { target: { value: 'Updated Vendor' } });

      const notesInput = screen.getByDisplayValue('Test notes');
      fireEvent.change(notesInput, { target: { value: 'Updated notes' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith({
          billNumber: 'B001',
          date: new Date('2024-01-15'),
          vendor: 'Updated Vendor',
          notes: 'Updated notes',
          status: 'active'
        });
      });
    });

    test('does not call onSave when form is invalid', async () => {
      render(<BillEditModal {...defaultProps} />);

      const billNumberInput = screen.getByDisplayValue('B001');
      fireEvent.change(billNumberInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Bill number is required')).toBeInTheDocument();
      });

      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    test('shows loading state during save', async () => {
      const slowOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<BillEditModal {...defaultProps} onSave={slowOnSave} />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });

    test('handles save errors gracefully', async () => {
      const failingOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      render(<BillEditModal {...defaultProps} onSave={failingOnSave} />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save bill. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interaction', () => {
    test('calls onClose when cancel button is clicked', () => {
      render(<BillEditModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('does not close modal during loading', () => {
      const slowOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<BillEditModal {...defaultProps} onSave={slowOnSave} />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // onClose should not be called during loading
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Status Selection', () => {
    test('allows changing status', () => {
      render(<BillEditModal {...defaultProps} />);

      const statusSelect = screen.getByDisplayValue('Active');
      fireEvent.change(statusSelect, { target: { value: 'archived' } });

      expect(statusSelect.value).toBe('archived');
    });

    test('includes all status options', () => {
      render(<BillEditModal {...defaultProps} />);

      const statusSelect = screen.getByDisplayValue('Active');
      const options = Array.from(statusSelect.options).map(option => option.value);

      expect(options).toEqual(['active', 'archived', 'returned']);
    });
  });

  describe('Character Counter', () => {
    test('shows character count for notes', () => {
      render(<BillEditModal {...defaultProps} />);

      expect(screen.getByText('10/500 characters')).toBeInTheDocument();
    });

    test('updates character count when typing', () => {
      render(<BillEditModal {...defaultProps} />);

      const notesInput = screen.getByDisplayValue('Test notes');
      fireEvent.change(notesInput, { target: { value: 'Updated notes with more text' } });

      expect(screen.getByText('28/500 characters')).toBeInTheDocument();
    });
  });

  describe('Form Labels and Icons', () => {
    test('displays proper labels with icons', () => {
      render(<BillEditModal {...defaultProps} />);

      expect(screen.getByText('Bill Number *')).toBeInTheDocument();
      expect(screen.getByText('Date *')).toBeInTheDocument();
      expect(screen.getByText('Vendor *')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  describe('Date Handling', () => {
    test('handles Date object correctly', () => {
      const billWithDateObject = {
        ...mockBill,
        date: new Date('2024-02-20')
      };

      render(<BillEditModal {...defaultProps} bill={billWithDateObject} />);

      expect(screen.getByDisplayValue('2024-02-20')).toBeInTheDocument();
    });

    test('handles date string correctly', () => {
      const billWithDateString = {
        ...mockBill,
        date: '2024-03-25'
      };

      render(<BillEditModal {...defaultProps} bill={billWithDateString} />);

      expect(screen.getByDisplayValue('2024-03-25')).toBeInTheDocument();
    });
  });

  describe('Form Reset', () => {
    test('resets form when bill prop changes', () => {
      const { rerender } = render(<BillEditModal {...defaultProps} />);

      // Modify form
      const vendorInput = screen.getByDisplayValue('Test Vendor');
      fireEvent.change(vendorInput, { target: { value: 'Modified Vendor' } });

      // Change bill prop
      const newBill = {
        ...mockBill,
        id: 'bill-2',
        billNumber: 'B002',
        vendor: 'New Vendor'
      };

      rerender(<BillEditModal {...defaultProps} bill={newBill} />);

      // Form should reset to new bill data
      expect(screen.getByDisplayValue('B002')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New Vendor')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper form structure', () => {
      render(<BillEditModal {...defaultProps} />);

      // Check that form element exists
      const formElement = screen.getByRole('form');
      expect(formElement).toBeInTheDocument();
    });

    test('associates labels with inputs', () => {
      render(<BillEditModal {...defaultProps} />);

      const billNumberInput = screen.getByDisplayValue('B001');
      expect(billNumberInput).toHaveAttribute('type', 'text');

      const dateInput = screen.getByDisplayValue('2024-01-15');
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    test('disables form elements during loading', async () => {
      const slowOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<BillEditModal {...defaultProps} onSave={slowOnSave} />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      const billNumberInput = screen.getByDisplayValue('B001');
      expect(billNumberInput).toBeDisabled();

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });
});