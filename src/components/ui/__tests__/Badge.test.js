import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from '../Badge';

describe('Badge', () => {
  test('is a pill', () => {
    render(<Badge>Paid</Badge>);
    expect(screen.getByText('Paid')).toHaveStyle({ borderRadius: 'var(--radius-pill)' });
  });

  test('overdue variant is solid clay', () => {
    render(<Badge variant="overdue">Overdue</Badge>);
    const badge = screen.getByText('Overdue');
    expect(badge).toHaveStyle({ background: 'var(--overdue)' });
    expect(badge).toHaveStyle({ color: 'var(--overdue-foreground)' });
  });
});
