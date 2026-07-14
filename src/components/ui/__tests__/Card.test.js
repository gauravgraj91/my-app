import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '../Card';

describe('Card', () => {
  test('keeps card chrome when a style prop is passed', () => {
    render(<Card style={{ marginTop: 4 }} data-testid="card">content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveStyle({ background: 'var(--card)' });
    expect(card).toHaveStyle({ marginTop: '4px' });
  });

  test('uses Clay card radius and no shadow by default', () => {
    render(<Card data-testid="card">content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveStyle({ borderRadius: 'var(--radius-lg)' });
    expect(card).toHaveStyle({ boxShadow: 'none' });
  });
});
