import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/axiosClient';

/**
 * RegisterPage demonstrating Controlled Inputs, useRef, and FastAPI registration integration.
 */
const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const usernameRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register(username.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <h1 className="form-title">Create Account</h1>
      <p className="form-subtitle">Join Day 11 E-Commerce Store</p>

      {error && <div className="form-error">{error}</div>}
      {success && (
        <div className="form-success">
          ✓ Account created successfully! Redirecting to login...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="reg-username" className="form-label">
            Username:
          </label>
          <input
            id="reg-username"
            ref={usernameRef}
            type="text"
            className="form-input"
            placeholder="e.g. shopper123"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-email" className="form-label">
            Email Address:
          </label>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            placeholder="e.g. shopper@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-password" className="form-label">
            Password:
          </label>
          <input
            id="reg-password"
            type="password"
            className="form-input"
            placeholder="Minimum 4 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: '10px' }}
          disabled={loading || success}
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Log in
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
