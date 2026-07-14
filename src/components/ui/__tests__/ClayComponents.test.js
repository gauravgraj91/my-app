import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle, PillTabs, Avatar, Toast } from '../index';

describe('Toggle', () => {
  test('calls onChange with the flipped value', () => {
    const onChange = jest.fn();
    render(<Toggle checked={false} onChange={onChange} data-testid="t" />);
    fireEvent.click(screen.getByTestId('t'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('PillTabs', () => {
  test('renders items and reports selection', () => {
    const onChange = jest.fn();
    render(<PillTabs items={['Bills', 'Products']} value="Bills" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Products' }));
    expect(onChange).toHaveBeenCalledWith('Products');
  });

  test('active tab is the ink pill', () => {
    render(<PillTabs items={['Bills', 'Products']} value="Bills" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bills' }))
      .toHaveStyle({ background: 'var(--foreground)' });
  });
});

describe('Avatar', () => {
  test('derives two-letter initials', () => {
    render(<Avatar name="Sharma & Sons" />);
    expect(screen.getByText('SS')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  test('renders an ink pill message', () => {
    render(<Toast>Bill marked as paid ✓</Toast>);
    expect(screen.getByText('Bill marked as paid ✓'))
      .toHaveStyle({ background: 'var(--foreground)' });
  });
});
