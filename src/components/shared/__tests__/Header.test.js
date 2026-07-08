import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

const mockLogout = jest.fn(() => Promise.resolve());
jest.mock('../../../firebase/authService', () => ({
  logout: (...args) => mockLogout(...args)
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Gaurav Raj', email: 'gaurav@gmail.com' }
  })
}));

describe('Header profile menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.body.className = '';
  });

  it('shows a profile pill with first name and no raw email in the bar', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /Gaurav/ })).toBeInTheDocument();
    expect(screen.queryByText('gaurav@gmail.com')).not.toBeInTheDocument();
  });

  it('opens the menu with identity, Settings, Dark mode and Log out', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    expect(screen.getByText('gaurav@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('navigates to /settings and closes the menu', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    fireEvent.click(screen.getByText('Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('toggles dark mode from the menu row', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    fireEvent.click(screen.getByText('Dark mode'));
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('logs out and navigates to /login', async () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalled();
    await screen.findByRole('button', { name: /Gaurav/ });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
