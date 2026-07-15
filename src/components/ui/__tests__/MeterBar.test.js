import React from 'react';
import { render, screen } from '@testing-library/react';
import MeterBar from '../MeterBar';

describe('MeterBar', () => {
  test('renders proportional pill segments', () => {
    render(
      <MeterBar
        data-testid="m"
        total={100}
        segments={[{ value: 25, color: 'var(--warning)' }, { value: 50, color: 'var(--overdue)' }]}
      />
    );
    const track = screen.getByTestId('m');
    expect(track).toHaveStyle({ background: 'var(--secondary)', borderRadius: 'var(--radius-pill)' });
    expect(track.children).toHaveLength(2);
    expect(track.children[0]).toHaveStyle({ width: '25%' });
    expect(track.children[1]).toHaveStyle({ width: '50%' });
  });

  test('renders an empty track when there is nothing to show', () => {
    render(<MeterBar data-testid="m" total={0} segments={[{ value: 0, color: 'var(--warning)' }]} />);
    expect(screen.getByTestId('m').children).toHaveLength(0);
  });
});
