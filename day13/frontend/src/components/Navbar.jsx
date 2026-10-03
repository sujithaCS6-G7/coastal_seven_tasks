import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  Sun,
  Moon,
  LogOut,
  User,
  Shield,
  Menu,
  X,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  UserCheck,
  ClipboardList,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { cartCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    cn(
      "nav-link text-sm font-medium transition-colors hover:text-primary px-3 py-1.5 rounded-md",
      isActive
        ? "active bg-secondary text-primary font-semibold"
        : "text-muted-foreground"
    );

  return (
    <nav className="navbar sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm transition-colors">
      <div className="nav-container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="nav-brand flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 text-base">
              ⚡
            </span>
            <span className="flex flex-col">
              <span className="leading-tight tracking-tight font-extrabold text-foreground text-lg">
                Nexora
              </span>
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-indigo-500" /> Day 13 E-Commerce
              </span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-4">
          <ul className="nav-links flex items-center gap-1">
            <li>
              <NavLink to="/" className={navLinkClass} end>
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Catalog</span>
                </span>
              </NavLink>
            </li>
            {isAuthenticated && (
              <li>
                <NavLink to="/profile" className={navLinkClass}>
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" />
                    <span>My Profile</span>
                  </span>
                </NavLink>
              </li>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <li>
                <NavLink to="/admin/orders" className={navLinkClass}>
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <ClipboardList className="h-4 w-4" />
                    <span>Customer Orders</span>
                  </span>
                </NavLink>
              </li>
            )}
          </ul>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Shopping Cart Button */}
          {user?.role !== 'admin' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCartOpen(true)}
              aria-label="Open Shopping Bag"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </Button>
          )}

          {/* Theme Mode Toggle Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Authentication Actions */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="User account menu"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground font-semibold">{user?.username}</span>
                  {user?.role === 'admin' && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-indigo-600 text-white">
                      Admin
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="font-semibold text-foreground">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" /> User Profile (Protected)
                </DropdownMenuItem>
                {user?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/admin/orders')}>
                    <ClipboardList className="h-4 w-4 mr-2 text-indigo-600" /> Customer Orders
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} destructive>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Register
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Actions: Cart, Theme, Hamburger */}
        <div className="flex md:hidden items-center gap-1.5">
          {user?.role !== 'admin' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCartOpen(true)}
              aria-label="Open Shopping Bag"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/"
                className={navLinkClass}
                end
                onClick={() => setMobileMenuOpen(false)}
              >
                Catalog
              </NavLink>
            </li>
            {isAuthenticated && (
              <li>
                <NavLink
                  to="/profile"
                  className={navLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Profile
                </NavLink>
              </li>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <li>
                <NavLink
                  to="/admin/orders"
                  className={navLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Customer Orders
                </NavLink>
              </li>
            )}
          </ul>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground">
                  Signed in: <strong className="text-foreground">{user?.username}</strong>
                  {user?.role === 'admin' && (
                    <Badge variant="default" className="ml-1.5 text-[10px] bg-indigo-600">
                      Admin
                    </Badge>
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
