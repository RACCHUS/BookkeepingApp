import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

// Mock the useAuth hook
const mockLogout = vi.fn();
const mockUser = { displayName: null, email: null, photoURL: null };

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout
  })
}));

// Mock the ThemeToggle component
vi.mock('../../ui', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>
}));

// Mock heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  UserCircleIcon: () => <span data-testid="user-icon">UserIcon</span>,
  BellIcon: () => <span data-testid="bell-icon">BellIcon</span>,
  ArrowRightOnRectangleIcon: () => <span data-testid="logout-icon">LogoutIcon</span>
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset user to default
    mockUser.displayName = null;
    mockUser.email = null;
    mockUser.photoURL = null;
  });

  it('renders without crashing', () => {
    render(<Header />);
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
  });

  it('displays user displayName when available', () => {
    mockUser.displayName = 'John Doe';
    mockUser.email = 'john@example.com';
    render(<Header />);
    
    expect(screen.getByText(/Welcome back, John Doe/)).toBeInTheDocument();
  });

  it('displays email username when no displayName', () => {
    mockUser.email = 'john@example.com';
    render(<Header />);
    
    expect(screen.getByText(/Welcome back, john/)).toBeInTheDocument();
  });

  it('displays "User" when no user info available', () => {
    render(<Header />);
    
    expect(screen.getByText(/Welcome back, User/)).toBeInTheDocument();
  });

  it('renders theme toggle', () => {
    render(<Header />);
    
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('renders notification bell', () => {
    render(<Header />);
    
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('renders user profile icon when no photo URL', () => {
    mockUser.email = 'john@example.com';
    render(<Header />);
    
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('renders user photo when photoURL is available', () => {
    mockUser.email = 'john@example.com';
    mockUser.photoURL = 'https://example.com/photo.jpg';
    render(<Header />);
    
    const photo = screen.getByAltText('Profile');
    expect(photo).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('displays user email in profile section', () => {
    mockUser.displayName = 'John Doe';
    mockUser.email = 'john@example.com';
    render(<Header />);
    
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
