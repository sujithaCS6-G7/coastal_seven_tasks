import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Home, AlertCircle } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">404</h1>
      <h2 className="mt-2 text-lg font-semibold text-foreground">Page Not Found</h2>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-6 text-xs">
        <Link to="/">
          <Home className="h-4 w-4 mr-1.5" /> Back to Catalog
        </Link>
      </Button>
    </div>
  );
};

export default NotFoundPage;
