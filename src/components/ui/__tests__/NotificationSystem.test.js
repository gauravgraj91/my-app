import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationProvider, useNotifications, NOTIFICATION_TYPES } from '../NotificationSystem';

// Test component that uses notifications
const TestComponent = () => {
  const { showSuccess, showError, showWarning, showInfo, clearAllNotifications } = useNotifications();

  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      <button onClick={() => showSuccess('Custom success', { title: 'Custom Title', duration: 1000 })}>
        Show Custom Success
      </button>
      <button onClick={() => showError('Error with action', { 
        action: { label: 'Retry', onClick: () => console.log('Retry clicked') }
      })}>
        Show Error with Action
      </button>
      <button onClick={clearAllNotifications}>Clear All</button>
    </div>
  );
};

// Mock timers
jest.useFakeTimers();

describe('NotificationSystem', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('throws error when useNotifications is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a NotificationProvider');

    console.error = originalError;
  });

  it('renders success notification', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Check for success styling (green background)
    const notification = screen.getByText('Success message').closest('div');
    expect(notification).toHaveStyle('background: linear-gradient(135deg, #10b981, #059669)');
  });

  it('renders error notification', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    // Check for error styling (red background)
    const notification = screen.getByText('Error message').closest('div');
    expect(notification).toHaveStyle('background: linear-gradient(135deg, #ef4444, #dc2626)');
  });

  it('renders warning notification', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    // Check for warning styling (orange background)
    const notification = screen.getByText('Warning message').closest('div');
    expect(notification).toHaveStyle('background: linear-gradient(135deg, #f59e0b, #d97706)');
  });

  it('renders info notification', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    // Check for info styling (blue background)
    const notification = screen.getByText('Info message').closest('div');
    expect(notification).toHaveStyle('background: linear-gradient(135deg, #3b82f6, #1d4ed8)');
  });

  it('renders notification with custom title', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Custom Success'));

    await waitFor(() => {
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom success')).toBeInTheDocument();
    });
  });

  it('renders notification with action button', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Error with Action'));

    await waitFor(() => {
      expect(screen.getByText('Error with action')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));
    expect(consoleSpy).toHaveBeenCalledWith('Retry clicked');

    consoleSpy.mockRestore();
  });

  it('auto-removes notification after duration', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Custom Success'));

    await waitFor(() => {
      expect(screen.getByText('Custom success')).toBeInTheDocument();
    });

    // Fast-forward time by 1000ms (custom duration)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Wait for removal animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Custom success')).not.toBeInTheDocument();
    });
  });

  it('removes notification when clicked', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Click on the notification
    fireEvent.click(screen.getByText('Success message').closest('div'));

    // Wait for removal animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('removes notification when close button is clicked', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Click the close button
    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    // Wait for removal animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('clears all notifications', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Add multiple notifications
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    // Clear all notifications
    fireEvent.click(screen.getByText('Clear All'));

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
      expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
    });
  });

  it('limits number of notifications based on maxNotifications prop', async () => {
    const TestComponentMany = () => {
      const { showSuccess } = useNotifications();
      return (
        <div>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <button key={i} onClick={() => showSuccess(`Message ${i}`)}>
              Show {i}
            </button>
          ))}
        </div>
      );
    };

    render(
      <NotificationProvider maxNotifications={3}>
        <TestComponentMany />
      </NotificationProvider>
    );

    // Add 6 notifications
    for (let i = 1; i <= 6; i++) {
      fireEvent.click(screen.getByText(`Show ${i}`));
    }

    await waitFor(() => {
      // Should only show the last 3 notifications
      expect(screen.getByText('Message 6')).toBeInTheDocument();
      expect(screen.getByText('Message 5')).toBeInTheDocument();
      expect(screen.getByText('Message 4')).toBeInTheDocument();
      expect(screen.queryByText('Message 3')).not.toBeInTheDocument();
      expect(screen.queryByText('Message 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Message 1')).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      // Find the notification by its role and aria-live attributes
      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
      expect(notification).toHaveTextContent('Success message');
    });

    // Check container accessibility
    const container = screen.getByLabelText('Notifications');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('handles different notification types correctly', () => {
    expect(NOTIFICATION_TYPES.SUCCESS).toBe('success');
    expect(NOTIFICATION_TYPES.ERROR).toBe('error');
    expect(NOTIFICATION_TYPES.WARNING).toBe('warning');
    expect(NOTIFICATION_TYPES.INFO).toBe('info');
  });
});