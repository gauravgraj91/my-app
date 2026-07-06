import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BillCreateModal from '../BillCreateModal';
import { useBills } from '../../../context/BillsContext';

jest.mock('../../../context/BillsContext', () => ({
  useBills: jest.fn()
}));

jest.mock('../../../context/VendorsContext', () => ({
  useVendors: () => ({ vendors: [] })
}));

const billsContextValue = (bills) => ({
  bills,
  billProducts: {},
  handleCreateBill: jest.fn(),
  handleEditBill: jest.fn()
});

describe('BillCreateModal bill number stability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not overwrite a user-typed bill number when bills update in real time', () => {
    useBills.mockReturnValue(billsContextValue([{ billNumber: 'B001' }]));

    const { rerender } = render(
      <BillCreateModal isOpen={true} onClose={jest.fn()} />
    );

    const input = screen.getByDisplayValue('B002'); // auto-generated on open
    fireEvent.change(input, { target: { value: 'CUSTOM-9' } });
    expect(screen.getByDisplayValue('CUSTOM-9')).toBeInTheDocument();

    // A real-time snapshot arrives: bills array gets a new identity and a new entry
    useBills.mockReturnValue(
      billsContextValue([{ billNumber: 'B001' }, { billNumber: 'B002' }])
    );
    rerender(<BillCreateModal isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByDisplayValue('CUSTOM-9')).toBeInTheDocument();
  });
});
