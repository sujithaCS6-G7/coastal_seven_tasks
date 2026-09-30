import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand */}
        <Link to="/" className="nav-brand">
          <span>🛒</span>
          <span>Day 11 Store</span>
        </Link>

        {/* Navigation Links */}
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              Products
            </NavLink>
          </li>

          <li>
            <NavLink to="/cart" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span>Cart</span>
            </NavLink>
          </li>

          {/* Conditional Rendering for Authenticated Users */}
          {isAuthenticated ? (
            <>
              <li>
                <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  My Orders
                </NavLink>
              </li>

              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Hi, <strong>{user?.username}</strong>
                  {user?.role === 'admin' && (
                    <span style={{ marginLeft: '4px', fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: '4px' }}>
                      Admin
                    </span>
                  )}
                </span>

                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  Login
                </NavLink>
              </li>
              <li>
                <Link to="/register" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
