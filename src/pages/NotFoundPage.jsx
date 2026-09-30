import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="form-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
      <p style={{ fontSize: '4rem', marginBottom: '12px' }}>404</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Store Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
