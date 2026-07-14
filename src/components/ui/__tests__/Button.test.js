import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from '../Button';

describe('Button', () => {
  test('primary is a pill with the clay glow', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveStyle({ borderRadius: 'var(--radius-pill)' });
    expect(btn).toHaveStyle({ boxShadow: 'var(--shadow-accent)' });
  });

  test('secondary has no glow', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' });
    expect(btn).not.toHaveStyle({ boxShadow: 'var(--shadow-accent)' });
  });
});
